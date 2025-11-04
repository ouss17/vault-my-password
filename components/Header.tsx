import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

const colors = {
  card: "#0b3a50",
  textPrimary: "#e6f7ff",
};

const Header = ({ onOpenSettings }: { onOpenSettings: () => void }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/vmp_logo_title_mini.png")}
        style={styles.logo}
        accessibilityLabel="Vault My Password"
        resizeMode="contain"
      />
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
  logo: { width: 160, height: 50 }, 
  icon: { position: "absolute", right: 16, padding: 8 },
});

export default Header;