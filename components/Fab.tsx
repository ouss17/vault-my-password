import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

const Fab = ({ onPress }: { onPress: () => void }) => {
  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <TouchableOpacity onPress={onPress} style={styles.fab}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: "absolute", right: 18, bottom: 100 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#007aff", alignItems: "center", justifyContent: "center", elevation: 6 },
});

export default Fab;