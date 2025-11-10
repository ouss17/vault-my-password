import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Tag = {
  id: string;
  name: string;
  categoryId?: string | null;
  createdAt?: number;
  updatedAt?: number;
  order?: number;
};

const initialState: { items: Tag[] } = {
  items: [],
};

const tagsSlice = createSlice({
  name: "tags",
  initialState,
  reducers: {
    setTags(state, action: PayloadAction<Tag[]>) {
      state.items = action.payload.map((t, i) => ({ ...t, order: t.order ?? i }));
    },
    addTag(state, action: PayloadAction<Tag>) {
      state.items.push(action.payload);
    },
    upsertTag(state, action: PayloadAction<Tag>) {
      const incoming = action.payload;
      const idx = state.items.findIndex((t) => t.id === incoming.id);
      if (idx >= 0) state.items[idx] = { ...state.items[idx], ...incoming };
      else state.items.push(incoming);
    },
    removeTag(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
    removeTagsByCategory(state, action: PayloadAction<string | null>) {
      const cid = action.payload;
      state.items = state.items.filter((t) => (t.categoryId ?? null) !== cid);
    },
  },
});

export const { setTags, addTag, upsertTag, removeTag, removeTagsByCategory } = tagsSlice.actions;
export default tagsSlice.reducer;