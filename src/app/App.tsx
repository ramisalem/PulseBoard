import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigation } from './Navigation';
import { useAuthStore } from '@features/auth/store/authStore';
import { runMigrations } from '@core/database/connection';

const queryClient = new QueryClient();

export const App = () => {
  const restoreSession = useAuthStore(state => state.restoreSession);

  useEffect(() => {
    runMigrations();
    restoreSession();
  }, [restoreSession]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <Navigation />
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};
