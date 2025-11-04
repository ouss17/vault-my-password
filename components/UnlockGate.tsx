import type { RootState } from "@/redux/store";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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

  const clearInactivity = useCallback(() => {
    if (inactivityRef.current) {
      clearTimeout(inactivityRef.current);
      inactivityRef.current = null;
    }
  }, []);

  const startInactivity = useCallback(() => {
    clearInactivity();
    inactivityRef.current = setTimeout(() => {
      if (mountedRef.current) setLocked(true);
    }, lockTimeout) as unknown as number;
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

  // helper: convert hex -> bytes
  const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

  // helper: timing-safe compare of two byte arrays
  const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  };

  const verifyAnswer = useCallback(
    async (plain: string) => {
      // stored hash (hex) from settings
      const stored = (settingsRef.current as any).questionAnswer ?? null;
      if (!stored) return false;

      // normalize input same way as when saving (trim; optionally toLowerCase())
      const normalized = plain.trim(); // or plain.trim().toLowerCase() if you saved lowercased

      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
      try {
        const a = hexToBytes(hashed);
        const b = hexToBytes(stored);
        return timingSafeEqual(a, b);
      } catch {
        // fallback to simple equality if parsing fails
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
        startInactivity();
        return true;
      }
      // if biometric fails and question enabled, show question
    }
    if (currentSettings.questionAuthEnabled) {
      setShowQuestion(true);
      return false;
    }
    setLocked(false);
    startInactivity();
    return true;
  }, [tryBiometric, startInactivity]);

  // run unlock flow only once on mount (avoid triggering on every settings change)
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      if (settingsRef.current.fingerprintAuthEnabled || settingsRef.current.questionAuthEnabled) {
        await tryUnlock();
      } else {
        setLocked(false);
        startInactivity();
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
      startInactivity();
    } else {
      // protections enabled: don't auto-prompt the user — wait for inactivity or manual unlock
      // but close question modal if fingerprint was enabled and question disabled
      if (!settings.questionAuthEnabled) setShowQuestion(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.fingerprintAuthEnabled, settings.questionAuthEnabled]);

  const onUserActivity = () => {
    if (!locked) startInactivity();
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
      startInactivity();
    } else {
      Alert.alert("Erreur", "Réponse incorrecte");
    }
  };

  const forceShowQuestion = () => {
    setShowQuestion(true);
  };

  return (
    <Pressable style={styles.blocker} onPressIn={onUserActivity}>
      {children}

      <Modal visible={locked && !showQuestion} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Application verrouillée</Text>
            <Text style={styles.hint}>Appuyez pour tenter de déverrouiller.</Text>

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable style={styles.smallBtn} onPress={forceShowQuestion}>
                <Text style={styles.smallBtnText}>Réponse</Text>
              </Pressable>
              <Pressable
                style={styles.btn}
                onPress={async () => {
                  const ok = await tryUnlock();
                  if (!ok) {
                    /* tryUnlock will show question if needed */
                  }
                }}
              >
                <Text style={styles.btnText}>Déverrouiller</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showQuestion} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Question de sécurité</Text>
            <Text style={styles.hint}>
              {(settings.selectedQuestionId &&
                (() => {
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