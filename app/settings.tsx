import ExportAll from "@/components/ExportAll";
import ExportByCategory from "@/components/ExportByCategory";
import ImportData from "@/components/ImportData";
import { questions } from "@/datas/questions";
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
import { Ionicons } from "@expo/vector-icons";
// Use legacy filesystem API to avoid deprecation warning for writeAsStringAsync/readAsStringAsync.
// You can migrate later to the new File/Directory API as documented by Expo.
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
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

  // shared selected categories for export (controlled mode)
  const [exportSelectedIds, setExportSelectedIds] = useState<string[]>([]);

  // local lock timeout input to allow multi-digit typing before validation
  const [lockTimeoutText, setLockTimeoutText] = useState<string>(String(s.lockTimeoutMinutes ?? 5));
  useEffect(() => {
    setLockTimeoutText(String(s.lockTimeoutMinutes ?? 5));
  }, [s.lockTimeoutMinutes]);

  // local fields for editing sensitive values
  const [questionHint, setLocalQuestionHint] = useState<string | null>(s.questionHint);
  const [plainAnswer, setPlainAnswer] = useState<string>("");
  // track which field is currently focused so keyboard hide handler knows what to save
  const focusedFieldRef = useRef<"hint" | "answer" | null>(null);
  // guard to avoid duplicate handling when both onSubmitEditing and keyboardDidHide fire
  const processingAnswerRef = useRef<boolean>(false);

  useEffect(() => {
    setLocalQuestionHint(s.questionHint);
  }, [s.questionHint]);

  // keyboard hide handler: save hint or trigger answer save depending on focused field
  useEffect(() => {
    const onHide = () => {
      const f = focusedFieldRef.current;
      if (f === "hint") {
        // save hint automatically when keyboard closes while hint was focused
        handleHintSave();
      } else if (f === "answer") {
        // trigger the same confirmation as on submit
        handleAnswerSave();
      }
      // reset focus marker
      focusedFieldRef.current = null;
    };
    const sub = Keyboard.addListener("keyboardDidHide", onHide);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionHint, plainAnswer, s.questionAnswer]);

  // save hint helper
  const handleHintSave = () => {
    // only save if changed
    const current = questionHint ?? null;
    if ((current ?? "") === (s.questionHint ?? "")) {
      return;
    }
    dispatch(setQuestionHint(current));
    Alert.alert("Indice enregistré");
  };

  // ask confirmation and save answer (hashed). Protect from duplicate prompts.
  const handleAnswerSave = async () => {
    const trimmed = plainAnswer.trim();
    if (!trimmed) return;
    if (processingAnswerRef.current) return;
    processingAnswerRef.current = true;

    const hasExisting = !!s.questionAnswer;
    const message = hasExisting
      ? "Une réponse est déjà enregistrée. Confirmez-vous l'écrasement de l'ancienne réponse ?"
      : "Confirmez-vous l'enregistrement de cette réponse ?";

    Alert.alert("Confirmer la réponse", message, [
      {
        text: "Annuler",
        style: "cancel",
        onPress: () => {
          processingAnswerRef.current = false;
        },
      },
      {
        text: "Confirmer",
        onPress: async () => {
          try {
            await dispatch(saveQuestionAnswerHashed(trimmed));
            setPlainAnswer("");
            Alert.alert("Succès", "Réponse enregistrée en toute sécurité.");
          } catch (err) {
            console.error("Save answer error:", err);
            Alert.alert("Erreur", "Impossible d'enregistrer la réponse.");
          } finally {
            processingAnswerRef.current = false;
          }
        },
      },
    ]);
  };

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

  // import/export UI moved to dedicated components

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ ...styles.content, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
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
                onFocus={() => {
                  focusedFieldRef.current = "hint";
                }}
                onSubmitEditing={() => {
                  // user pressed "Done" / validate on keyboard
                  focusedFieldRef.current = null;
                  handleHintSave();
                }}
                onBlur={() => {
                  // clear focus marker (keyboardDidHide will also trigger saving when appropriate)
                  focusedFieldRef.current = null;
                }}
              />
              <TouchableOpacity
                style={styles.btn}
                onPress={() => {
                  // explicit save button uses same handler
                  focusedFieldRef.current = null;
                  handleHintSave();
                }}
              >
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
                // when pressing validation on keyboard -> ask confirmation
                onSubmitEditing={() => {
                  focusedFieldRef.current = null;
                  handleAnswerSave();
                }}
                // track focus so keyboardDidHide knows what to do
                onFocus={() => {
                  focusedFieldRef.current = "answer";
                }}
                onBlur={() => {
                  // don't immediately act on blur; keyboardDidHide will handle saving
                  focusedFieldRef.current = null;
                }}
              />
              <TouchableOpacity style={styles.btn} onPress={() => { focusedFieldRef.current = null; handleAnswerSave(); }}>
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
              <View style={{ flex: 1 }}>
                <ExportAll />
              </View>
              <View style={{ width: 8 }} />
              <View style={{ flex: 1 }}>
                {/* export selected button (uses shared selected state below) */}
                <ExportByCategory selected={exportSelectedIds} setSelected={setExportSelectedIds} showSelectors={false} showButton={true} />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Sélectionner une catégorie</Text>
            {/* selectors (share the same selected state) */}
            <ExportByCategory selected={exportSelectedIds} setSelected={setExportSelectedIds} showSelectors={true} showButton={false} />

            {/* importer placé sous les catégories */}
            <View style={{ marginTop: 12 }}>
              <ImportData />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

