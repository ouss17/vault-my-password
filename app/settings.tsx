import { questions } from "@/datas/questions";
import { setCategories } from "@/redux/slices/categoriesSlice";
import { PasswordItem, setPasswords } from "@/redux/slices/pwdSlice";
import {
  clearSensitiveData,
  Language,
  saveQuestionAnswerHashed,
  setFingerprintAuthEnabled,
  setLanguage,
  setLockTimeoutMinutes,
  setQuestionAuthEnabled,
  setQuestionHint,
  setSelectedQuestionId,
} from "@/redux/slices/settingsSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import { setLockSuspended } from "@/utils/lockSuspend";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
// Use legacy filesystem API to avoid deprecation warning for writeAsStringAsync/readAsStringAsync.
// You can migrate later to the new File/Directory API as documented by Expo.
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

/**
 * Note:
 * - replace sampleQuestions by your real data source (e.g. import from '@/datas/questions')
 * - saveQuestionAnswerHashed thunk hashes the answer before storing (secure)
 */

// questions imported from c:\Projects\vault_my_password\datas\questions.ts

const colors = {
  background: "#072033",
  card: "#0b3a50",
  textPrimary: "#e6f7ff",
  textSecondary: "#9ec5ea",
  accent: "#1e90ff",
  border: "rgba(255,255,255,0.04)",
};

