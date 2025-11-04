import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const PasswordRow = ({ id, name, username, onReveal }: { id: string; name: string; username?: string; onReveal: () => void }) => {
  return (
    <Pressable
      onPress={onReveal}
      android_ripple={{ color: "rgba(255,255,255,0.02)" }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.maskRow}>
          <Text style={styles.mask}>••••••••</Text>
          {username ? <Text style={styles.username}>  ·  {username}</Text> : null}
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.eyeCircle}>
          <Ionicons name="eye-outline" size={18} color="#0b3a50" />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowPressed: {
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  left: { flex: 1, paddingRight: 8 },
  name: { fontSize: 15, fontWeight: "600", color: "#e6f7ff" },
  maskRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  mask: { fontSize: 13, color: "#9ec5ea" },
  username: { fontSize: 13, color: "#84a7c6" },
  right: { width: 36, alignItems: "flex-end" },
  eyeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e90ff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
});

export default PasswordRow;