import { upsertCategory } from "@/redux/slices/categoriesSlice";
import { nanoid } from "@reduxjs/toolkit";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import type { PasswordItem } from "../redux/slices/pwdSlice";
import { addPasswordEncrypted, updatePasswordEncrypted } from "../redux/slices/pwdSlice";
import type { AppDispatch, RootState } from "../redux/store";

const colors = {
  backdrop: "rgba(2,8,14,0.7)",
  modalBg: "#0b3a50",
  inputBg: "#083045",
  textPrimary: "#e6f7ff",
  textSecondary: "#9ec5ea",
  accent: "#1e90ff",
  border: "rgba(255,255,255,0.04)",
  required: "#ff6b6b",
};

const AddPasswordModal = ({
  visible,
  onClose,
  initialItem,
}: {
  visible: boolean;
  onClose: () => void;
  initialItem?: PasswordItem | null;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((s: RootState) => s.categories.items);

  // form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [mdp, setMdp] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  // inline category add
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const isEdit = !!initialItem;

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name ?? "");
      setUsername(initialItem.username ?? "");
      setWebsite(initialItem.website ?? "");
      // do NOT prefill password field for security; leave empty to keep existing password
      setMdp("");
      setNotes(initialItem.notes ?? "");
      setCategoryId(initialItem.categoryId ?? undefined);
    } else {
      // reset on open/close
      setName("");
      setUsername("");
      setWebsite("");
      setMdp("");
      setNotes("");
      setCategoryId(undefined);
      setNewCategoryName("");
      setAddingCategory(false);
    }
  }, [initialItem, visible]);

  const submit = async () => {
    if (!name.trim() || (!mdp && !isEdit)) {
      Alert.alert("Erreur", "Les champs marqués d'un * sont requis.");
      return;
    }
    const key = "MASTER_KEY_PLACEHOLDER"; // replace with secure retrieval

    if (isEdit && initialItem) {
      // build changes; only include fields that should be updated
      const changes: any = {
        name: name.trim(),
        username: username.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
        categoryId,
      };
      // include mdp only if user entered a new one
      if (mdp) changes.mdp = mdp;
      await dispatch<any>(updatePasswordEncrypted(initialItem.id, changes, key));
    } else {
      await dispatch<any>(
        addPasswordEncrypted(
          {
            name: name.trim(),
            username: username.trim() || undefined,
            website: website.trim() || undefined,
            mdp,
            categoryId,
            notes: notes.trim() || undefined,
          } as any,
          key
        )
      );
    }

    // reset and close
    setName("");
    setUsername("");
    setWebsite("");
    setMdp("");
    setNotes("");
    setCategoryId(undefined);
    setNewCategoryName("");
    setAddingCategory(false);
    onClose();
  };

  const handleAddCategory = () => {
    const nm = newCategoryName.trim();
    if (!nm) {
      Alert.alert("Erreur", "Le nom de la catégorie est requis.");
      return;
    }
    const exists = categories.find((c : { id: string; name: string; createdAt: number; updatedAt: number; }) => c.name.toLowerCase() === nm.toLowerCase());
    if (exists) {
      setCategoryId(exists.id);
      setNewCategoryName("");
      setAddingCategory(false);
      return;
    }
    const id = nanoid();
    const now = Date.now();
    dispatch(
      upsertCategory({
        id,
        name: nm,
        createdAt: now,
        updatedAt: now,
      } as any)
    );
    setCategoryId(id);
    setNewCategoryName("");
    setAddingCategory(false);
  };

  // refs pour navigation entre champs
  const nameRef = useRef<TextInput | null>(null);
  const usernameRef = useRef<TextInput | null>(null);
  const websiteRef = useRef<TextInput | null>(null);
  const mdpRef = useRef<TextInput | null>(null);
  const notesRef = useRef<TextInput | null>(null);

  // helper: valide la valeur et focus sur la ref suivante si OK, sinon alerte et focus sur le champ courant
  const validateAndFocus = (
    value: string | undefined | null,
    nextRef?: React.RefObject<TextInput | null>,
    required = false,
    fieldName = "Ce champ"
  ) => {
    const v = (value ?? "").toString().trim();
    if (required && !v) {
      Alert.alert("Erreur", `${fieldName} est requis.`);
      return false;
    }
    if (nextRef?.current) {
      nextRef.current.focus();
    }
    return true;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>{isEdit ? "Modifier le mot de passe" : "Ajouter un mot de passe"}</Text>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={styles.label}>
                Nom
                <Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                ref={nameRef}
                placeholder="Ex : Gmail"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => validateAndFocus(name, usernameRef, true, "Nom")}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nom d'utilisateur</Text>
              <TextInput
                ref={usernameRef}
                placeholder="Ex : jean.dupont"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => validateAndFocus(username, websiteRef, false, "Nom d'utilisateur")}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Site</Text>
              <TextInput
                ref={websiteRef}
                placeholder="https://..."
                value={website}
                onChangeText={setWebsite}
                style={styles.input}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => validateAndFocus(website, mdpRef, false, "Site")}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Mot de passe
                <Text style={styles.required}> {isEdit ? "" : "*"}</Text>
              </Text>
              <TextInput
                ref={mdpRef}
                placeholder={isEdit ? "Laisser vide pour garder le mot de passe actuel" : "Votre mot de passe"}
                value={mdp}
                onChangeText={setMdp}
                style={styles.input}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  // si en édition et mdp vide -> passer aux notes
                  const required = !isEdit;
                  const ok = validateAndFocus(mdp, notesRef, required, "Mot de passe");
                  if (!ok && mdpRef.current) mdpRef.current.focus();
                }}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                ref={notesRef}
                placeholder="Optionnel"
                value={notes}
                onChangeText={setNotes}
                style={[styles.input, styles.textarea]}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                onSubmitEditing={() => {
                  // soumettre depuis le clavier si l'utilisateur appuie sur "done"
                  submit();
                }}
              />
            </View>

            <Text style={[styles.label, { marginTop: 8 }]}>Catégorie</Text>
            <View style={styles.categories}>
              <TouchableOpacity
                onPress={() => setCategoryId(undefined)}
                style={[styles.catChip, categoryId === undefined && styles.catChipActive]}
              >
                <Text style={styles.catChipText}>Sans catégorie</Text>
              </TouchableOpacity>
              {categories.map((c : { id: string; name: string; createdAt: number; updatedAt: number; }) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
                >
                  <Text style={styles.catChipText}>{c.name}</Text>
                </TouchableOpacity>
              ))}

              {/* bouton pour afficher le champ d'ajout */}
              {!addingCategory ? (
                <TouchableOpacity onPress={() => setAddingCategory(true)} style={[styles.catChip, styles.addCatChip]}>
                  <Text style={[styles.catChipText, { color: colors.accent }]}>+ Ajouter</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* champ pour ajouter une nouvelle catégorie inline */}
            {addingCategory && (
              <View style={styles.addCategoryRow}>
                <TextInput
                  placeholder="Nouvelle catégorie"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  style={[styles.input, styles.newCategoryInput]}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity onPress={handleAddCategory} style={styles.addCategoryBtn}>
                  <Text style={styles.addCategoryBtnText}>Ajouter</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAddingCategory(false); setNewCategoryName(""); }} style={styles.addCategoryCancel}>
                  <Text style={{ color: colors.textSecondary }}>Annuler</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={styles.btn}>
                <Text style={styles.btnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submit} style={[styles.btn, styles.btnPrimary]}>
                <Text style={{ color: "white", fontWeight: "600" }}>{isEdit ? "Enregistrer" : "Ajouter"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: "center", padding: 20 },
  modal: { backgroundColor: colors.modalBg, borderRadius: 8, padding: 14, maxHeight: "90%" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 8, color: colors.textPrimary },
  scroll: { paddingBottom: 6 },
  field: { marginBottom: 10 },
  label: { color: colors.textSecondary, marginBottom: 6, fontWeight: "600" },
  required: { color: colors.required },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
    color: colors.textPrimary,
    backgroundColor: colors.inputBg,
  },
  textarea: { minHeight: 72, textAlignVertical: "top" },
  categories: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  addCatChip: { borderStyle: "dashed" },
  catChipActive: { backgroundColor: "rgba(30,144,255,0.12)", borderColor: "rgba(30,144,255,0.25)" },
  catChipText: { color: colors.textPrimary, fontWeight: "600" },

  /* new category row */
  addCategoryRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  newCategoryInput: { flex: 1, marginRight: 8 },
  addCategoryBtn: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  addCategoryBtnText: { color: "#fff", fontWeight: "600" },
  addCategoryCancel: { marginLeft: 8 },

  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  btn: { padding: 10, marginLeft: 8 },
  btnPrimary: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  btnText: { color: colors.textPrimary },
});

export default AddPasswordModal;