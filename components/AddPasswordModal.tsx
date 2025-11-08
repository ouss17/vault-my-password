import { Category, upsertCategory } from "@/redux/slices/categoriesSlice";
import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import { nanoid } from "@reduxjs/toolkit";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const t = useT();
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((s: RootState) => s.categories.items);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [mdp, setMdp] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const isEdit = !!initialItem;

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name ?? "");
      setUsername(initialItem.username ?? "");
      setWebsite(initialItem.website ?? "");
      setMdp("");
      setNotes(initialItem.notes ?? "");
      setCategoryId(initialItem.categoryId ?? undefined);
    } else {
      
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
          } as any,
          key
        )
      );
    }

    
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
      Alert.alert(t("alert.error.title"), t("validation.categoryNameRequired"));
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

  
  const nameRef = useRef<TextInput | null>(null);
  const usernameRef = useRef<TextInput | null>(null);
  const websiteRef = useRef<TextInput | null>(null);
  const mdpRef = useRef<TextInput | null>(null);
  const notesRef = useRef<TextInput | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  
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

  // build suggestions from existing passwords' usernames
  const passwords = useSelector((s: RootState) => s.passwords.items);
  const allUsernames = useMemo(() => {
    const set = new Set<string>();
    for (const p of passwords) {
      if (p.username && typeof p.username === "string") set.add(p.username);
    }
    return Array.from(set);
  }, [passwords]);

  // detect if selected category looks like an email category (id, name or nameKey)
  const isEmailCategory = useMemo(() => {
    if (!categoryId) return false;
    const cat = categories.find((c: Category) => c.id === categoryId);
    const labelCandidate = (cat?.nameKey ?? cat?.name ?? categoryId ?? "").toString().toLowerCase();
    // check id contains 'email' or name / key contains common email keywords
    if (categoryId.toString().toLowerCase().includes("email")) return true;
    return /(^|[^a-z])(email|mail|gmail|outlook|yahoo|courriel)([^a-z]|$)/i.test(labelCandidate);
  }, [categoryId, categories]);

  // collect domains from existing usernames
  const emailDomains = useMemo(() => {
    const set = new Set<string>();
    for (const u of allUsernames) {
      const parts = u.split("@");
      if (parts.length === 2 && parts[1]) set.add(parts[1].toLowerCase());
    }
    return Array.from(set);
  }, [allUsernames]);

  const commonEmailDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "proton.me", "icloud.com"];

  // suggest domains whenever user typed an '@' in username, independent of category
  const domainSuggestions = useMemo(() => {
    const raw = (username ?? "").toString();
    const atIndex = raw.indexOf("@");
    if (atIndex === -1) return [];
    const local = raw.slice(0, atIndex);
    const domainFragment = raw.slice(atIndex + 1).toLowerCase();
    if (!local) return [];
    const pool = Array.from(new Set([...emailDomains, ...commonEmailDomains]));
    // if user typed nothing after @, show top domains + known domains
    const candidates = domainFragment.length === 0 ? pool : pool.filter((d) => d.startsWith(domainFragment));
    return candidates.slice(0, 6);
  }, [username, emailDomains]);

  const usernameSuggestions = useMemo(() => {
    const q = (username ?? "").toString().trim().toLowerCase();
    if (!q) return [];
    return allUsernames.filter((u) => u.toLowerCase().includes(q) && u !== username).slice(0, 6);
  }, [allUsernames, username]);
 
  return (
    <Modal visible={visible} animationType="slide" transparent>
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
                onChangeText={setUsername}
                style={styles.input}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => validateAndFocus(username, websiteRef, false, t("field.username"))}
              />
              {/* domain completion suggestions when category looks like email and user typed "localpart@" */}
              {domainSuggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {domainSuggestions.map((dom) => {
                    const local = username.split("@")[0] ?? "";
                    return (
                      <TouchableOpacity
                        key={`d:${dom}`}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setUsername(`${local}@${dom}`);
                          // focus next field after selecting suggestion
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
              ) : null}

              {/* general username suggestions (non-forcing) */}
              {usernameSuggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {usernameSuggestions.map((sug) => (
                    <TouchableOpacity
                      key={sug}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setUsername(sug);
                        // focus next field after selecting suggestion
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
                    const ok = validateAndFocus(mdp, notesRef, required, "Mot de passe");
                    if (!ok && mdpRef.current) mdpRef.current.focus();
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


            {addingCategory && (
              <View style={styles.addCategoryRow}>
                <TextInput
                  placeholder={t("category.new.placeholder")}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  style={[styles.input, styles.newCategoryInput]}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity onPress={handleAddCategory} style={styles.addCategoryBtn}>
                  <Text style={styles.addCategoryBtnText}>{t("category.addButton")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAddingCategory(false); setNewCategoryName(""); }} style={styles.addCategoryCancel}>
                  <Text style={{ color: colors.textSecondary }}>{t("common.cancel")}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Notes placé après la catégorie */}
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
  addCategoryBtn: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  addCategoryBtnText: { color: "#fff", fontWeight: "600" },
  addCategoryCancel: { marginLeft: 8 },

  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  btn: { padding: 10, marginLeft: 8 },
  btnPrimary: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  btnText: { color: colors.textPrimary },
});

export default AddPasswordModal;