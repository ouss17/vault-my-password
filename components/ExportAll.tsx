import type { RootState } from "@/redux/store";
import { useT } from "@/utils/useText";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";

export default function ExportAll() {
  const categories = useSelector((st: RootState) => st.categories.items);
  const passwords = useSelector((st: RootState) => st.passwords.items);
  const settings = useSelector((st: RootState) => st.settings);
  const t = useT();

  const handleExportAll = async () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        categories,
        passwords,
        settings,
      };
      const json = JSON.stringify(payload, null, 2);
      const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? "";
      if (!dir) {
        Alert.alert(t("alert.error.title"), t("alerts.fileAccess.error"));
        return;
      }
      const fileUri = dir + `vault_export_all_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: "utf8" } as any);
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: t("exportAll.dialogTitle"),
      });
    } catch (e: any) {
      const msgTemplate = t("alerts.export.error");
      const msg = msgTemplate.replace("{error}", e?.message ?? String(e));
      Alert.alert(t("alert.error.title"), msg);
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handleExportAll}>
      <Text style={styles.btnText}>{t("exportAll.button")}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: "#1e90ff", paddingVertical: 12, minHeight: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});