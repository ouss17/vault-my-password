import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";

export interface Category {
  id: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
}

interface CategoriesState {
  items: Category[];
}

const initialState: CategoriesState = {
  items: [],
};

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    addCategory(state, action: PayloadAction<{ name: string }>) {
      const now = Date.now();
      state.items.push({
        id: nanoid(),
        name: action.payload.name,
        createdAt: now,
        updatedAt: now,
      });
    },
    updateCategory(state, action: PayloadAction<{ id: string; changes: Partial<Omit<Category, "id" | "createdAt">> }>) {
      const { id, changes } = action.payload;
      const idx = state.items.findIndex((c) => c.id === id);
      if (idx >= 0) {
        state.items[idx] = { ...state.items[idx], ...changes, updatedAt: Date.now() };
      }
    },
    deleteCategory(state, action: PayloadAction<string>) {
      state.items = state.items.filter((c) => c.id !== action.payload);
    },
    setCategories(state, action: PayloadAction<Category[]>) {
      state.items = action.payload;
    },
    clearCategories(state) {
      state.items = [];
    },
    upsertCategory(state, action: PayloadAction<Category>) {
      const incoming = action.payload;
      const idx = state.items.findIndex((c) => c.id === incoming.id);
      if (idx >= 0) {
        state.items[idx] = { ...state.items[idx], ...incoming, updatedAt: Date.now() };
      } else {
        state.items.push(incoming);
      }
    },
  },
});

export const { addCategory, updateCategory, deleteCategory, setCategories, clearCategories, upsertCategory } =
  categoriesSlice.actions;

export default categoriesSlice.reducer;