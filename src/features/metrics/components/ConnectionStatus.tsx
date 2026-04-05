import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useMetricsStore } from '../store/metricsStore';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  connecting: { label: 'Connecting...', color: '#F59E0B' },
  connected: { label: 'Live', color: '#10B981' },
  disconnected: { label: 'Offline', color: '#EF4444' },
  reconnecting: { label: 'Reconnecting', color: '#F59E0B' },
};

export const ConnectionStatus: React.FC = () => {
  const status = useMetricsStore(state => state.connectionStatus);
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.disconnected;

  return (
    <View style={styles.container} testID="connection-status">
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
