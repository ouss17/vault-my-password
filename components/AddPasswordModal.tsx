import { Category, upsertCategory } from "@/redux/slices/categoriesSlice";
import { upsertTag } from "@/redux/slices/tagsSlice";
import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import { nanoid } from "@reduxjs/toolkit";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
  const t = useT();
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((s: RootState) => s.categories.items);
  const tags = useSelector((s: RootState) => s.tags.items);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [lastPickedSuggestion, setLastPickedSuggestion] = useState<string | null>(null);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(true);
  const [website, setWebsite] = useState("");
  const [mdp, setMdp] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showTagHelp, setShowTagHelp] = useState(false);

  const isEdit = !!initialItem;

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name ?? "");
      setUsername(initialItem.username ?? "");
      setWebsite(initialItem.website ?? "");
      setMdp("");
      setNotes(initialItem.notes ?? "");
      setCategoryId(initialItem.categoryId ?? undefined);
      setSelectedTagIds(initialItem.tags ?? []);
      setNewTagName("");
      setAddingTag(false);
    } else {
      
      setName("");
      setUsername("");
      setWebsite("");
      setMdp("");
      setNotes("");
      setCategoryId(undefined);
      setNewCategoryName("");
      setAddingCategory(false);
      setSelectedTagIds([]);
      setNewTagName("");
      setAddingTag(false);
    }
  }, [initialItem, visible]);

  const submit = async () => {
    if (!name.trim() || (!mdp && !isEdit)) {
      Alert.alert(t("alert.error.title"), t("validation.requiredFields"));
      return;
    }
    const key = "MASTER_KEY_PLACEHOLDER";

    if (isEdit && initialItem) {
      const changes: any = {
        name: name.trim(),
        username: username.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
        categoryId,
        tags: selectedTagIds.length ? selectedTagIds : undefined,
      };
      
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
            tags: selectedTagIds.length ? selectedTagIds : undefined,
          } as any,
          key
        )
      );
    }

    

    Keyboard.dismiss();
    
    setName("");
    setUsername("");
    setWebsite("");
    setMdp("");
    setNotes("");
    setCategoryId(undefined);
    setNewCategoryName("");
    setAddingCategory(false);
    setSelectedTagIds([]);
    setNewTagName("");
    setAddingTag(false);
    onClose();
  };

  const handleAddCategory = () => {
    const nm = newCategoryName.trim();
    if (!nm) {
      Alert.alert(t("alert.error.title"), t("validation.categoryNameRequired"));
      return;
    }
    if (nm.length > 20) {
      Alert.alert(t("alert.error.title"), t("validation.categoryNameTooLong") ?? "Category name is too long (max 20)");
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
  const handleAddTag = () => {
    const nm = newTagName.trim();
    if (!nm) {
      Alert.alert(t("alert.error.title"), t("validation.tagNameRequired") ?? "Tag name required");
      return;
    }
    if (!categoryId) {
      Alert.alert(t("alert.error.title"), t("validation.selectCategoryFirst") ?? "Select a category first");
      return;
    }
    if (nm.length > 20) {
      Alert.alert(t("alert.error.title"), t("validation.categoryNameTooLong") ?? "Tag name too long (max 20)");
      return;
    }
    const exists = tags.find((tg: any) => tg.name.toLowerCase() === nm.toLowerCase() && (tg.categoryId ?? "") === categoryId);
    if (exists) {
      setSelectedTagIds([exists.id]);
      setNewTagName("");
      setAddingTag(false);
      return;
    }
    const id = nanoid();
    const now = Date.now();
    dispatch(
      upsertTag({
        id,
        name: nm,
        categoryId,
        createdAt: now,
        updatedAt: now,
      } as any)
    );
    setSelectedTagIds([id]);
    setNewTagName("");
    setAddingTag(false);
  };

  
  const nameRef = useRef<TextInput | null>(null);
  const usernameRef = useRef<TextInput | null>(null);
  const websiteRef = useRef<TextInput | null>(null);
  const mdpRef = useRef<TextInput | null>(null);
  const notesRef = useRef<TextInput | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  React.useEffect(() => {
    if (!visible) {
      setShowPassword(false);
    }
  }, [visible]);

  const validateAndFocus = (
    value: string | undefined | null,
    nextRef?: React.RefObject<TextInput | null>,
    required = false,
    fieldName = t("validation.field")
  ) => {
    const v = (value ?? "").toString().trim();
    if (required && !v) {
      Alert.alert(t("alert.error.title"), `${fieldName} ${t("validation.isRequired")}`);
      return false;
    }
    if (nextRef?.current) {
      nextRef.current.focus();
    }
    return true;
  };


  const passwords = useSelector((s: RootState) => s.passwords.items);
  const allUsernames = useMemo(() => {
    const set = new Set<string>();
    for (const p of passwords) {
      if (p.username && typeof p.username === "string") set.add(p.username);
    }
    return Array.from(set);
  }, [passwords]);


  const isEmailCategory = useMemo(() => {
    if (!categoryId) return false;
    const cat = categories.find((c: Category) => c.id === categoryId);
    const labelCandidate = (cat?.nameKey ?? cat?.name ?? categoryId ?? "").toString().toLowerCase();
    if (categoryId.toString().toLowerCase().includes("email")) return true;
    return /(^|[^a-z])(email|mail|gmail|outlook|yahoo|courriel)([^a-z]|$)/i.test(labelCandidate);
  }, [categoryId, categories]);


  const emailDomains = useMemo(() => {
    const set = new Set<string>();
    for (const u of allUsernames) {
      const parts = u.split("@");
      if (parts.length === 2 && parts[1]) set.add(parts[1].toLowerCase());
    }
    return Array.from(set);
  }, [allUsernames]);

  const commonEmailDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "proton.me", "icloud.com"];

  const domainSuggestions = useMemo(() => {
    const raw = (username ?? "").toString();
    const atIndex = raw.indexOf("@");
    if (atIndex === -1) return [];
    const local = raw.slice(0, atIndex);
    const domainFragment = raw.slice(atIndex + 1).toLowerCase();
    if (!local) return [];
    const pool = Array.from(new Set([...emailDomains, ...commonEmailDomains]));
    const candidates = domainFragment.length === 0 ? pool : pool.filter((d) => d.startsWith(domainFragment));
    return candidates.slice(0, 6);
  }, [username, emailDomains]);

  const usernameSuggestions = useMemo(() => {
    const q = (username ?? "").toString().trim().toLowerCase();
    if (!q) return [];
    return allUsernames
      .filter((u) => u.toLowerCase().includes(q) && u !== username && u !== lastPickedSuggestion)
      .slice(0, 6);
  }, [allUsernames, username, lastPickedSuggestion]);
  
  useEffect(() => {
    if (lastPickedSuggestion && username !== lastPickedSuggestion) {
      setLastPickedSuggestion(null);
    }
    setShowUsernameSuggestions(true);
  }, [username, lastPickedSuggestion]);
 
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEdit ? t("modal.editPassword.title") : t("modal.addPassword.title")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel={t("actions.close")}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={styles.label}>
                {t("field.name")}
                <Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                ref={nameRef}
                placeholder={t("placeholder.exampleName")}
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => validateAndFocus(name, usernameRef, true, t("field.name"))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("field.username")}</Text>
              <TextInput
                ref={usernameRef}
                placeholder={t("placeholder.exampleUsername")}
                value={username}
                onChangeText={(v) => {
                  setUsername(v);
                  setShowUsernameSuggestions(true);
                }}
                style={styles.input}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => validateAndFocus(username, websiteRef, false, t("field.username"))}
              />
              {domainSuggestions.length > 0 ? (
                showUsernameSuggestions && (
                <View style={styles.suggestions}>
                   {domainSuggestions.map((dom) => {
                     const local = username.split("@")[0] ?? "";
                     return (
                       <TouchableOpacity
                         key={`d:${dom}`}
                         style={styles.suggestionItem}
                         onPress={() => {
                           setUsername(`${local}@${dom}`);
                           setShowUsernameSuggestions(false);
                           setLastPickedSuggestion(`${local}@${dom}`);
                           if (usernameRef.current) usernameRef.current.blur();
                           if (websiteRef.current) websiteRef.current.focus();
                         }}
                       >
                         <Text style={styles.suggestionText}>
                           {local}@<Text style={{ opacity: 0.9 }}>{dom}</Text>
                         </Text>
                       </TouchableOpacity>
                     );
                   })}
                 </View>
                )
               ) : null}

              {showUsernameSuggestions && usernameSuggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {usernameSuggestions.map((sug) => (
                    <TouchableOpacity
                      key={sug}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setUsername(sug);
                        setLastPickedSuggestion(sug); // hide the picked suggestion
                        setShowUsernameSuggestions(false);
                        if (usernameRef.current) usernameRef.current.blur();
                        if (websiteRef.current) websiteRef.current.focus();
                      }}
                    >
                      <Text style={styles.suggestionText}>{sug}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("field.website")}</Text>
              <TextInput
                ref={websiteRef}
                placeholder={t("placeholder.website")}
                value={website}
                onChangeText={setWebsite}
                style={styles.input}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => validateAndFocus(website, mdpRef, false, t("field.website"))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {t("field.password")}
                <Text style={styles.required}> {isEdit ? "" : "*"}</Text>
              </Text>
              <View style={styles.passwordRow}>
                <TextInput
                  ref={mdpRef}
                  placeholder={isEdit ? t("field.password.keep") : t("field.password.placeholder")}
                  value={mdp}
                  onChangeText={setMdp}
                  style={[styles.input, styles.passwordInput]}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    const required = !isEdit;
                    const ok = validateAndFocus(mdp, undefined, required, "Mot de passe");
                    if (!ok && mdpRef.current) mdpRef.current.focus();
                    else if (ok) Keyboard.dismiss();
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  style={styles.eyeBtn}
                  accessibilityLabel={showPassword ? t("accessibility.hidePassword") : t("accessibility.showPassword")}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 8 }]}>{t("category.label")}</Text>
            <View style={styles.categories}>
              <TouchableOpacity
                onPress={() => setCategoryId(undefined)}
                style={[styles.catChip, categoryId === undefined && styles.catChipActive]}
              >
                <Text style={styles.catChipText}>{t("category.uncategorized")}</Text>
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


              {!addingCategory ? (
                <TouchableOpacity onPress={() => setAddingCategory(true)} style={[styles.catChip, styles.addCatChip]}>
                  <Text style={[styles.catChipText, { color: colors.accent }]}>{t("category.add")}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Tag selector (shows tags for selected category) */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <Text style={[styles.label, { marginRight: 8 }]}>
                {t("field.tags") ?? "Tags"}
              </Text>
              <TouchableOpacity onPress={() => setShowTagHelp(true)} style={styles.helpBtn} accessibilityLabel={t("tags.help.open") ?? "Help"}>
                <Text style={styles.helpIcon}>?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.categories}>
              {!categoryId ? (
                <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t("tags.selectCategoryFirst") ?? "Select a category to manage tags"}</Text>
              ) : null}
              {tags
                .filter((tg: any) => (tg.categoryId ?? "uncategorized") === (categoryId ?? "uncategorized"))
                .map((tg: any) => (
                  <TouchableOpacity
                    key={tg.id}
                    onPress={() =>
                      setSelectedTagIds((s) => (s.includes(tg.id) ? s.filter((x) => x !== tg.id) : [...s, tg.id]))
                    }
                    style={[styles.catChip, selectedTagIds.includes(tg.id) && styles.catChipActive]}
                  >
                    <Text style={styles.catChipText}>{tg.name}</Text>
                  </TouchableOpacity>
                ))}

              {!addingTag ? (
                <TouchableOpacity onPress={() => setAddingTag(true)} style={[styles.catChip, styles.addCatChip]}>
                  <Text style={[styles.catChipText, { color: colors.accent }]}>{t("tags.add") ?? "Add tag"}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {addingTag && (
              <View style={styles.addCategoryRow}>
                <TextInput
                  placeholder={t("tags.new.placeholder") ?? "New tag"}
                  value={newTagName}
                  onChangeText={setNewTagName}
                  style={[styles.input, styles.newCategoryInput]}
                  placeholderTextColor={colors.textSecondary}
                  maxLength={20}
                />
                <Text style={[styles.charCount, newTagName.length >= 20 ? styles.charCountWarning : null]}>
                  {newTagName.length}/20
                </Text>
                <TouchableOpacity onPress={handleAddTag} style={styles.addCategoryBtn}>
                  <Text style={styles.addCategoryBtnText}>{t("category.addButton")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAddingTag(false); setNewTagName(""); }} style={styles.addCategoryCancel}>
                  <Text style={{ color: colors.textSecondary }}>{t("common.cancel")}</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Tags help modal */}
            <Modal visible={showTagHelp} animationType="fade" transparent onRequestClose={() => setShowTagHelp(false)}>
              <View style={styles.helpModalBackdrop}>
                <View style={styles.helpModal}>
                  <Text style={styles.helpTitle}>{t("tags.help.title") ?? "À propos des tags"}</Text>
                  <Text style={styles.helpBody}>
                    {t("tags.help.body") ??
                      "Les tags sont des labels optionnels pour organiser vos mots de passe à l'intérieur d'une catégorie.\n\nExemple : dans la catégorie « Email » vous pouvez ajouter les tags « pro », « gaming », « achats ». Vous pouvez sélectionner plusieurs tags pour un même mot de passe et filtrer les mots de passe en cliquant sur les tags dans la vue de la catégorie."}
                  </Text>
                  <TouchableOpacity onPress={() => setShowTagHelp(false)} style={styles.helpCloseBtn}>
                    <Text style={{ color: "#fff", fontWeight: "600" }}>{t("actions.close") ?? "Fermer"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <View style={styles.field}>
              <Text style={styles.label}>{t("field.notes")}</Text>
              <TextInput
                ref={notesRef}
                placeholder={t("field.notes.placeholder")}
                value={notes}
                onChangeText={setNotes}
                style={[styles.input, styles.textarea]}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                onSubmitEditing={() => {
                  submit();
                }}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={styles.btn}>
                <Text style={styles.btnText}>{t("actions.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submit} style={[styles.btn, styles.btnPrimary]}>
                <Text style={{ color: "white", fontWeight: "600" }}>{isEdit ? t("actions.save") : t("actions.add")}</Text>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn: { padding: 8, marginLeft: 8 },
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
  passwordRow: { flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1, marginRight: 8 },
  eyeBtn: { padding: 8, borderRadius: 8 },
  suggestions: {
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionItem: { paddingVertical: 8, paddingHorizontal: 10 },
  suggestionText: { color: colors.textPrimary },
  // no extra styles needed for domain suggestions (reuses suggestions styles)
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
  
  addCategoryRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  newCategoryInput: { flex: 1, marginRight: 8 },
  charCount: { color: colors.textSecondary, fontSize: 12, marginLeft: 8, alignSelf: "center" },
  charCountWarning: { color: colors.required },
   addCategoryBtn: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
   addCategoryBtnText: { color: "#fff", fontWeight: "600" },
   addCategoryCancel: { marginLeft: 8 },

  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  btn: { padding: 10, marginLeft: 8 },
  btnPrimary: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  btnText: { color: colors.textPrimary },
  helpBtn: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  helpIcon: { color: colors.textSecondary, fontWeight: "700" },
  helpModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  helpModal: { backgroundColor: colors.modalBg, padding: 18, borderRadius: 8, width: "100%", maxWidth: 520 },
  helpTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  helpBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  helpCloseBtn: { backgroundColor: colors.accent, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
});

export default AddPasswordModal;
