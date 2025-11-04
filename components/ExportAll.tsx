import type { RootState } from "@/redux/store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";

export default function ExportAll() {
  const categories = useSelector((st: RootState) => st.categories.items);
  const passwords = useSelector((st: RootState) => st.passwords.items);
  const settings = useSelector((st: RootState) => st.settings);

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
        Alert.alert("Erreur", "Impossible d'accéder au répertoire de fichiers sur cet appareil.");
        return;
      }
      const fileUri = dir + `vault_export_all_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: "utf8" } as any);
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Exporter toutes les données",
      });
    } catch (e: any) {
      Alert.alert("Erreur", "L'export a échoué : " + (e?.message ?? String(e)));
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handleExportAll}>
      <Text style={styles.btnText}>Exporter tout</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: "#1e90ff", paddingVertical: 12, minHeight: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});