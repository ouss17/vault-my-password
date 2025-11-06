import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LanguageSelectionModal({
  visible,
  onSelect,
}: {
  visible: boolean;
  onSelect: (lang: "fr" | "en" | "es") => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Choose your language / Choisissez la langue / Elija el idioma</Text>
          <Text style={styles.desc}>
            Select the language you prefer. / Sélectionnez la langue que vous préférez. / Seleccione el idioma que prefiera.
          </Text>

          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => onSelect("fr")}>
              <Text style={styles.btnText}>Français</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={() => onSelect("en")}>
              <Text style={styles.btnText}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={() => onSelect("es")}>
              <Text style={styles.btnText}>Español</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#0b3a50", borderRadius: 10, padding: 18 },
  title: { color: "#e6f7ff", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  desc: { color: "#9ec5ea", fontSize: 13, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  btn: { flex: 1, marginHorizontal: 6, backgroundColor: "#1e90ff", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});