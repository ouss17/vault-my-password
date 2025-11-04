import type { RootState } from "@/redux/store";
import { isLockSuspended } from "@/utils/lockSuspend";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSelector } from "react-redux";

const styles = StyleSheet.create({
  blocker: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(2,8,14,0.85)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#0b3a50", borderRadius: 10, padding: 16 },
  title: { color: "#e6f7ff", fontWeight: "700", fontSize: 16, marginBottom: 8 },
  hint: { color: "#9ec5ea", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#e6f7ff",
    backgroundColor: "#083045",
    marginBottom: 12,
  },
  btnRow: { flexDirection: "row", justifyContent: "flex-end" },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#1e90ff" },
  btnText: { color: "#fff", fontWeight: "700" },
  smallBtn: { backgroundColor: "transparent", marginRight: 8 },
  smallBtnText: { color: "#9ec5ea" },
});

export default function UnlockGate({ children }: { children: React.ReactNode }) {
  const settings = useSelector((s: RootState) => s.settings);

  const lockTimeout = Math.max(1, settings.lockTimeoutMinutes ?? 5) * 60 * 1000; // ms
  const [locked, setLocked] = useState<boolean>(settings.questionAuthEnabled || settings.fingerprintAuthEnabled);
  const [showQuestion, setShowQuestion] = useState(false);
  const [answer, setAnswer] = useState("");
  const inactivityRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // keep latest settings in a ref so callbacks don't re-trigger on every settings change
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // last user activity timestamp — lock only after inactivity window from this timestamp
  const lastActivityRef = useRef<number | null>(null);

  const clearInactivity = useCallback(() => {
    if (inactivityRef.current) {
      clearTimeout(inactivityRef.current);
      inactivityRef.current = null;
    }
  }, []);

  // schedule a lock to happen after (lockTimeout) ms since lastActivityRef
  const scheduleLock = useCallback(() => {
    clearInactivity();
    const last = lastActivityRef.current;
    if (last == null) {
      // no activity yet -> do not schedule locking based on absolute time
      return;
    }
    const elapsed = Date.now() - last;
    const remaining = Math.max(0, lockTimeout - elapsed);
    inactivityRef.current = setTimeout(() => {
      // respect suspend flag at lock-time
      if (mountedRef.current && !isLockSuspended()) setLocked(true);
    }, remaining) as unknown as number;
  }, [lockTimeout, clearInactivity]);

  const tryBiometric = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) return false;
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Se déverrouiller",
        fallbackLabel: "Utiliser la question",
        disableDeviceFallback: false,
      });
      return res.success === true;
    } catch (e) {
      return false;
    }
  }, []);

  const verifyAnswer = useCallback(
    async (plain: string) => {
      const stored = (settingsRef.current as any).questionAnswer ?? null;
      if (!stored) return false;
      const normalized = plain.trim();
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
      // timing-safe compare
      const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
      const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
        if (a.length !== b.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
        return diff === 0;
      };
      try {
        return timingSafeEqual(hexToBytes(hashed), hexToBytes(stored));
      } catch {
        return hashed === stored;
      }
    },
    []
  );

  // tryUnlock reads settingsRef.current to avoid re-running when settings object identity changes
  const tryUnlock = useCallback(async () => {
    const currentSettings = settingsRef.current;
    if (currentSettings.fingerprintAuthEnabled) {
      const ok = await tryBiometric();
      if (ok) {
        setLocked(false);
        // mark activity now and schedule lock after inactivity
        lastActivityRef.current = Date.now();
        scheduleLock();
        return true;
      }
      // if biometric fails and question enabled, show question
    }
    if (currentSettings.questionAuthEnabled) {
      setShowQuestion(true);
      return false;
    }
    setLocked(false);
    lastActivityRef.current = Date.now();
    scheduleLock();
    return true;
  }, [tryBiometric, scheduleLock]);

  // run unlock flow only once on mount (avoid triggering on every settings change)
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      if (settingsRef.current.fingerprintAuthEnabled || settingsRef.current.questionAuthEnabled) {
        await tryUnlock();
      } else {
        setLocked(false);
        // no protections -> still consider user active now and schedule lock if needed
        lastActivityRef.current = Date.now();
        scheduleLock();
      }
    })();

    return () => {
      mountedRef.current = false;
      clearInactivity();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only on mount

  // react to explicit disabling of protections: if user turns both off, unlock immediately.
  // Do NOT trigger biometric when enabling: user was likely changing settings UI.
  useEffect(() => {
    if (!settings.fingerprintAuthEnabled && !settings.questionAuthEnabled) {
      clearInactivity();
      setShowQuestion(false);
      setLocked(false);
      lastActivityRef.current = Date.now();
      scheduleLock();
    } else {
      // protections enabled: don't auto-prompt the user — wait for inactivity or manual unlock
      // but close question modal if fingerprint was enabled and question disabled
      if (!settings.questionAuthEnabled) setShowQuestion(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.fingerprintAuthEnabled, settings.questionAuthEnabled]);

  const onUserActivity = () => {
    // mark latest activity and (re)schedule lock only when unlocked
    lastActivityRef.current = Date.now();
    if (!locked) scheduleLock();
  };

  const handleSubmitAnswer = async () => {
    if (!answer) {
      Alert.alert("Erreur", "La réponse est vide");
      return;
    }
    const ok = await verifyAnswer(answer.trim());
    if (ok) {
      setAnswer("");
      setShowQuestion(false);
      setLocked(false);
      lastActivityRef.current = Date.now();
      scheduleLock();
    } else {
      Alert.alert("Erreur", "Réponse incorrecte");
    }
  };

  const forceShowQuestion = () => {
    setShowQuestion(true);
  };

  // AppState handling: when app goes to background lock immediately; when back to active, mark activity.
  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        // lock immediately when leaving app unless locking is suspended (picker/import flow)
        if (!isLockSuspended() && (settingsRef.current.fingerprintAuthEnabled || settingsRef.current.questionAuthEnabled)) {
          setLocked(true);
        }
        clearInactivity();
      } else if (next === "active") {
        lastActivityRef.current = Date.now();
        if (!locked) scheduleLock();
      }
    };

    // AppState.addEventListener returns a subscription with .remove() on modern RN versions.
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      // remove the subscription on unmount
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, scheduleLock, clearInactivity]);

  return (
    <Pressable style={styles.blocker} onPressIn={onUserActivity}>
      {children}

      {/* lock overlay modal */}
      <Modal visible={locked && !showQuestion} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Application verrouillée</Text>
            <Text style={styles.hint}>Appuyez pour tenter de déverrouiller.</Text>

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              {/* bouton 'Réponse' uniquement si la question est activée */}
              {settings.questionAuthEnabled && (
                <Pressable style={styles.smallBtn} onPress={forceShowQuestion}>
                  <Text style={styles.smallBtnText}>Réponse</Text>
                </Pressable>
              )}

              {/* si l'empreinte est activée, proposer 'Déverrouiller' qui lance la biométrie */}
              {settings.fingerprintAuthEnabled ? (
                <Pressable
                  style={styles.btn}
                  onPress={async () => {
                    const ok = await tryUnlock();
                    if (!ok) {
                      /* tryUnlock affichera la question si nécessaire */
                    }
                  }}
                >
                  <Text style={styles.btnText}>Déverrouiller</Text>
                </Pressable>
              ) : (
                /* si pas d'empreinte mais question activée, proposer le bouton principal vers la question */
                settings.questionAuthEnabled && (
                  <Pressable
                    style={styles.btn}
                    onPress={() => {
                      setShowQuestion(true);
                    }}
                  >
                    <Text style={styles.btnText}>Réponse</Text>
                  </Pressable>
                )
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* question modal */}
      <Modal visible={showQuestion} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Question de sécurité</Text>
            <Text style={styles.hint}>
              {(settings.selectedQuestionId &&
                (() => {
                  // try to read question text from datasource if available in runtime
                  // fallback: show hint stored
                  return (settings as any).questionHint ?? "Répondez à votre question secrète";
                })()) ?? "Répondez à votre question secrète"}
            </Text>

            <TextInput
              value={answer}
              onChangeText={setAnswer}
              placeholder="Réponse"
              placeholderTextColor="#9ec5ea"
              style={styles.input}
              secureTextEntry
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmitAnswer}
            />

            <View style={styles.btnRow}>
              <Pressable
                style={[styles.smallBtn]}
                onPress={() => {
                  setShowQuestion(false);
                }}
              >
                <Text style={styles.smallBtnText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={handleSubmitAnswer}>
                <Text style={styles.btnText}>Valider</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Pressable>
  );
}