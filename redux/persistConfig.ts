import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistConfig } from "redux-persist";

export const persistConfig: PersistConfig<any> = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["settings", "passwords", "categories"],
};
