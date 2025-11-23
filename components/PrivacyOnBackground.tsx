import * as ScreenCapture from "expo-screen-capture";
import { useEffect } from "react";
import { AppState } from "react-native";

export default function PrivacyOnBackground() {
  useEffect(() => {
    let mounted = true;

    const ensurePrevent = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        console.warn("PrivacyOnBackground: prevent failed", e);
      }
    };

    ensurePrevent();

    const sub = AppState.addEventListener("change", async () => {
      if (!mounted) return;
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        console.warn("PrivacyOnBackground error", e);
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return null;
}