import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import categoriesReducer from './slices/categoriesSlice'; // ajouté
import pwdReducer from './slices/pwdSlice';
import settingsReducer from './slices/settingsSlice';
/**
 * Combine tous les reducers de l'application.
 */
const rootReducer = combineReducers({
  settings: settingsReducer,
  passwords: pwdReducer,
  categories: categoriesReducer, // ajouté
});


/**
 * Configuration de la persistance Redux.
 */
const rootPersistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // persister settings + passwords + categories (ajoutez 'app' si vous avez ajouté appSlice)
  whitelist: ['settings', 'passwords', 'categories'],
};


/**
 * Applique la persistance Redux sur le rootReducer.
 */
const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

/**
 * Configure le store Redux avec la persistance et désactive le serializableCheck.
 */
export const store = configureStore({
  reducer: persistReducer(rootPersistConfig, rootReducer),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist ajoute des actions non-serialisables; ignorez-les
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

/**
 * Persiste le store Redux (sauvegarde/restaure l'état).
 */
export const persistor = persistStore(store);

/**
 * Types utilitaires pour l'application.
 * - RootState : type de l'état global Redux
 * - AppDispatch : type du dispatch Redux
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;