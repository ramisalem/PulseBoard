import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQueueStore } from '../store/queueStore';
import { syncManager } from '../services/syncManager';
import type { QueuedOperation } from '@typings/offlineQueue';

export const PendingOperationsScreen = () => {
  const { pendingOps, loadPendingOps, discardOp, discardAllOps } =
    useQueueStore();
  const [isSyncing, setIsSyncing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadPendingOps();
    }, [loadPendingOps]),
  );

  const handleRetryNow = async () => {
    if (pendingOps.length === 0) return;
    setIsSyncing(true);
    try {
      await syncManager.triggerSync();
      loadPendingOps(); // Refresh after sync
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiscardAll = () => {
    if (pendingOps.length === 0) return;
    Alert.alert(
      'Discard All',
      'Are you sure you want to delete all pending offline changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard All', style: 'destructive', onPress: discardAllOps },
      ],
    );
  };

  const renderItem = ({ item }: { item: QueuedOperation }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.type}>
          {item.operation_type.replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.metric}>
          Metric: {item.metric_id.slice(0, 8)}...
        </Text>
        <Text style={styles.time}>
          Created: {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.discardBtn}
        onPress={() => discardOp(item.id)}
        testID={`discard-btn-${item.id}`}
      >
        <Text style={styles.discardText}>Discard</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container} testID="pending-ops-screen">
      <View style={styles.header}>
        <Text style={styles.title}>
          Pending Operations ({pendingOps.length})
        </Text>
        <View style={styles.headerButtons}>
          {pendingOps.length > 0 && (
            <>
              <TouchableOpacity
                onPress={handleRetryNow}
                style={styles.retryBtn}
                disabled={isSyncing}
                testID="retry-now-button"
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Text style={styles.retryText}>Retry Now</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDiscardAll}>
                <Text style={styles.discardAllText}>Discard All</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {pendingOps.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No pending operations</Text>
        </View>
      ) : (
        <FlatList
          data={pendingOps}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: '#F9FAFB', fontSize: 20, fontWeight: 'bold' },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  discardAllText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 16 },
  list: { paddingBottom: 24 },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  info: { flex: 1 },
  type: {
    color: '#F9FAFB',
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  metric: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  time: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  discardBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  discardText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold' },
});
