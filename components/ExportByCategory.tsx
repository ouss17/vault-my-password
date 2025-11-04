import type { Category } from "@/redux/slices/categoriesSlice";
import type { PasswordItem } from "@/redux/slices/pwdSlice";
import type { RootState } from "@/redux/store";
import { useT } from "@/utils/useText";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";


export default function ExportByCategory({
  selected: externalSelected,
  setSelected: externalSetSelected,
  showSelectors = true,
  showButton = true,
}: {
  selected?: string[];
  
  setSelected?: React.Dispatch<React.SetStateAction<string[]>>;
  showSelectors?: boolean;
  showButton?: boolean;
}) {
  const categories = useSelector((st: RootState) => st.categories.items) as Category[];
  const passwords = useSelector((st: RootState) => st.passwords.items) as PasswordItem[];
  const settings = useSelector((st: RootState) => st.settings);
  const t = useT();

  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const selected = externalSelected ?? localSelected;
  const setSelected: React.Dispatch<React.SetStateAction<string[]>> = externalSetSelected ?? setLocalSelected;

  const toggle = (key: string | null) => {
    const k = key ?? "__uncategorized";
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const handleExportSelected = async () => {
    if (selected.length === 0) {
      Alert.alert(t("alerts.export.selectedNoneTitle"), t("alerts.export.selectedNoneMessage"));
      return;
    }
    try {
      const selectedCats = selected.map((k) =>
        k === "__uncategorized" ? { id: null, name: t("category.uncategorized") } : categories.find((c) => c.id === k)
      );
      const items = passwords.filter((p) => selected.includes((p.categoryId ?? "__uncategorized") as string));
      const payload = { exportedAt: new Date().toISOString(), categories: selectedCats, passwords: items, settings };
      const json = JSON.stringify(payload, null, 2);
      const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? "";
      const fileUri = dir + `vault_export_selected_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: "utf8" } as any);
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: t("exportByCategory.dialogTitle"),
      });
      
      if (!externalSelected) setSelected([]);
    } catch (e: any) {
      const msgTemplate = t("alerts.export.error");
      const msg = msgTemplate.replace("{error}", e?.message ?? String(e));
      Alert.alert(t("alert.error.title"), msg);
    }
  };

  return (
    <View>
      {showSelectors && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => toggle(null)}
            style={[styles.choice, selected.includes("__uncategorized") && styles.choiceActive]}
          >
            <Text style={styles.choiceText}>{t("category.uncategorized")}</Text>
          </TouchableOpacity>
          {categories.map((c) => {
            const key = c.id ?? "__uncategorized";
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => toggle(key)}
                style={[styles.choice, selected.includes(key) && styles.choiceActive]}
              >
                <Text style={styles.choiceText}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {showButton && (
        <TouchableOpacity style={styles.btn} onPress={handleExportSelected}>
          <Text style={styles.btnText}>{t("exportByCategory.button")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  choice: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, marginRight: 8, backgroundColor: "transparent" },
  choiceActive: { backgroundColor: "rgba(30,144,255,0.12)" },
  choiceText: { color: "#e6f7ff" },
  
  btn: { backgroundColor: "#1e90ff", paddingVertical: 12, minHeight: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});