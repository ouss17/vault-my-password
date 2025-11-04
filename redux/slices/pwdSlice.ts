import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";
import CryptoJS from "crypto-js";
import type { AppDispatch } from "../store";

export interface PasswordItem {
  id: string;
  name: string;
  website?: string;
  username?: string;
  mdp: string;
  categoryId?: string;
  notes?: string;
  favorite?: boolean;
  createdAt: number;
  updatedAt?: number;
}

interface PwdState {
  items: PasswordItem[];
}

const initialState: PwdState = {
  items: [],
};

const pwdSlice = createSlice({
  name: "passwords",
  initialState,
  reducers: {
    
    addPassword(state, action: PayloadAction<Omit<Partial<PasswordItem>, "id" | "createdAt"> & { mdp: string; name?: string }>) {
      const now = Date.now();
      const payload = action.payload;
      const item: PasswordItem = {
        id: nanoid(),
        name: payload.name ?? "",
        website: payload.website,
        username: payload.username,
        mdp: payload.mdp, 
        categoryId: payload.categoryId,
        notes: payload.notes,
        favorite: payload.favorite ?? false,
        createdAt: now,
        updatedAt: now,
      };
      state.items.push(item);
    },
    updatePassword(state, action: PayloadAction<{ id: string; changes: Partial<Omit<PasswordItem, "id" | "createdAt">> }>) {
      const { id, changes } = action.payload;
      const i = state.items.findIndex((p) => p.id === id);
      if (i >= 0) {
        state.items[i] = {
          ...state.items[i],
          ...changes,
          updatedAt: Date.now(),
        };
      }
    },
    deletePassword(state, action: PayloadAction<string>) {
      state.items = state.items.filter((p) => p.id !== action.payload);
    },
    setPasswords(state, action: PayloadAction<PasswordItem[]>) {
      state.items = action.payload;
    },
    clearPasswords(state) {
      state.items = [];
    },
    upsertPassword(state, action: PayloadAction<PasswordItem>) {
      const incoming = action.payload;
      const idx = state.items.findIndex((p) => p.id === incoming.id);
      if (idx >= 0) {
        state.items[idx] = { ...state.items[idx], ...incoming, updatedAt: Date.now() };
      } else {
        state.items.push(incoming);
      }
    },
    
    removePasswordsByCategory(state, action: PayloadAction<string | null>) {
      const cid = action.payload;
      state.items = state.items.filter((p) => (p.categoryId ?? null) !== cid);
    },
    
    removePassword(state, action: PayloadAction<string>) {
      state.items = state.items.filter((p) => p.id !== action.payload);
    },
  },
});

export const { addPassword, updatePassword, deletePassword, setPasswords, clearPasswords, upsertPassword, removePasswordsByCategory, removePassword } =
  pwdSlice.actions;

export default pwdSlice.reducer;


export const encryptText = (plain: string, key: string) => {
  return CryptoJS.AES.encrypt(plain, key).toString();
};

export const decryptText = (cipherText: string, key: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch {
    return null;
  }
};

export const addPasswordEncrypted =
  (payload: Omit<Partial<PasswordItem>, "id" | "createdAt"> & { mdp: string; name?: string }, encryptionKey: string) =>
  async (dispatch: AppDispatch) => {
    const encrypted = encryptText(payload.mdp, encryptionKey);
    const toDispatch = { ...payload, mdp: encrypted } as any;
    dispatch(addPassword(toDispatch));
  };

export const updatePasswordEncrypted =
  (id: string, changes: Partial<Omit<PasswordItem, "id" | "createdAt">> & { mdp?: string }, encryptionKey: string) =>
  async (dispatch: AppDispatch) => {
    const patched = { ...changes } as any;
    if (changes.mdp != null) {
      patched.mdp = encryptText(changes.mdp, encryptionKey);
    }
    dispatch(updatePassword({ id, changes: patched }));
  };

export const revealPasswordById =
  (id: string, encryptionKey: string) =>
  async (dispatch: AppDispatch, getState: () => { passwords: PwdState }) => {
    const state = getState();
    const item = state.passwords.items.find((p) => p.id === id);
    if (!item) return null;
    return decryptText(item.mdp, encryptionKey);
  };