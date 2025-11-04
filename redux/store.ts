import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import categoriesReducer from './slices/categoriesSlice';
import pwdReducer from './slices/pwdSlice';
import settingsReducer from './slices/settingsSlice';
/**
 * Combine tous les reducers de l'application.
 */
const rootReducer = combineReducers({
  settings: settingsReducer,
  passwords: pwdReducer,
  categories: categoriesReducer, 
});


/**
 * Configuration de la persistance Redux.
 */
const rootPersistConfig = {
  key: 'root',
  storage: AsyncStorage,
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
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

/**
 * Persiste le store Redux (sauvegarde/restaure l'état).
 */
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;