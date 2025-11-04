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
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const item = useSelector((s: RootState) => s.passwords.items.find((p : { id: string; name: string; username: string; website: string; mdp: string; notes: string; categoryId: string | undefined; }) => p.id === passwordId) ?? null);
  const categories = useSelector((s: RootState) => s.categories.items);

  useEffect(() => {
    if (!visible || !passwordId) {
      setDecrypted(null);
      return;
    }
    const key = "MASTER_KEY_PLACEHOLDER"; // replace with secure retrieval
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
    Alert.alert("Supprimer", "Voulez-vous supprimer ce mot de passe ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          dispatch(deletePassword(item.id));
          onClose();
        },
      },
    ]);
  };

  const handleEdit = () => {
    // prefer parent handler to open the global AddPasswordModal in edit mode
    if (onEdit) {
      onEdit(item);
      onClose();
      return;
    }
    // fallback: open inline editor modal
    setShowEdit(true);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={[styles.backdrop]}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Détail</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.title} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body}>
              <Text style={styles.label}>Titre</Text>
              <Text style={styles.value}>{item.name}</Text>

              <Text style={styles.label}>Nom d'utilisateur</Text>
              <Text style={styles.value}>{item.username ?? "-"}</Text>

              <Text style={styles.label}>Site</Text>
              <Text style={styles.value}>{item.website ?? "-"}</Text>

              <Text style={styles.label}>Catégorie</Text>
              <Text style={styles.value}>{category?.name ?? "Sans catégorie"}</Text>

              <Text style={styles.label}>Notes</Text>
              <Text style={styles.value}>{item.notes ?? "-"}</Text>

              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordRow}>
                <Text style={styles.passwordText}>{decrypted != null ? decrypted : "••••••••"}</Text>
              </View>

              <View style={styles.rowActions}>
                <TouchableOpacity onPress={handleEdit} style={[styles.actionBtn, styles.editBtn]}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.actionText}>Modifier</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, styles.deleteBtn]}>
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.actionText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fallback inline editor if parent didn't handle edit */}
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