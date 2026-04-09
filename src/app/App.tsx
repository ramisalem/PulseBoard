import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigation } from './Navigation';
import { runMigrations } from '@core/database/connection';
import { syncManager } from '@features/offlineQueue/services/syncManager';
import { useMetricsStore } from '@features/metrics/store/metricsStore';
import { useAuthStore } from '@features/auth/store/authStore';
import { logger } from '@core/logger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
    },
  },
});

export const App = () => {
  const loadFromCache = useMetricsStore(state => state.loadFromCache);
  const restoreSession = useAuthStore(state => state.restoreSession);

  useEffect(() => {
    const init = async () => {
      runMigrations();
      logger.info('Database migrations completed');

      loadFromCache();
      logger.info('Loaded metrics from cache');

      await restoreSession();
      logger.info('Session restore completed');

      syncManager.start();
      logger.info('SyncManager started');
    };

    init();

    return () => {
      syncManager.stop();
      logger.info('SyncManager stopped');
    };
  }, [loadFromCache, restoreSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Navigation />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
};

export default App;
