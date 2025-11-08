import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
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
  const settings = useSelector((s: RootState) => s.settings);
 
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

   const handleCopyPassword = async () => {
     try {
       let toCopy = decrypted;
       if (!toCopy && passwordId) {
         const res = await dispatch<any>(revealPasswordById(passwordId, "MASTER_KEY_PLACEHOLDER"));
         toCopy = res ?? null;
         setDecrypted(res ?? null);
       }
       if (!toCopy) {
         Alert.alert(t("alert.error.title"), t("password.copy.hidden"));
         return;
       }
       await Clipboard.setStringAsync(toCopy);
       Alert.alert(t("password.copy.title"), t("password.copy.message"));
     } catch (err) {
       console.error("Copy password error:", err);
       Alert.alert(t("alert.error.title"), t("password.copy.error"));
     }
   };

   const handleCopyUsername = async () => {
     try {
       const toCopy = item.username ?? "";
       if (!toCopy) {
         Alert.alert(t("alert.error.title"), t("username.copy.empty"));
         return;
       }
       await Clipboard.setStringAsync(toCopy);
       Alert.alert(t("username.copy.title"), t("username.copy.message"));
     } catch (err) {
       console.error("Copy username error:", err);
       Alert.alert(t("alert.error.title"), t("username.copy.error"));
     }
   };

   const handleCopyTitle = async () => {
     try {
       const toCopy = item.name ?? "";
       if (!toCopy) {
         Alert.alert(t("alert.error.title"), t("title.copy.empty"));
         return;
       }
       await Clipboard.setStringAsync(toCopy);
       Alert.alert(t("title.copy.title"), t("title.copy.message"));
     } catch (err) {
       console.error("Copy title error:", err);
       Alert.alert(t("alert.error.title"), t("title.copy.error"));
     }
   };

   return (
     <>
       <Modal visible={visible} animationType="slide" transparent>
         {/* outer TouchableWithoutFeedback closes modal when tapping outside */}
         <TouchableWithoutFeedback onPress={onClose}>
           <View style={[styles.backdrop]}>
             {/* inner TouchableWithoutFeedback prevents closing when interacting inside the modal */}
             <TouchableWithoutFeedback onPress={() => {}}>
               <View style={styles.modal}>
                 <View style={styles.header}>
                   <Text style={styles.title}>{t("modal.passwordDetail.title")}</Text>
                   <TouchableOpacity onPress={onClose}>
                     <Ionicons name="close" size={22} color={colors.title} />
                   </TouchableOpacity>
                 </View>
                 <ScrollView style={styles.body}>
                   <Text style={styles.label}>{t("field.name")}</Text>
                   <View style={styles.usernameRow}>
                     <Text style={[styles.value, styles.flexText]} numberOfLines={1} ellipsizeMode="tail">
                       {item.name ?? "-"}
                     </Text>
                     {item.name ? (
                       <TouchableOpacity onPress={handleCopyTitle} style={styles.copyBtn} accessibilityLabel={t("accessibility.copyTitle")}>
                         <Ionicons name="copy-outline" size={18} color="#9ec5ea" />
                       </TouchableOpacity>
                     ) : null}
                   </View>

                   <Text style={styles.label}>{t("field.username")}</Text>
                   <View style={styles.usernameRow}>
                     <Text style={[styles.value, styles.flexText]} numberOfLines={1} ellipsizeMode="tail">
                       {item.username ?? "-"}
                     </Text>
                     {item.username ? (
                       <TouchableOpacity onPress={handleCopyUsername} style={styles.copyBtn} accessibilityLabel={t("accessibility.copyUsername")}>
                         <Ionicons name="copy-outline" size={18} color="#9ec5ea" />
                       </TouchableOpacity>
                     ) : null}
                   </View>

                   <Text style={styles.label}>{t("field.website")}</Text>
                   {(() => {
                     const website = item.website ?? "";
                     const url = typeof website === "string" ? website.trim() : "";
                     const isLink = !!url && /^https?:\/\//i.test(url);
                     if (!url) return <Text style={styles.value}>-</Text>;
                     if (!isLink) return <Text style={styles.value}>{url}</Text>;
                     return (
                       <TouchableOpacity
                         onPress={async () => {
                           try {
                             await Linking.openURL(url);
                           } catch (err) {
                             console.error("Open website error:", err);
                             Alert.alert(t("alert.error.title"), t("website.open.error"));
                           }
                         }}
                       >
                         <Text style={[styles.value, styles.link]} numberOfLines={1} ellipsizeMode="tail">
                           {url}
                         </Text>
                       </TouchableOpacity>
                     );
                   })()}

                   <Text style={styles.label}>{t("field.category")}</Text>
                   <Text style={styles.value}>{category?.name ?? t("category.uncategorized")}</Text>

                   <Text style={styles.label}>{t("field.notes")}</Text>
                   <Text style={styles.value}>{item.notes ?? "-"}</Text>

                   <Text style={styles.label}>{t("field.password")}</Text>
                   <View style={styles.passwordRow}>
                     <Text style={[styles.passwordText, styles.flexText]} numberOfLines={1} ellipsizeMode="tail">
                       {decrypted != null ? decrypted : t("password.hidden")}
                     </Text>
                     <TouchableOpacity onPress={handleCopyPassword} style={styles.copyBtn} accessibilityLabel={t("accessibility.copyPassword")}>
                       <Ionicons name="copy-outline" size={18} color="#9ec5ea" />
                     </TouchableOpacity>
                   </View>
                   {/* creation / modification dates */}
                   {(() => {
                     const parseTs = (v: any) => (typeof v === "number" ? v : typeof v === "string" ? Date.parse(v) || 0 : 0);
                     const formatDate = (ts: number | 0 | null) => {
                       if (!ts) return null;
                       const d = new Date(ts);
                       const dd = String(d.getDate()).padStart(2, "0");
                       const mm = String(d.getMonth() + 1).padStart(2, "0");
                       const yyyy = d.getFullYear();
                       return (settings.language === "en" ? `${mm}/${dd}/${yyyy}` : `${dd}/${mm}/${yyyy}`);
                     };

                     const created = formatDate(parseTs((item as any).createdAt ?? null));
                     const updated = formatDate(parseTs((item as any).updatedAt ?? null));
                     if (!created && !updated) return null;
                     return (
                       <View style={styles.metaRow}>
                         {created ? <Text style={styles.metaText}>{t("field.createdAt")}: {created}</Text> : null}
                         {updated && updated !== created ? <Text style={styles.metaText}>{t("field.updatedAt")}: {updated}</Text> : null}
                       </View>
                     );
                   })()}

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
             </TouchableWithoutFeedback>
           </View>
         </TouchableWithoutFeedback>
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
  usernameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  passwordRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  passwordText: { fontSize: 18, fontWeight: "600", color: colors.passwordText },
  copyBtn: { marginLeft: 12, padding: 6, borderRadius: 6, minWidth: 36, alignItems: "center", justifyContent: "center" },
  flexText: { flex: 1, marginRight: 8, overflow: "hidden" },
  link: { color: "#1e90ff", textDecorationLine: "underline" },
  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  metaText: { color: "#9ec5ea", fontSize: 12, marginRight: 12 },
  rowActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  editBtn: { backgroundColor: "#1e90ff" },
  deleteBtn: { backgroundColor: "#ff6b6b" },
  actionText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
});

export default PasswordDetailModal;