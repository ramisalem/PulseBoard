import React, { useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useMetricsStore } from '../store/metricsStore';
import { useMetricsWebSocket } from '../hooks/useMetricsWebSocket';
import { MetricCard } from './MetricCard';
import { ConnectionStatus } from './ConnectionStatus';
import type { MetricSnapshot } from '@typings/metrics';
import { apiClient } from '@core/api/client';

export const DashboardScreen = () => {
  const { connect, disconnect } = useMetricsWebSocket();
  const { metrics, mergeSnapshot } = useMetricsStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const { refetch, isRefetching } = useQuery({
    queryKey: ['metricsSnapshot'],
    queryFn: async () => {
      const { data } = await apiClient.get<MetricSnapshot>('/metrics/snapshot');
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const handleRefresh = useCallback(async () => {
    const result = await refetch();
    if (result.data) {
      mergeSnapshot(result.data.metrics);
    }
  }, [refetch, mergeSnapshot]);

  const metricsArray = useMemo(() => Object.values(metrics), [metrics]);

  const handleCardPress = useCallback((id: string) => {
    console.log('Pressed metric:', id);
  }, []);

  return (
    <View style={styles.container} testID="dashboard-screen">
      <View style={styles.statusBar}>
        <ConnectionStatus />
      </View>

      <FlashList
        data={metricsArray}
        renderItem={({ item }) => (
          <MetricCard metric={item} onPress={handleCardPress} />
        )}
        keyExtractor={item => item.id}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  statusBar: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listContent: { paddingBottom: 24 },
});
