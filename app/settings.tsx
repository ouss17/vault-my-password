import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import ExportAll from "@/components/ExportAll";
import ExportByCategory from "@/components/ExportByCategory";
import ImportData from "@/components/ImportData";
import SecuritySettings from "@/components/SecuritySettings";
import { useT } from "@/utils/useText";

import { Language, setLanguage } from "@/redux/slices/settingsSlice";
import type { AppDispatch, RootState } from "@/redux/store";

const colors = {
  background: "#072033",
  card: "#0b3a50",
  textPrimary: "#e6f7ff",
  textSecondary: "#9ec5ea",
  accent: "#1e90ff",
  border: "rgba(255,255,255,0.04)",
};

const Settings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const s = useSelector((st: RootState) => st.settings);
  const router = useRouter();
  const t = useT();

  // shared selected categories for export (controlled mode)
  const [exportSelectedIds, setExportSelectedIds] = useState<string[]>([]);

  const onSetLanguage = (lang: Language) => {
    dispatch(setLanguage(lang));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ ...styles.content, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t("settings.pageTitle")}</Text>
          </View>

          {/* Security section (delegated) */}
          <SecuritySettings />

          {/* Language */}
          <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
          <View style={styles.card}>
            <View style={styles.langRow}>
              <TouchableOpacity style={[styles.langBtn, s.language === "fr" && styles.langBtnActive]} onPress={() => onSetLanguage("fr")}>
                <Text style={styles.langText}>Français</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.langBtn, s.language === "en" && styles.langBtnActive]} onPress={() => onSetLanguage("en")}>
                <Text style={styles.langText}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.langBtn, s.language === "es" && styles.langBtnActive]} onPress={() => onSetLanguage("es")}>
                <Text style={styles.langText}>Español</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Export / Import */}
          <Text style={styles.sectionTitle}>{t("settings.importExport.title")}</Text>
          <View style={styles.card}>
            <Text style={styles.label}>{t("settings.importExport.title")}</Text>
            <Text style={styles.desc}>{t("settings.importExport.title")}</Text>

            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <ExportAll />
              </View>
              <View style={{ width: 8 }} />
              <View style={{ flex: 1 }}>
                {/* export selected button (uses shared selected state below) */}
                <ExportByCategory selected={exportSelectedIds} setSelected={setExportSelectedIds} showSelectors={false} showButton={true} />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>{t("settings.importExport.selectCategory")}</Text>
            {/* selectors (share the same selected state) */}
            <ExportByCategory selected={exportSelectedIds} setSelected={setExportSelectedIds} showSelectors={true} showButton={false} />

            {/* importer placé sous les catégories */}
            <View style={{ marginTop: 12 }}>
              <ImportData />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 8 },
  backBtn: { padding: 8, marginRight: 8 },
  pageTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  rowLeft: { flex: 1, paddingRight: 12 },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  desc: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: colors.card, padding: 12, borderRadius: 10, marginBottom: 12 },
  choice: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, backgroundColor: "transparent" },
  choiceActive: { backgroundColor: "rgba(30,144,255,0.12)" },
  choiceText: { color: colors.textPrimary },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    backgroundColor: "#083045",
  },
  btn: { marginTop: 10, backgroundColor: colors.accent, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  langRow: { flexDirection: "row", justifyContent: "space-between" },
  langBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, marginRight: 8, backgroundColor: "transparent", alignItems: "center" },
  langBtnActive: { backgroundColor: "rgba(30,144,255,0.12)" },
  langText: { color: colors.textPrimary, fontWeight: "600" },
});

export default Settings;

