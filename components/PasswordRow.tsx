import { deletePassword, upsertPassword } from "@/redux/slices/pwdSlice";
import type { RootState } from "@/redux/store";
import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

type Props = {
  id: string;
  name: string;
  username?: string;
  isOld?: boolean;
  onReveal: () => void;
};

export default function PasswordRow({ id, name, username, isOld, onReveal }: Props) {
  const dispatch = useDispatch();
  const t = useT();
  const item = useSelector((s: RootState) => s.passwords.items.find((p: any) => p.id === id));

  const handleDelete = () => {
    const title = t("alerts.deletePassword.confirmTitle") ?? "Delete";
    const msg = (t("alerts.deletePassword.confirmMessage") ?? "Delete «{name}» ?").replace("{name}", name);
    Alert.alert(
      title,
      msg,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            try {
              // delete
              dispatch(deletePassword(id) as any);
              // show simple undo action via alert
              Alert.alert(
                t("alerts.deletePassword.deletedTitle") ?? "Deleted",
                (t("alerts.deletePassword.deletedMessage") ?? "«{name}» deleted").replace("{name}", name),
                [
                  {
                    text: t("alerts.deletePassword.undo") ?? "Undo",
                    onPress: () => {
                      if (item) {
                        dispatch(upsertPassword(item) as any);
                      }
                    },
                  },
                  { text: t("common.ok"), style: "default" },
                ],
                { cancelable: true }
              );
            } catch (err) {
              console.error("Delete password error:", err);
              Alert.alert(t("alert.error.title") ?? "Error", t("alerts.deletePassword.errorMessage") ?? "Unable to delete");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.left}
        onPress={onReveal}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={t("accessibility.openPasswordDetail") ?? "Open details"}
      >
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {name}
        </Text>
        {username ? (
          <Text style={styles.username} numberOfLines={1} ellipsizeMode="middle">
            {username}
          </Text>
        ) : null}
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onReveal} style={styles.iconBtn} accessibilityLabel={t("accessibility.revealPassword")}>
          <Ionicons name="eye-outline" size={18} color="#9ec5ea" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} accessibilityLabel={t("accessibility.deletePassword")}>
          <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingRight: 8 },
  left: { flex: 1, paddingRight: 8 },
  name: { color: "#e6f7ff", fontWeight: "700", fontSize: 15 },
  username: { color: "#9ec5ea", fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { padding: 8, borderRadius: 8, marginLeft: 4 },
});