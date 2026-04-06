import React, { useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMetricsStore } from '../store/metricsStore';
import { useMetricsWebSocket } from '../hooks/useMetricsWebSocket';
import { useAuthStore } from '@features/auth/store/authStore';
import { MetricCard } from './MetricCard';
import { ConnectionStatus } from './ConnectionStatus';
import type { MetricSnapshot } from '@typings/metrics';
import type { RootStackParamList } from '../../../app/Navigation';
import { apiClient } from '@core/api/client';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Dashboard'
>;

export const DashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { connect, disconnect } = useMetricsWebSocket();
  const { metrics, mergeSnapshot } = useMetricsStore();
  const logout = useAuthStore(state => state.logout);

  useEffect(() => {
    connect();

    // --- START: TEMPORARY PERFORMANCE TEST ---

    // const fakeMetrics = Array.from({ length: 500 }, (_, i) => ({
    //   id: `stress-test-${i}`,
    //   name: `Stress Test Metric ${i}`,
    //   current_value: Math.random() * 100,
    //   previous_value: Math.random() * 100,
    //   delta: Math.random() * 10 - 5,
    //   alert_threshold: i % 10 === 0 ? 80 : null, // 10% of them are alerting
    //   is_alerting: false,
    //   sparkline: Array.from({ length: 50 }, () => Math.random() * 100),
    //   last_updated: new Date().toISOString(),
    // }));
    // mergeSnapshot(fakeMetrics);

    return () => disconnect();
  }, [connect, disconnect]);

  const {
    data: snapshotData,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['metricsSnapshot'],
    queryFn: async () => {
      const { data } = await apiClient.get<MetricSnapshot>('/metrics/snapshot');
      return data;
    },
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (snapshotData) {
      mergeSnapshot(snapshotData.metrics);
    }
  }, [snapshotData, mergeSnapshot]);

  const handleRefresh = useCallback(async () => {
    const result = await refetch();
    if (result.data) {
      mergeSnapshot(result.data.metrics);
    }
  }, [refetch, mergeSnapshot]);

  const metricsArray = useMemo(() => Object.values(metrics), [metrics]);

  const handleCardPress = useCallback(
    (id: string) => {
      navigation.navigate('MetricDetail', { metricId: id });
    },
    [navigation],
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          disconnect();
          await logout();
        },
      },
    ]);
  }, [disconnect, logout]);

  return (
    <View style={styles.container} testID="dashboard-screen">
      <View style={styles.statusBar}>
        <ConnectionStatus />
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.navigate('PendingOps')}>
            <Text style={styles.link}>Pending Ops</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {metricsArray.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No Metrics Available</Text>
          <Text style={styles.emptyText}>
            Connect to a server or wait for cached data to load.
          </Text>
        </View>
      ) : (
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
      )}
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  link: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: { paddingBottom: 24 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
});
