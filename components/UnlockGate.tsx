import type { RootState } from "@/redux/store";
import { isLockSuspended } from "@/utils/lockSuspend";
import { useT } from "@/utils/useText";
import { BlurView } from "expo-blur";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, AppStateStatus, Image, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useSelector } from "react-redux";

const styles = StyleSheet.create({
  blocker: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "transparent", justifyContent: "center", padding: 20 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,8,14,0.65)" },
  modalBackdropFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,8,14,0.85)" },
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

  const lockTimeout = Math.max(1, settings.lockTimeoutMinutes ?? 5) * 60 * 1000; 
  const [locked, setLocked] = useState<boolean>(settings.questionAuthEnabled || settings.fingerprintAuthEnabled);
  const [showQuestion, setShowQuestion] = useState(false);
  const [answer, setAnswer] = useState("");
  const inactivityRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // track biometric / auth in progress
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const isAuthenticatingRef = useRef<boolean>(false);
  useEffect(() => {
    isAuthenticatingRef.current = isAuthenticating;
  }, [isAuthenticating]);

   const rootRef = useRef<View | null>(null); 
   const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
   const takingSnapshotRef = useRef(false);

  const takeSnapshot = useCallback(async () => {
    if (!rootRef.current || takingSnapshotRef.current) return;
    try {
      takingSnapshotRef.current = true;
      const base64 = await captureRef(rootRef.current, { format: "png", quality: 0.7, result: "base64" });
      setSnapshotUri(`data:image/png;base64,${base64}`);
    } catch (e) {
      console.warn("UnlockGate: snapshot failed", e);
      setSnapshotUri(null);
    } finally {
      takingSnapshotRef.current = false;
    }
  }, []);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  
  const lastActivityRef = useRef<number | null>(null);
 
   // Delay locking when app goes to background (15s). Cleared if app returns to foreground.
   const backgroundLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const appStateRef = useRef<AppStateStatus>(AppState.currentState);
   const scheduleLockRef = useRef<typeof scheduleLock | null>(null);
   const clearInactivityRef = useRef<typeof clearInactivity | null>(null);
   const backgroundAtRef = useRef<number | null>(null); // timestamp when app went background
   const BG_LOCK_DELAY_MS = 30000; // 30s

  const clearInactivity = useCallback(() => {
    if (inactivityRef.current) {
      clearTimeout(inactivityRef.current);
      inactivityRef.current = null;
    }
  }, []);
  // keep ref updated so the single AppState listener can call them
  useEffect(() => {
    clearInactivityRef.current = clearInactivity;
  }, [clearInactivity]);

  const scheduleLock = useCallback(() => {
    clearInactivity();
    
    if (!settingsRef.current.fingerprintAuthEnabled && !settingsRef.current.questionAuthEnabled) return;
    const last = lastActivityRef.current;
    if (last == null) {
      
      return;
    }
    const elapsed = Date.now() - last;
    const remaining = Math.max(0, lockTimeout - elapsed);
    inactivityRef.current = setTimeout(() => {
      
      if (mountedRef.current && !isLockSuspended()) setLocked(true);
    }, remaining) as unknown as number;
  }, [lockTimeout, clearInactivity]);
  useEffect(() => {
    scheduleLockRef.current = scheduleLock;
  }, [scheduleLock]);

  // Ensure inactivity-based lock is scheduled according to user setting.
  // Re-run when lock timeout or available auth methods change.
  useEffect(() => {
    // if app is currently unlocked and not authenticating, ensure we have a lastActivity and schedule lock
    if (!locked && !isAuthenticatingRef.current) {
      if (lastActivityRef.current == null) lastActivityRef.current = Date.now();
      // call the current scheduleLock directly
      scheduleLock();
    }
  }, [
    scheduleLock,
    locked,
    // react to user-configurable timeout or auth method changes
    (settingsRef.current?.lockTimeoutMinutes ?? 0),
    (settingsRef.current?.fingerprintAuthEnabled ?? false),
    (settingsRef.current?.questionAuthEnabled ?? false),
  ]);

  const tryBiometric = useCallback(async () => {
    
    const MIN_ACCEPT_MS = 600; 
    const start = Date.now();
    try {
      isAuthenticatingRef.current = true;
      setIsAuthenticating(true);
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) return false;

      
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t("unlock.biometricPrompt"),
        fallbackLabel: t("unlock.button.answer"),
        
        disableDeviceFallback: true,
      });

      const elapsed = Date.now() - start;
      
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

  
  const tryUnlock = useCallback(async () => {
    const currentSettings = settingsRef.current;

    
    if (!currentSettings.fingerprintAuthEnabled && !currentSettings.questionAuthEnabled) {
      setLocked(false);
      lastActivityRef.current = Date.now();
      scheduleLock();
      return true;
    }
    
    if (currentSettings.fingerprintAuthEnabled) {
      const ok = await tryBiometric();
      if (ok) {
        setLocked(false);
        lastActivityRef.current = Date.now();
        scheduleLock();
        return true;
      }
      
      if (currentSettings.questionAuthEnabled) {
        setShowQuestion(true);
        return false;
      }
      return false;
    }

    
    if (currentSettings.questionAuthEnabled) {
      setShowQuestion(true);
      return false;
    }

    
    return false;
  }, [tryBiometric, scheduleLock]);

  
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      if (settingsRef.current.fingerprintAuthEnabled || settingsRef.current.questionAuthEnabled) {
        await tryUnlock();
      } else {
        
        setLocked(false);
        lastActivityRef.current = Date.now();
        
        clearInactivity();
      }
    })();

    return () => {
      mountedRef.current = false;
      clearInactivity();
    };
    
  }, []); 
  useEffect(() => {
    if (locked) {
      const id = setTimeout(() => {
        takeSnapshot();
      }, 50);
      return () => clearTimeout(id);
    } else {
      setSnapshotUri(null);
    }
  }, [locked, takeSnapshot]);

  const onUserActivity = () => {
    
    if (isAuthenticatingRef.current) return;

    
    lastActivityRef.current = Date.now();
    if (!locked) scheduleLock();
  };

  const handleSubmitAnswer = async () => {
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        if (!lockedRef.current) return false;
        const currentSettings = settingsRef.current;
        if (currentSettings.fingerprintAuthEnabled || currentSettings.questionAuthEnabled) return false;
        return Math.abs(gs.dy) > 20 || Math.abs(gs.dx) > 20;
      },
      onPanResponderRelease: (_, gs) => {
        if (!lockedRef.current) return;
        const currentSettings = settingsRef.current;
        if (currentSettings.fingerprintAuthEnabled || currentSettings.questionAuthEnabled) return;
        if (gs.dy < -30 || Math.abs(gs.dx) > 40) {
          setLocked(false);
          lastActivityRef.current = Date.now();
          scheduleLock();
        }
      },
    })
  ).current;

  const lockedRef = useRef(locked);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  
  // single installation of AppState listener (stable). Use refs inside to avoid re-registering.
  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      console.debug("[UnlockGate] app state change ->", next);
      appStateRef.current = next;
      if (next === "background" || next === "inactive") {
        // don't lock immediately: schedule a delayed lock (15s)
        if (isAuthenticatingRef.current) {
          // if we're authenticating, keep current behaviour (don't schedule)
          return;
        }

        // clear any previous background timer
        if (backgroundLockRef.current) {
          clearTimeout(backgroundLockRef.current);
          backgroundLockRef.current = null;
        }

        console.debug("[UnlockGate] app -> background, recording timestamp and attempting background scheduling:", {
          suspended: isLockSuspended(),
          fingerprint: settingsRef.current.fingerprintAuthEnabled,
          question: settingsRef.current.questionAuthEnabled,
        });

        // record the time we entered background — will be used when app becomes active again
        backgroundAtRef.current = Date.now();
        // optional: try to schedule a background timer (may not fire reliably on Android)
        if (!isLockSuspended()) {
          backgroundLockRef.current = setTimeout(() => {
            console.debug("[UnlockGate] background timer fired (best-effort) — appStateRef:", appStateRef.current);
            if (mountedRef.current && appStateRef.current !== "active") {
              setLocked(true);
            }
            backgroundLockRef.current = null;
          }, BG_LOCK_DELAY_MS);
        }
        clearInactivityRef.current?.();
      } else if (next === "active") {
        // app returned to foreground -> cancel pending background lock
        if (backgroundLockRef.current) {
          clearTimeout(backgroundLockRef.current);
          backgroundLockRef.current = null;
          console.debug("[UnlockGate] canceled pending background lock because app active again");
        }

        // If we had gone to background, check elapsed time and lock if needed.
        if (backgroundAtRef.current) {
          const elapsed = Date.now() - backgroundAtRef.current;
          console.debug("[UnlockGate] returned to active — elapsed since background:", elapsed);
          if (!isLockSuspended() && elapsed >= BG_LOCK_DELAY_MS) {
            console.debug("[UnlockGate] elapsed >= delay -> locking now");
            setLocked(true);
            // ensure snapshot + UI update happen
            lastActivityRef.current = null;
            backgroundAtRef.current = null;
            return; // early return: user must unlock
          }
          // else: reopened quickly, cancel background stamp
          backgroundAtRef.current = null;
        }

         if (!isAuthenticatingRef.current) {
           lastActivityRef.current = Date.now();
           // use ref to call scheduleLock safely
           scheduleLockRef.current?.();
         }
       }
     };
 
     const subscription = AppState.addEventListener("change", onAppStateChange);
     return () => {
       // cleanup any pending background lock on unmount
       if (backgroundLockRef.current) {
         clearTimeout(backgroundLockRef.current);
         backgroundLockRef.current = null;
       }
      backgroundAtRef.current = null;
       subscription.remove();
     };
   }, []);
 
  return (
    <View style={styles.blocker}>
      {/* capture les débuts d'interaction (taps/gestures) sans bloquer les enfants,
          afin de considérer cela comme activité et repousser le verrouillage */}
      <View
        ref={rootRef}
        collapsable={false}
        style={{ flex: 1 }}
        onStartShouldSetResponderCapture={() => {
          // appelé pour chaque début d'interaction : on marque activité et on ne prend pas le responder
          try {
            onUserActivity();
          } catch {}
          return false;
        }}
      >
        {children}
      </View>

      <Modal visible={isAuthenticating} transparent animationType="none" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          {snapshotUri ? (
            <Image source={{ uri: snapshotUri }} style={StyleSheet.absoluteFill} blurRadius={Platform.OS === "android" ? 16 : 8} />
          ) : Platform.OS === "ios" ? (
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.modalBackdropFallback} />
          )}
          <View style={styles.modalOverlay} />
          <View style={[styles.modalCard, { alignItems: "center", paddingVertical: 20 }]}>
             <ActivityIndicator size="large" color="#1e90ff" style={{ marginBottom: 12 }} />
             <Text style={styles.title}>{t("unlock.authenticating")}</Text>
             <Text style={styles.hint}>{t("unlock.authenticatingHint")}</Text>
           </View>
         </View>
       </Modal>

       <Modal visible={locked && !showQuestion} animationType="fade" transparent>
        <View style={styles.modalBackdrop} {...panResponder.panHandlers}>
          {snapshotUri ? (
            <Image source={{ uri: snapshotUri }} style={StyleSheet.absoluteFill} blurRadius={Platform.OS === "android" ? 18 : 10} />
          ) : Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.modalBackdropFallback} />
          )}
          <View style={styles.modalOverlay} />
           <View style={styles.modalCard}>
             <Text style={styles.title}>{t("unlock.lockedTitle")}</Text>
             {!settings.fingerprintAuthEnabled && !settings.questionAuthEnabled ? (
               <Text style={styles.hint}>{t("unlock.swipeToUnlock")}</Text>
             ) : (
               <Text style={styles.hint}>{t("unlock.lockedHint")}</Text>
             )}

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              {/* fingerprint / question buttons */}
              {settings.fingerprintAuthEnabled ? (
                <Pressable
                  style={[styles.btn, isAuthenticating ? { opacity: 0.6 } : null]}
                  onPress={async () => {
                    if (isAuthenticatingRef.current) return;
                    const ok = await tryUnlock();
                    if (!ok) {
                      //
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

      <Modal visible={showQuestion} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          {snapshotUri ? (
            <Image source={{ uri: snapshotUri }} style={StyleSheet.absoluteFill} blurRadius={Platform.OS === "android" ? 18 : 10} />
          ) : Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.modalBackdropFallback} />
          )}
          <View style={styles.modalOverlay} />
           <View style={styles.modalCard}>
             <Text style={styles.title}>{t("unlock.question.title")}</Text>
             <Text style={styles.hint}>
               {(settings.selectedQuestionId &&
                 (() => {
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
    </View>
  );
}