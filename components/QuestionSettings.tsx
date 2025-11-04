import { questions } from "@/datas/questions";
import { saveQuestionAnswerHashed, setQuestionHint, setSelectedQuestionId } from "@/redux/slices/settingsSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import { useT } from "@/utils/useText";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

const colors = {
  textPrimary: "#e6f7ff",
  textSecondary: "#9ec5ea",
  accent: "#1e90ff",
  border: "rgba(255,255,255,0.04)",
  inputBg: "#083045",
};

export default function QuestionSettings() {
  const dispatch = useDispatch<AppDispatch>();
  const s = useSelector((st: RootState) => st.settings);
  const t = useT();

  const [questionHint, setQuestionHintLocal] = useState<string | null>(s.questionHint);
  const [plainAnswer, setPlainAnswer] = useState<string>("");

  const focusedFieldRef = useRef<"hint" | "answer" | null>(null);
  const processingAnswerRef = useRef<boolean>(false);

  useEffect(() => {
    setQuestionHintLocal(s.questionHint);
  }, [s.questionHint]);

  useEffect(() => {
    const onHide = () => {
      const f = focusedFieldRef.current;
      if (f === "hint") {
        handleHintSave();
      } else if (f === "answer") {
        handleAnswerSave();
      }
      focusedFieldRef.current = null;
    };
    const sub = Keyboard.addListener("keyboardDidHide", onHide);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionHint, plainAnswer, s.questionAnswer]);

  const handleHintSave = () => {
    const current = questionHint ?? null;
    if ((current ?? "") === (s.questionHint ?? "")) return;
    dispatch(setQuestionHint(current));
    Alert.alert(t("question.hint.saved"));
  };

  const handleAnswerSave = async () => {
    const trimmed = plainAnswer.trim();
    if (!trimmed) return;
    if (processingAnswerRef.current) return;
    processingAnswerRef.current = true;

    const hasExisting = !!s.questionAnswer;
    const message = hasExisting ? t("question.confirmOverwrite") : t("question.confirmSave");

    Alert.alert(t("question.confirmSave"), message, [
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
            Alert.alert(t("question.saveSuccess.title"), t("question.saveSuccess.message"));
          } catch (err) {
            console.error("Save answer error:", err);
            Alert.alert(t("alert.error.title"), t("question.saveError"));
          } finally {
            processingAnswerRef.current = false;
          }
        },
      },
    ]);
  };

  const onSelectQuestion = (id: string) => {
    dispatch(setSelectedQuestionId(id));
  };

  return (
    <View>
      <Text style={localStyles.label}>{t("question.label")}</Text>
      {questions.map((q) => (
        <TouchableOpacity
          key={q.id}
          style={[localStyles.choice, s.selectedQuestionId === q.id && localStyles.choiceActive]}
          onPress={() => onSelectQuestion(q.id)}
        >
          <Text style={localStyles.choiceText}>{t(`questions.${q.id}`)}</Text>
        </TouchableOpacity>
      ))}

      <Text style={[localStyles.label, { marginTop: 10 }]}>{t("question.hint.label")}</Text>
      <TextInput
        value={questionHint ?? ""}
        onChangeText={setQuestionHintLocal}
        placeholder={t("question.hint.placeholder")}
        placeholderTextColor={colors.textSecondary}
        style={localStyles.input}
        onFocus={() => {
          focusedFieldRef.current = "hint";
        }}
        onSubmitEditing={() => {
          focusedFieldRef.current = null;
          handleHintSave();
        }}
        onBlur={() => {
          focusedFieldRef.current = null;
        }}
      />
      <TouchableOpacity
        style={localStyles.btn}
        onPress={() => {
          focusedFieldRef.current = null;
          handleHintSave();
        }}
      >
        <Text style={localStyles.btnText}>{t("question.hint.save")}</Text>
      </TouchableOpacity>

      <Text style={[localStyles.label, { marginTop: 12 }]}>{t("question.answer.label")}</Text>
      <TextInput
        value={plainAnswer}
        onChangeText={setPlainAnswer}
        placeholder={t("question.answer.placeholder")}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        style={localStyles.input}
        onSubmitEditing={() => {
          focusedFieldRef.current = null;
          handleAnswerSave();
        }}
        onFocus={() => {
          focusedFieldRef.current = "answer";
        }}
        onBlur={() => {
          focusedFieldRef.current = null;
        }}
      />
      <TouchableOpacity
        style={localStyles.btn}
        onPress={() => {
          focusedFieldRef.current = null;
          handleAnswerSave();
        }}
      >
        <Text style={localStyles.btnText}>{t("question.answer.save")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const localStyles = StyleSheet.create({
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
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
    backgroundColor: colors.inputBg,
  },
  btn: { marginTop: 10, backgroundColor: colors.accent, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});