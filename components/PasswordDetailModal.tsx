import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import type { PasswordItem } from "../redux/slices/pwdSlice";
import { deletePassword, revealPasswordById } from "../redux/slices/pwdSlice";
import type { AppDispatch, RootState } from "../redux/store";
import AddPasswordModal from "./AddPasswordModal";

const colors = {
  backdrop: "rgba(2,8,14,0.7)",
  modalBg: "#0b3a50",
  title: "#e6f7ff",
  label: "#9ec5ea",
  passwordText: "#ffffff",
  accent: "#1e90ff",
  border: "rgba(255,255,255,0.03)",
};

const PasswordDetailModal = ({
  visible,
  passwordId,
  onClose,
  onEdit,
}: {
  visible: boolean;
  passwordId: string | null;
  onClose: () => void;
  onEdit?: (item: PasswordItem) => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const t = useT();
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const item = useSelector((s: RootState) => s.passwords.items.find((p : { id: string; name: string; username: string; website: string; mdp: string; notes: string; categoryId: string | undefined; }) => p.id === passwordId) ?? null);
  const categories = useSelector((s: RootState) => s.categories.items);

  useEffect(() => {
    if (!visible || !passwordId) {
      setDecrypted(null);
      return;
    }
    const key = "MASTER_KEY_PLACEHOLDER"; 
    (async () => {
      const res = await dispatch<any>(revealPasswordById(passwordId, key));
      setDecrypted(res ?? null);
    })();
  }, [visible, passwordId, dispatch]);

  if (!item) {
    return null;
  }

  const category = item.categoryId ? categories.find((c : { id: string; name: string; createdAt: number; updatedAt: number; }) => c.id === item.categoryId) : null;

  const handleDelete = () => {
    Alert.alert(
      t("alerts.deletePassword.confirmTitle"),
      t("alerts.deletePassword.confirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            dispatch(deletePassword(item.id));
            onClose();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    
    if (onEdit) {
      onEdit(item);
      onClose();
      return;
    }
    
    setShowEdit(true);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={[styles.backdrop]}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>{t("modal.passwordDetail.title")}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.title} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body}>
              <Text style={styles.label}>{t("field.name")}</Text>
              <Text style={styles.value}>{item.name}</Text>

              <Text style={styles.label}>{t("field.username")}</Text>
              <Text style={styles.value}>{item.username ?? "-"}</Text>

              <Text style={styles.label}>{t("field.website")}</Text>
              <Text style={styles.value}>{item.website ?? "-"}</Text>

              <Text style={styles.label}>{t("field.category")}</Text>
              <Text style={styles.value}>{category?.name ?? t("category.uncategorized")}</Text>

              <Text style={styles.label}>{t("field.notes")}</Text>
              <Text style={styles.value}>{item.notes ?? "-"}</Text>

              <Text style={styles.label}>{t("field.password")}</Text>
              <View style={styles.passwordRow}>
                <Text style={styles.passwordText}>{decrypted != null ? decrypted : t("password.hidden")}</Text>
              </View>

              <View style={styles.rowActions}>
                <TouchableOpacity onPress={handleEdit} style={[styles.actionBtn, styles.editBtn]}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.actionText}>{t("actions.edit")}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, styles.deleteBtn]}>
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.actionText}>{t("common.delete")}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>


      {showEdit && item && (
        <AddPasswordModal
          visible={showEdit}
          onClose={() => setShowEdit(false)}
          initialItem={item}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: "center", padding: 20 },
  modal: { backgroundColor: colors.modalBg, borderRadius: 8, overflow: "hidden" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 16, fontWeight: "600", color: colors.title },
  body: { padding: 12, maxHeight: 520 },
  label: { color: colors.label, marginTop: 8, marginBottom: 6 },
  value: { color: "#e6f7ff", fontSize: 15 },
  passwordRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  passwordText: { fontSize: 18, fontWeight: "600", color: colors.passwordText },
  rowActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  editBtn: { backgroundColor: "#1e90ff" },
  deleteBtn: { backgroundColor: "#ff6b6b" },
  actionText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
});

export default PasswordDetailModal;