const Settings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const s = useSelector((st: RootState) => st.settings);
  const categories = useSelector((st: RootState) => st.categories.items);
  const passwords = useSelector((st: RootState) => st.passwords.items);
  const router = useRouter();

  // local lock timeout input to allow multi-digit typing before validation
  const [lockTimeoutText, setLockTimeoutText] = useState<string>(String(s.lockTimeoutMinutes ?? 5));
  useEffect(() => {
    setLockTimeoutText(String(s.lockTimeoutMinutes ?? 5));
  }, [s.lockTimeoutMinutes]);

  // local fields for editing sensitive values
  const [questionHint, setLocalQuestionHint] = useState<string | null>(s.questionHint);
  const [plainAnswer, setPlainAnswer] = useState<string>("");

  useEffect(() => {
    setLocalQuestionHint(s.questionHint);
  }, [s.questionHint]);

  const toggleQuestionAuth = (v: boolean) => {
    // if disabling, confirm and clear sensitive data
    if (!v) {
      Alert.alert("Désactiver la question secrète", "Voulez-vous supprimer la question et la réponse enregistrées ?", [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            dispatch(setQuestionAuthEnabled(false));
            dispatch(clearSensitiveData());
          },
        },
      ]);
      return;
    }
    dispatch(setQuestionAuthEnabled(true));
  };

  const onSaveAnswer = async () => {
    if (!plainAnswer.trim()) {
      Alert.alert("Erreur", "La réponse ne peut pas être vide.");
      return;
    }
    // dispatch thunk that hashes and stores the answer
    await dispatch(saveQuestionAnswerHashed(plainAnswer.trim()));
    setPlainAnswer("");
    Alert.alert("Succès", "Réponse enregistrée en toute sécurité.");
  };

  const onSelectQuestion = (id: string) => {
    dispatch(setSelectedQuestionId(id));
  };

  const onChangeHint = (txt: string) => {
    setLocalQuestionHint(txt);
  };

  const onSaveHint = () => {
    dispatch(setQuestionHint(questionHint ?? null));
    Alert.alert("Indice enregistré");
  };

  const onToggleFingerprint = (v: boolean) => {
    dispatch(setFingerprintAuthEnabled(v));
  };

  // update local text on change
  const onChangeLockTimeout = (txt: string) => {
    // allow empty string while typing
    setLockTimeoutText(txt.replace(/[^0-9]/g, ""));
  };

  // validate & save when user finishes editing
  const onLockTimeoutEndEditing = () => {
    const n = Number(lockTimeoutText);
    if (Number.isNaN(n) || n <= 0) {
      // fallback to previous value if invalid
      setLockTimeoutText(String(s.lockTimeoutMinutes ?? 5));
      return;
    }
    dispatch(setLockTimeoutMinutes(Math.max(1, Math.floor(n))));
  };

  const onSetLanguage = (lang: Language) => {
    dispatch(setLanguage(lang));
  };

  /* -------------------------
     Export / Import helpers
     ------------------------- */
  const exportToFile = async (obj: any, filename: string, dialogTitle?: string) => {
    try {
      const json = JSON.stringify(obj, null, 2);
      // Prefer cacheDirectory for temporary export file
      const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? "";
      if (!dir) {
        Alert.alert("Erreur", "Impossible d'accéder au répertoire de fichiers sur cet appareil.");
        return;
      }
      const fileUri = dir + filename;

      // cast encoding to any to avoid TS type issues in some SDKs
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: "utf8" } as any);

      // use Sharing API to show native share dialog
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: dialogTitle ?? "Exporter les données",
        });
      } else {
        Alert.alert("Export", `Fichier sauvegardé : ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert("Erreur", "Impossible d'exporter : " + (e?.message ?? String(e)));
    }
  };

  const handleExportAll = async () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        categories,
        passwords,
        settings: s,
      };
      const json = JSON.stringify(payload, null, 2);
      const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? "";
      const fileUri = dir + `vault_export_all_${Date.now()}.json`;

      // write with explicit utf8 encoding (avoid TS type issues by casting)
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: "utf8" } as any);

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Exporter toutes les données",
      });
    } catch (e: any) {
      Alert.alert("Erreur", "L'export a échoué : " + (e?.message ?? String(e)));
    }
  };

  // allow multi-select of categories for export
  const [selectedExportCategoryIds, setSelectedExportCategoryIds] = useState<string[]>([]);

  const toggleExportCategory = (id: string | null) => {
    // null represents "Sans catégorie" -> use special token '__uncategorized'
    const key = id ?? "__uncategorized";
    setSelectedExportCategoryIds((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const handleExportSelectedCategories = async () => {
    if (selectedExportCategoryIds.length === 0) {
      Alert.alert("Aucune catégorie sélectionnée", "Sélectionnez au moins une catégorie à exporter.");
      return;
    }

    try {
      // build export payload: include categories info and their passwords
      const selectedCats = selectedExportCategoryIds.map((k) =>
        k === "__uncategorized"
          ? { id: null, name: "Sans catégorie" }
          : categories.find((c: Category) => (c.id ?? "__uncategorized") === k)
      );

      const items = passwords.filter((p: PasswordItem) =>
        selectedExportCategoryIds.includes((p.categoryId ?? "__uncategorized") as string)
      );

      const payload = {
        exportedAt: new Date().toISOString(),
        categories: selectedCats,
        passwords: items,
        settings: s,
      };

      const json = JSON.stringify(payload, null, 2);
      const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? "";
      const fileUri = dir + `vault_export_selected_${Date.now()}.json`;

      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: "utf8" } as any);

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Exporter catégories sélectionnées",
      });

      // clear selection after successful export
      setSelectedExportCategoryIds([]);
    } catch (e: any) {
      Alert.alert("Erreur", "L'export a échoué : " + (e?.message ?? String(e)));
    }
  };

  const handleImport = async () => {
    // suspendre le verrouillage AVANT d'ouvrir le picker pour éviter un lock instantané
    try {
      // suspend app locking while system picker is open
      setLockSuspended(true);
      // pick a single JSON file, copy to cache for stable uri across platforms
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        multiple: false,
      });
      const r = res as any;

      // normalize picker result: handle multiple DocumentPicker shapes across SDKs/platforms
      // detect explicit cancel
      const cancelled =
        r === null ||
        r === undefined ||
        r.type === "cancel" ||
        r.type === "cancelled" ||
        r.type === "dismiss" ||
        r.type === "canceled" ||
        r.canceled === true;
      if (cancelled) {
        Alert.alert("Import", "Aucun fichier sélectionné.");
        return;
      }

      // try multiple properties for uri (expo/document-picker different shapes)
      const uri: string | undefined =
        r.uri ?? r.fileCopyUri ?? r.assets?.[0]?.uri ?? r.assets?.[0]?.fileCopyUri;

      if (!uri) {
        Alert.alert("Erreur", "Impossible de récupérer le fichier sélectionné.");
        return;
      }

      // read file (utf8)
      const content = await FileSystem.readAsStringAsync(uri, { encoding: "utf8" } as any);
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (parseErr) {
        console.error("Import parse error:", parseErr);
        Alert.alert("Erreur", "Le fichier n'est pas un JSON valide.");
        return;
      }

      console.log("Import payload preview:", parsed);

      // helper to find arrays that look like categories / passwords
      const isPasswordObject = (o: any) =>
        o && typeof o === "object" && (("username" in o) || ("password" in o) || ("site" in o) || ("title" in o));
      const isCategoryObject = (o: any) =>
        o && typeof o === "object" && ("name" in o) && !isPasswordObject(o);

      const findArrays = (obj: any) => {
        const cats: any[] = [];
        const pwds: any[] = [];

        // direct shapes
        if (Array.isArray(obj.categories)) {
          const sample = obj.categories[0];
          if (isCategoryObject(sample)) cats.push(...obj.categories);
        }
        if (Array.isArray(obj.passwords)) {
          const sample = obj.passwords[0];
          if (isPasswordObject(sample)) pwds.push(...obj.passwords);
        }

        // nested shapes like { categories: { items: [...] } } or { categories: { categories: [...] } }
        if (obj.categories && Array.isArray(obj.categories.items)) {
          const sample = obj.categories.items[0];
          if (isCategoryObject(sample)) cats.push(...obj.categories.items);
        }
        if (obj.categories && Array.isArray(obj.categories.categories)) {
          const sample = obj.categories.categories[0];
          if (isCategoryObject(sample)) cats.push(...obj.categories.categories);
        }
        if (obj.passwords && Array.isArray(obj.passwords.items)) {
          const sample = obj.passwords.items[0];
          if (isPasswordObject(sample)) pwds.push(...obj.passwords.items);
        }
        if (obj.passwords && Array.isArray(obj.passwords.passwords)) {
          const sample = obj.passwords.passwords[0];
          if (isPasswordObject(sample)) pwds.push(...obj.passwords.passwords);
        }

        // wrapper keys: try to detect arrays by sample shape, be conservative to avoid misclassification
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
            const sample = v[0];
            if (isCategoryObject(sample)) cats.push(...v);
            else if (isPasswordObject(sample)) pwds.push(...v);
            // else: ambiguous -> skip
          } else if (v && typeof v === "object") {
            // try nested arrays
            if (Array.isArray(v.items) && v.items.length > 0) {
              const sample = v.items[0];
              if (isCategoryObject(sample)) cats.push(...v.items);
              else if (isPasswordObject(sample)) pwds.push(...v.items);
            }
            if (Array.isArray(v.categories)) {
              const sample = v.categories[0];
              if (isCategoryObject(sample)) cats.push(...v.categories);
            }
            if (Array.isArray(v.passwords)) {
              const sample = v.passwords[0];
              if (isPasswordObject(sample)) pwds.push(...v.passwords);
            }
          }
        }

        return { cats, pwds };
      };

      // Try several places: top-level, top-level.payload, parsed.exported, parsed.data, parsed.dump].filter(Boolean);
      let categoriesArray: any[] = [];
      let passwordsArray: any[] = [];

      const tries = [parsed, parsed.payload, parsed.exported, parsed.data, parsed.dump].filter(Boolean);
      for (const t of tries) {
        const { cats, pwds } = findArrays(t);
        if (cats.length) categoriesArray.push(...cats);
        if (pwds.length) passwordsArray.push(...pwds);
      }

      // final fallback: if top-level has direct arrays named categories/passwords
      if (categoriesArray.length === 0 && Array.isArray(parsed.categories)) categoriesArray = parsed.categories;
      if (passwordsArray.length === 0 && Array.isArray(parsed.passwords)) passwordsArray = parsed.passwords;

      // If still empty, try to guess by scanning all arrays in parsed
      if (categoriesArray.length === 0 && passwordsArray.length === 0) {
        for (const k of Object.keys(parsed)) {
          if (Array.isArray(parsed[k]) && parsed[k].length && typeof parsed[k][0] === "object") {
            const sample = parsed[k][0];
            if ("name" in sample && "id" in sample) categoriesArray.push(...parsed[k]);
            else if ("username" in sample || "password" in sample || "site" in sample) passwordsArray.push(...parsed[k]);
          }
        }
      }

      // If nothing found at all, abort
      if (categoriesArray.length === 0 && passwordsArray.length === 0) {
        console.warn("Import: aucun tableau categories/passwords détecté");
        Alert.alert("Erreur", "Le fichier ne contient pas de catégories ni de mots de passe.");
        return;
      }

      // ensure arrays
      categoriesArray = Array.isArray(categoriesArray) ? categoriesArray : [];
      passwordsArray = Array.isArray(passwordsArray) ? passwordsArray : [];

      // Debug feedback before applying
      Alert.alert(
        "Import",
        `Fichier lu : ${categoriesArray.length} catégorie(s) détectée(s), ${passwordsArray.length} mot(s) de passe détecté(s).`
      );

      // generate id helper for items without id
      const genId = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

      // normalize incoming: ensure id fields exist
      const normalizeCats = categoriesArray.map((c: any) => ({ ...c, id: c.id ?? genId() }));
      const normalizePwds = passwordsArray.map((p: any) => ({ ...p, id: p.id ?? genId() }));

      const existingCatIds = new Set(categories.map((c: any) => c.id));
      const existingPwdIds = new Set(passwords.map((p: any) => p.id));

      // Additional duplicate detection by content:
      const normalizeName = (s: any) => (typeof s === "string" ? s.trim().toLowerCase() : "");
      const pwdKey = (p: any) =>
        `${(p.title ?? "").toString().trim().toLowerCase()}|${(p.site ?? "").toString().trim().toLowerCase()}|${(p.username ?? "").toString().trim().toLowerCase()}`;

      // existing keys/names
      const existingCatNames = new Set(categories.map((c: any) => normalizeName(c.name)));
      const existingPwdKeys = new Set(passwords.map((p: any) => pwdKey(p)));

      // avoid duplicates inside incoming arrays as well
      const incomingCatNamesSeen = new Set<string>();
      const incomingPwdKeysSeen = new Set<string>();

      const catsToAdd = normalizeCats.filter((c) => {
        if (!c) return false;
        if (c.id != null && existingCatIds.has(c.id)) return false;
        const n = normalizeName(c.name);
        if (!n) return false; // skip categories without a name
        if (existingCatNames.has(n)) return false; // duplicate of existing by name
        if (incomingCatNamesSeen.has(n)) return false; // duplicate inside file
        incomingCatNamesSeen.add(n);
        return true;
      });

      const pwdsToAdd = normalizePwds.filter((p) => {
        if (!p) return false;
        if (p.id != null && existingPwdIds.has(p.id)) return false;
        const k = pwdKey(p);
        if (!k || k === "||") return false; // skip empty/invalid entries
        if (existingPwdKeys.has(k)) return false; // duplicate of existing by content
        if (incomingPwdKeysSeen.has(k)) return false; // duplicate inside file
        incomingPwdKeysSeen.add(k);
        return true;
      });

      if (catsToAdd.length === 0 && pwdsToAdd.length === 0) {
        Alert.alert("Import terminé", "Aucune donnée importée : tout existe déjà.");
        return;
      }

      // apply additions (append)
      try {
        if (catsToAdd.length > 0) {
          dispatch(setCategories([...categories, ...catsToAdd]));
        }
        if (pwdsToAdd.length > 0) {
          dispatch(setPasswords([...passwords, ...pwdsToAdd]));
        }
        Alert.alert("Import réussi", `Importé : ${catsToAdd.length} catégorie(s), ${pwdsToAdd.length} mot(s) de passe.`);
      } catch (applyErr: any) {
        console.error("Import apply error:", applyErr);
        Alert.alert("Erreur", "Un problème est survenu pendant l'import : " + (applyErr?.message ?? String(applyErr)));
      }
    } catch (e: any) {
      console.error("Import error:", e);
      Alert.alert("Erreur", "Le fichier n'est pas un JSON valide ou une erreur est survenue.");
    } finally {
      // always re-enable locking after import flow ends
      setLockSuspended(false);
    }
  };
  // local Category type (slice n'exporte pas le type)
type Category = { id: string | null; name: string };


  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Sécurité</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.label}>Question secrète</Text>
            <Text style={styles.desc}>Activer une question pour récupérer l'accès</Text>
          </View>
          <Switch value={s.questionAuthEnabled} onValueChange={toggleQuestionAuth} thumbColor={colors.accent} />
        </View>

        {s.questionAuthEnabled && (
          <View style={styles.card}>
            <Text style={styles.label}>Question</Text>
            {questions.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={[styles.choice, s.selectedQuestionId === q.id && styles.choiceActive]}
                onPress={() => onSelectQuestion(q.id)}
              >
                <Text style={styles.choiceText}>{q.question}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 10 }]}>Indice (optionnel)</Text>
            <TextInput
              value={questionHint ?? ""}
              onChangeText={onChangeHint}
              placeholder="Un indice pour vous rappeler la réponse"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <TouchableOpacity style={styles.btn} onPress={onSaveHint}>
              <Text style={styles.btnText}>Enregistrer l'indice</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 12 }]}>Réponse (saisie sécurisée)</Text>
            <TextInput
              value={plainAnswer}
              onChangeText={setPlainAnswer}
              placeholder="Entrez la réponse pour la hacher"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              style={styles.input}
            />
            <TouchableOpacity style={styles.btn} onPress={onSaveAnswer}>
              <Text style={styles.btnText}>Enregistrer la réponse</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Authentification</Text>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.label}>Empreinte / Face ID</Text>
            <Text style={styles.desc}>Utiliser la biométrie si disponible</Text>
          </View>
          <Switch value={s.fingerprintAuthEnabled} onValueChange={onToggleFingerprint} thumbColor={colors.accent} />
        </View>

        <Text style={styles.sectionTitle}>Verrouillage</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Verrouiller après (minutes)</Text>
          <TextInput
            keyboardType="number-pad"
            value={lockTimeoutText}
            onChangeText={onChangeLockTimeout}
            onEndEditing={onLockTimeoutEndEditing}
            onBlur={onLockTimeoutEndEditing}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <Text style={styles.sectionTitle}>Langue</Text>
        <View style={styles.card}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, s.language === "fr" && styles.langBtnActive]}
              onPress={() => onSetLanguage("fr")}
            >
              <Text style={styles.langText}>Français</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, s.language === "en" && styles.langBtnActive]}
              onPress={() => onSetLanguage("en")}
            >
              <Text style={styles.langText}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, s.language === "es" && styles.langBtnActive]}
              onPress={() => onSetLanguage("es")}
            >
              <Text style={styles.langText}>Español</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Export / Import */}
        <Text style={styles.sectionTitle}>Export / Import</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Exporter</Text>
          <Text style={styles.desc}>Vous pouvez exporter toutes les données ou uniquement une catégorie.</Text>
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={handleExportAll}>
              <Text style={styles.btnText}>Exporter tout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { flex: 1 }]}
              onPress={handleExportSelectedCategories}
            >
              <Text style={styles.btnText}>Exporter sélection</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Sélectionner une catégorie</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => toggleExportCategory(null)}
              style={[styles.choice, selectedExportCategoryIds.includes("__uncategorized") && styles.choiceActive]}
            >
              <Text style={styles.choiceText}>Sans catégorie</Text>
            </TouchableOpacity>
            {categories.map((c: Category) => {
              const key = c.id ?? "__uncategorized";
               return (
                 <TouchableOpacity
                   key={c.id}
                   onPress={() => toggleExportCategory(key)}
                   style={[styles.choice, selectedExportCategoryIds.includes(key) && styles.choiceActive]}
                 >
                   <Text style={styles.choiceText}>{c.name}</Text>
                 </TouchableOpacity>
               );
             })}
          </View>

          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={handleImport}>
              <Text style={styles.btnText}>Importer JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 8 },
  backBtn: { padding: 8, marginRight: 8 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  rowLeft: { flex: 1, paddingRight: 12 },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  desc: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: colors.card, padding: 12, borderRadius: 10, marginBottom: 12 },
  choice: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, backgroundColor: "transparent" },
  choiceActive: { backgroundColor: "rgba(30,144,255,0.12)" },
  choiceText: { color: colors.textPrimary },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    backgroundColor: "#083045",
  },
  btn: { marginTop: 10, backgroundColor: colors.accent, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  langRow: { flexDirection: "row", justifyContent: "space-between" },
  langBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, marginRight: 8, backgroundColor: "transparent", alignItems: "center" },
  langBtnActive: { backgroundColor: "rgba(30,144,255,0.12)" },
  langText: { color: colors.textPrimary, fontWeight: "600" },
});

export default Settings;

