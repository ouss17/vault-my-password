import QuestionSettings from "@/components/QuestionSettings";
import {
    clearSensitiveData,
    setFingerprintAuthEnabled,
    setLockTimeoutMinutes,
    setQuestionAuthEnabled,
} from "@/redux/slices/settingsSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import { useT } from "@/utils/useText";
import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

const colors = {
  card: "#0b3a50",
  textPrimary: "#e6f7ff",
  textSecondary: "#9ec5ea",
  accent: "#1e90ff",
  border: "rgba(255,255,255,0.04)",
  inputBg: "#083045",
};

export default function SecuritySettings() {
  const dispatch = useDispatch<AppDispatch>();
  const s = useSelector((st: RootState) => st.settings);
  const t = useT();

  const [lockTimeoutText, setLockTimeoutText] = useState<string>(String(s.lockTimeoutMinutes ?? 5));
  useEffect(() => {
    setLockTimeoutText(String(s.lockTimeoutMinutes ?? 5));
  }, [s.lockTimeoutMinutes]);

  const toggleQuestionAuth = (v: boolean) => {
    if (!v) {
        
      if (!s.questionHint && !s.questionAnswer) {
        dispatch(setQuestionAuthEnabled(false));
        return;
      }
      
      Alert.alert(
        t("settings.security.questionDisableTitle"),
        t("question.disable.confirm"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: () => {
              dispatch(setQuestionAuthEnabled(false));
              dispatch(clearSensitiveData());
            },
          },
        ]
      );
      return;
    }

    
    dispatch(setQuestionAuthEnabled(true));
  };

  const onToggleFingerprint = (v: boolean) => {
    dispatch(setFingerprintAuthEnabled(v));
  };

  const onChangeLockTimeout = (txt: string) => {
    setLockTimeoutText(txt.replace(/[^0-9]/g, ""));
  };

  const onLockTimeoutEndEditing = () => {
    const n = Number(lockTimeoutText);
    if (Number.isNaN(n) || n <= 0) {
      setLockTimeoutText(String(s.lockTimeoutMinutes ?? 5));
      return;
    }
    dispatch(setLockTimeoutMinutes(Math.max(1, Math.floor(n))));
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>{t("settings.security.title")}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t("settings.security.question")}</Text>
        <Text style={styles.desc}>{t("settings.security.questionDesc")}</Text>
        <View style={{ marginTop: 8, marginBottom: 12 }}>
          <TouchableOpacity
            style={[styles.smallBtn, s.questionAuthEnabled ? { backgroundColor: colors.accent } : null]}
            onPress={() => toggleQuestionAuth(!s.questionAuthEnabled)}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {s.questionAuthEnabled ? t("common.enabled") : t("common.disabled")}
            </Text>
          </TouchableOpacity>
        </View>

        {s.questionAuthEnabled && <QuestionSettings />}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.label}>{t("settings.security.fingerprint")}</Text>
            <Text style={styles.desc}>{t("settings.security.fingerprintDesc")}</Text>
          </View>
          <Switch
            value={s.fingerprintAuthEnabled}
            onValueChange={onToggleFingerprint}
            thumbColor={Platform.OS === "android" ? (s.fingerprintAuthEnabled ? colors.accent : undefined) : undefined}
            trackColor={{ true: "rgba(30,144,255,0.3)", false: "rgba(255,255,255,0.04)" }}
          />
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>{t("settings.security.lockTimeout")}</Text>
        <TextInput
          keyboardType="number-pad"
          value={lockTimeoutText}
          onChangeText={onChangeLockTimeout}
          onEndEditing={onLockTimeoutEndEditing}
          onBlur={onLockTimeoutEndEditing}
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 8 },
  card: { backgroundColor: colors.card, padding: 12, borderRadius: 10, marginBottom: 12 },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  desc: { color: colors.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 8 },
  smallBtn: { marginTop: 6, backgroundColor: "rgba(255,255,255,0.04)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: "center" },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    backgroundColor: colors.inputBg,
  },
});