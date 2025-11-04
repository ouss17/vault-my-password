import type { RootState } from "@/redux/store";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { removePasswordsByCategory } from "./pwdSlice";

// include optional timestamps so UI/other code can store them
export type Category = { id: string; name: string; createdAt?: number; updatedAt?: number };

const initialState: { items: Category[] } = {
  items: [],
};

// thunk: delete category and related passwords atomically, returns removed data for undo
export const deleteCategoryAndPasswords = createAsyncThunk<
  { removedCategory: Category | null; removedPasswords: any[] },
  string,
  { state: RootState }
>("categories/deleteCategoryAndPasswords", async (categoryId, thunkAPI) => {
  const state = thunkAPI.getState();
  const existing = state.categories.items;
  const passwords = state.passwords.items;

  const removedCategory = existing.find((c : Category) => c.id === categoryId) ?? null;
  const removedPasswords = passwords.filter((p : any) => (p.categoryId ?? null) === categoryId);

  // dispatch removals
  // remove passwords first, then category
  thunkAPI.dispatch(removePasswordsByCategory(categoryId));
  thunkAPI.dispatch(categoriesSlice.actions.removeCategory(categoryId));

  return { removedCategory, removedPasswords };
});

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    setCategories(state, action: PayloadAction<Category[]>) {
      state.items = action.payload;
    },
    addCategory(state, action: PayloadAction<Category>) {
      state.items.push(action.payload);
    },
    // upsert: insert or update category by id
    upsertCategory(state, action: PayloadAction<Category>) {
      const incoming = action.payload;
      const idx = state.items.findIndex((c) => c.id === incoming.id);
      if (idx >= 0) {
        state.items[idx] = { ...state.items[idx], ...incoming };
      } else {
        state.items.push(incoming);
      }
    },
     // remove a category by id
     removeCategory(state, action: PayloadAction<string>) {
       state.items = state.items.filter((c) => c.id !== action.payload);
     },
   },
  // no extraReducers needed unless you want to handle pending/fulfilled for UX
});

export const { setCategories, addCategory, upsertCategory, removeCategory } = categoriesSlice.actions;
export default categoriesSlice.reducer;