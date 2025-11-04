import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const colors = {
  card: "#0b3a50",
  textPrimary: "#e6f7ff",
};

const Header = ({ onOpenSettings }: { onOpenSettings: () => void }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vault My Password</Text>
      <TouchableOpacity onPress={onOpenSettings} style={styles.icon}>
        <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "600", color: colors.textPrimary },
  icon: { position: "absolute", right: 16, padding: 8 },
});

export default Header;