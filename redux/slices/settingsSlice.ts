import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as Crypto from "expo-crypto";
import type { AppDispatch } from "../store";

export type Language = "fr" | "en" | "es";

export interface SettingsState {
  questionAuthEnabled: boolean;
  selectedQuestionId: string | null;
  questionHint: string | null;
  questionAnswer: string | null;
  fingerprintAuthEnabled: boolean;
  lockTimeoutMinutes: number;
  // mark passwords considered "old" after threshold (value + unit)
  oldPasswordMarkerEnabled: boolean;
  oldPasswordThresholdValue: number;
  oldPasswordThresholdUnit: "days" | "months" | "years";
  language: Language;
}

const initialState: SettingsState = {
  questionAuthEnabled: false,
  selectedQuestionId: null,
  questionHint: null,
  questionAnswer: null,
  fingerprintAuthEnabled: false,
  lockTimeoutMinutes: 5,
  oldPasswordMarkerEnabled: false,
  oldPasswordThresholdValue: 12,
  oldPasswordThresholdUnit: "months",
  language: "fr",
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setQuestionAuthEnabled(state, action: PayloadAction<boolean>) {
      state.questionAuthEnabled = action.payload;
      if (!action.payload) {
        state.questionAnswer = null;
        state.questionHint = null;
      }
    },
    setSelectedQuestionId(state, action: PayloadAction<string | null>) {
      state.selectedQuestionId = action.payload;
    },
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
      const mins = Math.max(1, Math.floor(action.payload));
      state.lockTimeoutMinutes = mins;
    },
    setOldPasswordMarkerEnabled(state, action: PayloadAction<boolean>) {
      state.oldPasswordMarkerEnabled = action.payload;
    },
    setOldPasswordThresholdValue(state, action: PayloadAction<number>) {
      state.oldPasswordThresholdValue = Math.max(1, Math.floor(action.payload));
    },
    setOldPasswordThresholdUnit(state, action: PayloadAction<"days" | "months" | "years">) {
      state.oldPasswordThresholdUnit = action.payload;
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
  setOldPasswordMarkerEnabled,
  setOldPasswordThresholdValue,
  setOldPasswordThresholdUnit,
  setLanguage,
  clearSensitiveData,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
export const saveQuestionAnswerHashed = (answer: string | null) => async (dispatch: AppDispatch) => {
  if (answer == null) {
    dispatch(setQuestionAnswer(null));
    return;
  }
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, answer);
  dispatch(setQuestionAnswer(hash));
};