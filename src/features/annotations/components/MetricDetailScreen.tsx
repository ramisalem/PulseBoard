import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Button,
  Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/Navigation';
import { useMetricsStore } from '@features/metrics/store/metricsStore';
import { useAnnotationsStore } from '@features/annotations/store/annotationsStore';
import { useAnnotationsWebSocket } from '../hooks/useAnnotationsWebSocket';
import { useBiometricGate } from '@features/auth/hooks/useBiometricGate';
import { operationQueueDb } from '@features/offlineQueue/services/operationQueue';
import { FullChart } from './FullChart';
import { shareChartAsImage } from '../utils/shareChart';
import NetInfo from '@react-native-community/netinfo';

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

type Props = NativeStackScreenProps<RootStackParamList, 'MetricDetail'>;

const generateMockHistory = () =>
  Array.from({ length: 100 }, (_, i) => ({
    timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString(),
    value: 50 + Math.sin(i / 5) * 20 + Math.random() * 10,
  }));

export const MetricDetailScreen = ({ route, navigation }: Props) => {
  const { metricId } = route.params;
  const metric = useMetricsStore(state => state.metrics[metricId]);
  const annotations = useAnnotationsStore(
    state => state.annotations[metricId] ?? [],
  );
  const { addOptimistic, rollback } = useAnnotationsStore();
  const { triggerBiometric } = useBiometricGate();

  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    null,
  );
  const [inputText, setInputText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const chartRef = useRef<View>(null);

  useAnnotationsWebSocket(metricId);

  const handlePointSelected = useCallback((index: number) => {
    setSelectedPointIndex(index);
    setIsModalVisible(true);
  }, []);

  const handleSubmitAnnotation = async () => {
    if (selectedPointIndex === null || !inputText.trim()) return;

    const isAuthorized = await triggerBiometric();
    if (!isAuthorized) {
      setIsModalVisible(false);
      return;
    }

    const tempId = generateId();
    const historyPoint = generateMockHistory()[selectedPointIndex];

    const optimisticAnnotation = {
      id: tempId,
      metric_id: metricId,
      user_id: 'user-123',
      username: 'You',
      text: inputText,
      data_point_timestamp: historyPoint.timestamp,
      created_at: new Date().toISOString(),
      is_pending: true,
      sync_status: 'pending' as const,
    };

    addOptimistic(metricId, optimisticAnnotation);
    setIsModalVisible(false);
    setInputText('');

    const networkState = await NetInfo.fetch();

    if (!networkState.isConnected) {
      operationQueueDb.enqueue(
        'create_annotation',
        optimisticAnnotation,
        metricId,
      );
      Alert.alert(
        'Offline',
        'Annotation saved locally and will sync when online.',
      );
      return;
    }

    try {
      // In a real app, emit over WebSocket or call API here
      // Mocking success:
      // syncSuccess(metricId, tempId, serverId);
    } catch {
      rollback(metricId, tempId);
      Alert.alert(
        'Sync Error',
        'Could not save annotation. It has been discarded.',
      );
    }
  };

  const handleShareChart = async () => {
    await shareChartAsImage(chartRef);
  };

  if (!metric) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Metric not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderAnnotation = ({ item }: { item: (typeof annotations)[0] }) => (
    <View
      style={[
        styles.annotationCard,
        item.sync_status === 'pending' && styles.pendingCard,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.annotationUsername}>@{item.username}</Text>
        <Text style={styles.annotationTime}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
      <Text style={styles.annotationText}>{item.text}</Text>
      <View style={styles.annotationFooter}>
        {item.sync_status === 'pending' && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Syncing...</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{metric?.name ?? 'Loading...'}</Text>
        <TouchableOpacity onPress={handleShareChart}>
          <Text style={styles.shareBtn}>Share Chart</Text>
        </TouchableOpacity>
      </View>

      <View ref={chartRef} collapsable={false}>
        <FullChart
          data={generateMockHistory()}
          width={Dimensions.get('window').width}
          height={300}
          onPointSelected={handlePointSelected}
        />
      </View>

      <Text style={styles.annotationHeader}>
        Annotations ({annotations.length})
      </Text>
      <FlatList
        data={annotations}
        keyExtractor={item => item.id}
        renderItem={renderAnnotation}
        contentContainerStyle={styles.annotationsList}
        ListEmptyComponent={
          <View style={styles.emptyAnnotations}>
            <Text style={styles.emptyAnnotationsText}>
              No annotations yet. Tap a point on the chart to add one.
            </Text>
          </View>
        }
      />

      {isModalVisible && (
        <View style={styles.modalOverlay} testID="annotation-modal">
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Annotation</Text>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="What happened here?"
              placeholderTextColor="#6B7280"
              autoFocus
              multiline
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                color="#EF4444"
                onPress={() => setIsModalVisible(false)}
              />
              <Button
                title="Submit (Biometric)"
                onPress={handleSubmitAnnotation}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
  },
  title: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: 'bold',
  },
  shareBtn: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  annotationHeader: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  annotationsList: {
    paddingBottom: 16,
  },
  annotationCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  pendingCard: {
    borderLeftColor: '#F59E0B',
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  annotationUsername: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: 'bold',
  },
  annotationTime: {
    color: '#64748B',
    fontSize: 11,
  },
  annotationText: {
    color: '#F9FAFB',
    fontSize: 14,
    marginTop: 4,
  },
  annotationFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingText: {
    color: '#111827',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyAnnotations: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyAnnotationsText: {
    color: '#6B7280',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1E293B',
    width: '90%',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#334155',
    color: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
