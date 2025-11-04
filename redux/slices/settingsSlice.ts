import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as Crypto from "expo-crypto";
import type { AppDispatch } from "../store";

export type Language = "fr" | "en" | "es";

export interface SettingsState {
  // activer la validation par question secrète
  questionAuthEnabled: boolean;
  // id de la question choisie (voir datas/questions.ts)
  selectedQuestionId: string | null;
  // indice associé à la réponse (hint)
  questionHint: string | null;
  // stocke le hash de la réponse
  questionAnswer: string | null;
  // activer l'authentification par empreinte
  fingerprintAuthEnabled: boolean;
  // temps avant verrouillage en minutes (défaut 5)
  lockTimeoutMinutes: number;
  // langue de l'utilisateur
  language: Language;
}

const initialState: SettingsState = {
  questionAuthEnabled: false,
  selectedQuestionId: null,
  questionHint: null,
  questionAnswer: null,
  fingerprintAuthEnabled: false,
  lockTimeoutMinutes: 5,
  language: "fr",
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setQuestionAuthEnabled(state, action: PayloadAction<boolean>) {
      state.questionAuthEnabled = action.payload;
      if (!action.payload) {
        // si on désactive, on supprime la réponse et l'indice pour plus de sécurité
        state.questionAnswer = null;
        state.questionHint = null;
      }
    },
    setSelectedQuestionId(state, action: PayloadAction<string | null>) {
      state.selectedQuestionId = action.payload;
    },
    // stocke déjà le hash (ne pas faire de traitement async dans le reducer)
    setQuestionAnswer(state, action: PayloadAction<string | null>) {
      state.questionAnswer = action.payload;
    },
    setQuestionHint(state, action: PayloadAction<string | null>) {
      state.questionHint = action.payload;
    },
    setFingerprintAuthEnabled(state, action: PayloadAction<boolean>) {
      state.fingerprintAuthEnabled = action.payload;
    },
    setLockTimeoutMinutes(state, action: PayloadAction<number>) {
      const mins = Math.max(1, Math.floor(action.payload)); // minimum 1 minute
      state.lockTimeoutMinutes = mins;
    },
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload;
    },
    clearSensitiveData(state) {
      state.questionAnswer = null;
      state.questionHint = null;
    },
    resetSettings() {
      return initialState;
    },
  },
});

export const {
  setQuestionAuthEnabled,
  setSelectedQuestionId,
  setQuestionAnswer,
  setQuestionHint,
  setFingerprintAuthEnabled,
  setLockTimeoutMinutes,
  setLanguage,
  clearSensitiveData,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;

// thunk: hash la réponse (SHA-256) avant de la stocker
export const saveQuestionAnswerHashed = (answer: string | null) => async (dispatch: AppDispatch) => {
  if (answer == null) {
    dispatch(setQuestionAnswer(null));
    return;
  }
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, answer);
  dispatch(setQuestionAnswer(hash));
};