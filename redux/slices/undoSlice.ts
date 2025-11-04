import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PasswordItem } from "./pwdSlice";

export type CategoryBackup = { id: string; name: string };

type LastDeleted = {
  category: CategoryBackup;
  passwords: PasswordItem[];
  deletedAt: number;
  expiresAt: number;
} | null;

interface UndoState {
  lastDeleted: LastDeleted;
}

const initialState: UndoState = {
  lastDeleted: null,
};

const undoSlice = createSlice({
  name: "undo",
  initialState,
  reducers: {
    setLastDeleted(state, action: PayloadAction<NonNullable<LastDeleted>>) {
      state.lastDeleted = action.payload;
    },
    clearLastDeleted(state) {
      state.lastDeleted = null;
    },
  },
});

export const { setLastDeleted, clearLastDeleted } = undoSlice.actions;
export default undoSlice.reducer;