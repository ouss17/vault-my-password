import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function PasswordGenerator() {
  const t = useT();
  const [lengthText, setLengthText] = useState<string>("12");
  const [digitsOnly, setDigitsOnly] = useState<boolean>(false);
  const [generated, setGenerated] = useState<string>("");

  const charsetFull = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[];:,.<>?";
  const charsetDigits = "0123456789";

  const generate = () => {
    const n = Math.max(4, Math.min(128, Number(lengthText) || 12));
    const set = digitsOnly ? charsetDigits : charsetFull;
    let out = "";
    for (let i = 0; i < n; i++) {
      const r = Math.floor(Math.random() * set.length);
      out += set.charAt(r);
    }
    setGenerated(out);
  };

  const copyToClipboard = async () => {
    try {
      if (!generated) {
        Alert.alert(t("alert.error.title"), t("passwordGenerator.copy.noPassword"));
        return;
      }
      await Clipboard.setStringAsync(generated);
      Alert.alert(t("passwordGenerator.copy.title"), t("passwordGenerator.copy.message"));
    } catch (err) {
      console.error("Copy error:", err);
      Alert.alert(t("alert.error.title"), t("passwordGenerator.copy.error"));
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("passwordGenerator.title")}</Text>
      <Text style={styles.desc}>{t("passwordGenerator.desc")}</Text>

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
        <TextInput
          keyboardType="number-pad"
          value={lengthText}
          onChangeText={(v) => setLengthText(v.replace(/[^0-9]/g, ""))}
          placeholder={t("passwordGenerator.length.placeholder")}
          placeholderTextColor="#9ec5ea"
          style={[styles.input, { flex: 1, marginRight: 8 }]}
        />
        <TouchableOpacity
          style={[styles.smallBtn, digitsOnly ? { backgroundColor: "#1e90ff" } : null]}
          onPress={() => setDigitsOnly((s) => !s)}
        >
          <Text style={styles.smallBtnText}>{digitsOnly ? t("passwordGenerator.type.digits") : t("passwordGenerator.type.full")}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", marginTop: 10 }}>
        <TouchableOpacity style={styles.btn} onPress={generate}>
          <Ionicons name="refresh-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>{t("passwordGenerator.button.generate")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, { marginLeft: 8, backgroundColor: "#2b8a4b" }]} onPress={copyToClipboard}>
          <Ionicons name="copy-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>{t("passwordGenerator.button.copy")}</Text>
        </TouchableOpacity>
      </View>

      {generated ? (
        <View style={styles.generatedRow}>
          <Text style={styles.generated} numberOfLines={1} ellipsizeMode="middle">
            {generated}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#0b3a50", padding: 12, borderRadius: 10, marginBottom: 12 },
  title: { color: "#e6f7ff", fontWeight: "700", fontSize: 14 },
  desc: { color: "#9ec5ea", fontSize: 12, marginTop: 4 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#e6f7ff",
    backgroundColor: "#083045",
  },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center", justifyContent: "center" },
  smallBtnText: { color: "#e6f7ff", fontWeight: "700" },
  btn: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#1e90ff" },
  btnText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  generatedRow: { marginTop: 12, backgroundColor: "#083045", padding: 10, borderRadius: 8 },
  generated: { color: "#e6f7ff", fontWeight: "600" },
});