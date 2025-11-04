import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import "react-native-get-random-values";
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Ajout pour Redux
import UnlockGate from '@/components/UnlockGate';
import { persistor, store } from '@/redux/store';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

// new:

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {/* UnlockGate enveloppe toute l'app pour gérer l'auth et l'inactivité */}
          <UnlockGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="settings" />
            </Stack>
            <StatusBar style="auto" />
          </UnlockGate>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
