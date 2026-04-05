import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const MetricDetailScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Metric Detail (Coming in Phase 6)</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  text: {
    color: '#F9FAFB',
    fontSize: 16,
  },
});
