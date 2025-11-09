import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

const colors = {
  card: "#0b3a50",
  textPrimary: "#e6f7ff",
};

const Header = ({
  onOpenSettings,
  onOpenCategorySort,
}: {
  onOpenSettings: () => void;
  onOpenCategorySort?: () => void;
}) => {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/vmp_logo_title_mini.png")}
        style={styles.logo}
        accessibilityLabel="Vault My Password"
        resizeMode="contain"
      />
      <View style={styles.iconGroup}>

        <TouchableOpacity onPress={onOpenCategorySort} style={styles.icon}>
          <Ionicons name="reorder-three-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onOpenSettings} style={styles.icon}>
          <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
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
  iconGroup: { position: "absolute", right: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  icon: { padding: 8, marginLeft: 6 },
});

export default Header;