import type { RootState } from "@/redux/store";
import { isLockSuspended } from "@/utils/lockSuspend";
import { useT } from "@/utils/useText";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, AppStateStatus, Modal, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
  smallBtnText: { color: "#9ec5ea", paddingVertical: 10, paddingHorizontal: 14 },
});

export default function UnlockGate({ children }: { children: React.ReactNode }) {
  const settings = useSelector((s: RootState) => s.settings);
  const t = useT();

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

  // guard: true while waiting for LocalAuthentication.authenticateAsync to resolve
  const isAuthenticatingRef = useRef<boolean>(false);
  // re-rendering state to show blocking UI while authenticating
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

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
    // `t` is used in this callback
    const MIN_ACCEPT_MS = 600; // require the auth flow to take at least this long (avoid spurious fast resolves)
    const start = Date.now();
    try {
      // mark authentication in progress so UI/touches won't interfere
      isAuthenticatingRef.current = true;
      setIsAuthenticating(true);
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) return false;

      // require biometric only (no device PIN fallback) to avoid accidental acceptance via system credential dialogs
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t("unlock.biometricPrompt"),
        fallbackLabel: t("unlock.button.answer"),
        // important: prefer biometric-only; some platforms ignore this but it's safer
        disableDeviceFallback: true,
      });

      const elapsed = Date.now() - start;
      // if authentication reported success but returned extremely fast, consider it suspicious
      if (res.success === true) {
        if (elapsed < MIN_ACCEPT_MS) {
          console.warn("Biometric accepted too quickly — rejecting as suspicious (elapsedms=", elapsed, ")");
          return false;
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("tryBiometric error:", e);
      return false;
    } finally {
      // always clear authenticating flag when done
      isAuthenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, [t]);

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
  // NOTE: be strict — do NOT unlock on biometric failure when fingerprint is enabled and no question is configured.
  const tryUnlock = useCallback(async () => {
    const currentSettings = settingsRef.current;

    // No protections enabled -> unlock immediately
    if (!currentSettings.fingerprintAuthEnabled && !currentSettings.questionAuthEnabled) {
      setLocked(false);
      lastActivityRef.current = Date.now();
      scheduleLock();
      return true;
    }

    // If fingerprint is enabled, attempt biometric. Only unlock on success.
    if (currentSettings.fingerprintAuthEnabled) {
      const ok = await tryBiometric();
      if (ok) {
        setLocked(false);
        lastActivityRef.current = Date.now();
        scheduleLock();
        return true;
      }
      // biometric failed -> if question is enabled, show it; otherwise remain locked
      if (currentSettings.questionAuthEnabled) {
        setShowQuestion(true);
        return false;
      }
      return false;
    }

    // If fingerprint not enabled but question is, show question
    if (currentSettings.questionAuthEnabled) {
      setShowQuestion(true);
      return false;
    }

    // Fallback: remain locked
    return false;
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
    // If a biometric/auth flow is in progress, ignore UI activity to avoid race conditions
    if (isAuthenticatingRef.current) return;

    // mark latest activity and (re)schedule lock only when unlocked
    lastActivityRef.current = Date.now();
    if (!locked) scheduleLock();
  };

  const handleSubmitAnswer = async () => {
    // allow empty answer (user may have saved an empty answer)
    const ok = await verifyAnswer(answer.trim());
    if (ok) {
      setAnswer("");
      setShowQuestion(false);
      setLocked(false);
      lastActivityRef.current = Date.now();
      scheduleLock();
    } else {
      Alert.alert(t("alert.error.title"), t("unlock.error.incorrectAnswer"));
    }
  };

  const forceShowQuestion = () => {
    setShowQuestion(true);
  };

  // PanResponder: allow swipe up or horizontal swipe to unlock when locked AND no protections enabled
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        // only capture when locked and there are no protections enabled
        if (!locked) return false;
        const currentSettings = settingsRef.current;
        if (currentSettings.fingerprintAuthEnabled || currentSettings.questionAuthEnabled) return false;
        // require a meaningful move
        return Math.abs(gs.dy) > 20 || Math.abs(gs.dx) > 20;
      },
      onPanResponderRelease: (_, gs) => {
        if (!locked) return;
        const currentSettings = settingsRef.current;
        if (currentSettings.fingerprintAuthEnabled || currentSettings.questionAuthEnabled) return;
        // swipe up (dy negative) or a horizontal swipe (abs dx) unlocks
        if (gs.dy < -30 || Math.abs(gs.dx) > 40) {
          setLocked(false);
          lastActivityRef.current = Date.now();
          scheduleLock();
        }
      },
    })
  ).current;

  // AppState handling: when app goes to background lock immediately; when back to active, mark activity.
  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        // if authentication is in progress, cancel any further handling (we'll lock once auth finishes)
        if (isAuthenticatingRef.current) {
          // nothing else; avoid race between backgrounding and auth resolution
        } else {
          // lock immediately when leaving app unless locking is suspended (picker/import flow)
          if (!isLockSuspended() && (settingsRef.current.fingerprintAuthEnabled || settingsRef.current.questionAuthEnabled)) {
            setLocked(true);
          }
          clearInactivity();
        }
      } else if (next === "active") {
        // ignore app active events while authenticating
        if (!isAuthenticatingRef.current) {
          lastActivityRef.current = Date.now();
          if (!locked) scheduleLock();
        }
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
    // block outer interactions with a Pressable; attach pan handlers to detect swipe unlock when appropriate
    <Pressable {...panResponder.panHandlers} style={styles.blocker} onPressIn={onUserActivity}>
      {children}

      {/* Blocking modal shown while waiting for biometric prompt to resolve.
          This captures touches and disables UI so user cannot interact with app while auth dialog is shown. */}
      <Modal visible={isAuthenticating} transparent animationType="none" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { alignItems: "center", paddingVertical: 20 }]}>
            <ActivityIndicator size="large" color="#1e90ff" style={{ marginBottom: 12 }} />
            <Text style={styles.title}>{t("unlock.authenticating")}</Text>
            <Text style={styles.hint}>{t("unlock.authenticatingHint")}</Text>
          </View>
        </View>
      </Modal>

      {/* lock overlay modal */}
      <Modal visible={locked && !showQuestion} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>{t("unlock.lockedTitle")}</Text>
            <Text style={styles.hint}>{t("unlock.lockedHint")}</Text>

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              {/* Render a single primary action:
                  - If fingerprint enabled => primary "Déverrouiller" triggers biometric (tryUnlock).
                  - Else if only question enabled => primary "Réponse" opens the question modal.
                  Avoid rendering the small duplicate "Réponse" button. */}
              {settings.fingerprintAuthEnabled ? (
                <Pressable
                  style={[styles.btn, isAuthenticating ? { opacity: 0.6 } : null]}
                  onPress={async () => {
                    if (isAuthenticatingRef.current) return;
                    const ok = await tryUnlock();
                    if (!ok) {
                      /* tryUnlock affichera la question si nécessaire */
                    }
                  }}
                  disabled={isAuthenticating}
                >
                  <Text style={styles.btnText}>{t("unlock.button.unlock")}</Text>
                </Pressable>
              ) : settings.questionAuthEnabled ? (
                <Pressable
                  style={[styles.btn, isAuthenticating ? { opacity: 0.6 } : null]}
                  onPress={() => {
                    if (isAuthenticatingRef.current) return;
                    setShowQuestion(true);
                  }}
                  disabled={isAuthenticating}
                >
                  <Text style={styles.btnText}>{t("unlock.button.answer")}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* question modal */}
      <Modal visible={showQuestion} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>{t("unlock.question.title")}</Text>
            <Text style={styles.hint}>
              {(settings.selectedQuestionId &&
                (() => {
                  // try to read question text from datasource if available in runtime
                  // fallback: show hint stored
                  return (settings as any).questionHint ?? t("unlock.question.hintFallback");
                })()) ?? t("unlock.question.hintFallback")}
            </Text>

            <TextInput
              value={answer}
              onChangeText={setAnswer}
              placeholder={t("unlock.answer.placeholder")}
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
                <Text style={styles.smallBtnText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={handleSubmitAnswer}>
                <Text style={styles.btnText}>{t("actions.validate")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Pressable>
  );
}