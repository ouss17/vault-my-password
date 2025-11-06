import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as Crypto from "expo-crypto";
import type { AppDispatch } from "../store";
import { addCategory } from "./categoriesSlice";
import { addPassword } from "./pwdSlice";

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
  // true until we run first-run initialization
  isFirstLaunch: boolean;
  // true until user selects language on first run
  needsLanguageSetup: boolean;
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
  isFirstLaunch: true,
  needsLanguageSetup: true,
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
    // mark first launch as done
    setFirstLaunchDone(state) {
      state.isFirstLaunch = false;
    },
    setNeedsLanguageSetup(state, action: PayloadAction<boolean>) {
      state.needsLanguageSetup = action.payload;
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
  setFirstLaunchDone,
  setNeedsLanguageSetup,
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

// Thunk: on first app open, create some default categories then mark first launch done.
export const initializeFirstRun = () => async (dispatch: AppDispatch, getState: () => any) => {
  const s = getState();
  if (!s?.settings?.isFirstLaunch) return;
  // If we still need to ask language, do not create defaults yet.
  if (s?.settings?.needsLanguageSetup) return;

  const now = Date.now();
  // choose localized category names according to current language
  const lang: string = (s?.settings?.language as string) ?? "fr";
  const namesByLang: Record<string, string[]> = {
    fr: ["Personnel", "Travail", "Email", "Finance", "Réseaux sociaux", "Divers"],
    en: ["Personal", "Work", "Email", "Finance", "Social", "Misc"],
    es: ["Personal", "Trabajo", "Correo", "Finanzas", "Social", "Varios"],
  };
  const names = namesByLang[lang] ?? namesByLang["en"];
  const defaults = [
    // keep a stable id + store a nameKey so UI can translate on the fly
    { id: "personalFL", name: names[0], nameKey: "category.personal", createdAt: now, updatedAt: now },
    { id: "workFL", name: names[1], nameKey: "category.work", createdAt: now, updatedAt: now },
    { id: "emailFL", name: names[2], nameKey: "category.email", createdAt: now, updatedAt: now },
    { id: "financeFL", name: names[3], nameKey: "category.finance", createdAt: now, updatedAt: now },
    { id: "socialFL", name: names[4], nameKey: "category.social", createdAt: now, updatedAt: now },
    { id: "miscFL", name: names[5], nameKey: "category.misc", createdAt: now, updatedAt: now },
  ];

  const existingCats = Array.isArray(s?.categories?.items) ? s.categories.items : [];
  const existingIds = new Set(existingCats.map((c: any) => c.id));
  const existingNames = new Set(existingCats.map((c: any) => (c.name ?? "").toString().trim().toLowerCase()));
  for (const c of defaults) {
    const lname = (c.name ?? "").toString().trim().toLowerCase();
    if (existingIds.has(c.id) || existingNames.has(lname)) continue;
    dispatch(addCategory(c as any));
  }

  // Only add example passwords if there are no passwords yet.
  const pwdCount = Array.isArray(s?.passwords?.items) ? s.passwords.items.length : 0;
  if (pwdCount === 0) {
    // localized example entries (only for a subset of categories) + nameKey for i18n
    const examplesByLang: Record<
      string,
      { name: string; nameKey?: string; username?: string; mdp: string; categoryId?: string }[]
    > = {
      fr: [
        { name: "Gmail (exemple)", nameKey: "example.gmail", username: "vous@exemple.com", mdp: "MotDePasseExemple123!", categoryId: "emailFL" },
        { name: "Compte pro (exemple)", nameKey: "example.work", username: "prenom.nom@entreprise.com", mdp: "ProPass!2024", categoryId: "workFL" },
        { name: "Banque (exemple)", nameKey: "example.bank", username: "client123", mdp: "Fin@nc3Exemple", categoryId: "financeFL" },
      ],
      en: [
        { name: "Gmail (example)", nameKey: "example.gmail", username: "you@example.com", mdp: "ExamplePassword123!", categoryId: "emailFL" },
        { name: "Work account (example)", nameKey: "example.work", username: "first.last@company.com", mdp: "WorkPass!2024", categoryId: "workFL" },
        { name: "Bank (example)", nameKey: "example.bank", username: "client123", mdp: "Fin@nc3Example", categoryId: "financeFL" },
      ],
      es: [
        { name: "Gmail (ejemplo)", nameKey: "example.gmail", username: "tu@ejemplo.com", mdp: "ContrasenaEjemplo123!", categoryId: "emailFL" },
        { name: "Cuenta trabajo (ejemplo)", nameKey: "example.work", username: "nombre.apellido@empresa.com", mdp: "WorkPass!2024", categoryId: "workFL" },
        { name: "Banco (ejemplo)", nameKey: "example.bank", username: "cliente123", mdp: "Fin@nc3Ejemplo", categoryId: "financeFL" },
      ],
    };

    const examples = examplesByLang[lang] ?? examplesByLang["en"];
    // use nameKey when present so displayed title follows app language
    for (const e of examples) {
      dispatch(
        addPassword({
          name: e.name, // fallback stored name
          nameKey: e.nameKey ?? undefined,
          username: e.username,
          mdp: e.mdp,
          categoryId: e.categoryId,
        } as any)
      );
    }
  }

  dispatch(setFirstLaunchDone());
};

// Called after the user selects language on first run.
// Creates localized categories & examples, and marks first launch done.
export const finalizeFirstRun =
  (lang: Language) =>
  async (dispatch: AppDispatch, getState: () => any) => {
    const s = getState();
    if (!s?.settings?.isFirstLaunch) return;

    const now = Date.now();
    const namesByLang: Record<string, string[]> = {
      fr: ["Personnel", "Travail", "Email", "Finance", "Réseaux sociaux", "Divers"],
      en: ["Personal", "Work", "Email", "Finance", "Social", "Misc"],
      es: ["Personal", "Trabajo", "Correo", "Finanzas", "Social", "Varios"],
    };
    const names = namesByLang[lang] ?? namesByLang["en"];
    const defaults = [
      { id: "personalFL", name: names[0], nameKey: "category.personal", createdAt: now, updatedAt: now },
      { id: "workFL", name: names[1], nameKey: "category.work", createdAt: now, updatedAt: now },
      { id: "emailFL", name: names[2], nameKey: "category.email", createdAt: now, updatedAt: now },
      { id: "financeFL", name: names[3], nameKey: "category.finance", createdAt: now, updatedAt: now },
      { id: "socialFL", name: names[4], nameKey: "category.social", createdAt: now, updatedAt: now },
      { id: "miscFL", name: names[5], nameKey: "category.misc", createdAt: now, updatedAt: now },
    ];

    const existingCats = Array.isArray(s?.categories?.items) ? s.categories.items : [];
    const existingIds = new Set(existingCats.map((c: any) => c.id));
    const existingNames = new Set(existingCats.map((c: any) => (c.name ?? "").toString().trim().toLowerCase()));
    for (const c of defaults) {
      const lname = (c.name ?? "").toString().trim().toLowerCase();
      if (existingIds.has(c.id) || existingNames.has(lname)) continue;
      dispatch(addCategory(c as any));
    }

    // Only add example passwords if there are no passwords yet.
    const pwdCount = Array.isArray(s?.passwords?.items) ? s.passwords.items.length : 0;
    if (pwdCount === 0) {
      const examplesByLang: Record<
        string,
        { name: string; nameKey?: string; username?: string; mdp: string; categoryId?: string }[]
      > = {
        fr: [
          { name: "Gmail (exemple)", nameKey: "example.gmail", username: "vous@exemple.com", mdp: "MotDePasseExemple123!", categoryId: "emailFL" },
          { name: "Compte pro (exemple)", nameKey: "example.work", username: "prenom.nom@entreprise.com", mdp: "ProPass!2024", categoryId: "workFL" },
          { name: "Banque (exemple)", nameKey: "example.bank", username: "client123", mdp: "Fin@nc3Exemple", categoryId: "financeFL" },
        ],
        en: [
          { name: "Gmail (example)", nameKey: "example.gmail", username: "you@example.com", mdp: "ExamplePassword123!", categoryId: "emailFL" },
          { name: "Work account (example)", nameKey: "example.work", username: "first.last@company.com", mdp: "WorkPass!2024", categoryId: "workFL" },
          { name: "Bank (example)", nameKey: "example.bank", username: "client123", mdp: "Fin@nc3Example", categoryId: "financeFL" },
        ],
        es: [
          { name: "Gmail (ejemplo)", nameKey: "example.gmail", username: "tu@ejemplo.com", mdp: "ContrasenaEjemplo123!", categoryId: "emailFL" },
          { name: "Cuenta trabajo (ejemplo)", nameKey: "example.work", username: "nombre.apellido@empresa.com", mdp: "WorkPass!2024", categoryId: "workFL" },
          { name: "Banco (ejemplo)", nameKey: "example.bank", username: "cliente123", mdp: "Fin@nc3Ejemplo", categoryId: "financeFL" },
        ],
      };
      const examples = examplesByLang[lang] ?? examplesByLang["en"];
      for (const e of examples) {
        dispatch(
          addPassword({
            name: e.name,
            nameKey: e.nameKey ?? undefined,
            username: e.username,
            mdp: e.mdp,
            categoryId: e.categoryId,
          } as any)
        );
      }
    }

    // mark language setup done and first launch completed
    dispatch(setLanguage(lang));
    dispatch(setNeedsLanguageSetup(false));
    dispatch(setFirstLaunchDone());
  };