import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Metric } from '@typings/metrics';
import { Sparkline } from './Sparkline';

interface MetricCardProps {
  metric: Metric;
  onPress: (id: string) => void;
}

export const MetricCard = memo(({ metric, onPress }: MetricCardProps) => {
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (metric.is_alerting) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [metric.is_alerting, pulseOpacity]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    borderColor: metric.is_alerting ? '#EF4444' : '#374151',
  }));

  const deltaColor =
    metric.delta === null
      ? '#9CA3AF'
      : metric.delta > 0
      ? '#10B981'
      : metric.delta < 0
      ? '#EF4444'
      : '#9CA3AF';
  const deltaSymbol =
    metric.delta === null
      ? ''
      : metric.delta > 0
      ? '▲'
      : metric.delta < 0
      ? '▼'
      : '■';

  return (
    <Animated.View
      style={[styles.card, animatedCardStyle]}
      testID={`metric-card-${metric.id}`}
    >
      <Pressable style={styles.pressable} onPress={() => onPress(metric.id)}>
        <View style={styles.header}>
          <Text style={styles.name}>{metric.name}</Text>
          <Text style={[styles.delta, { color: deltaColor }]}>
            {deltaSymbol}{' '}
            {metric.delta !== null ? metric.delta?.toFixed(2) : '0.00'}
          </Text>
        </View>

        <Text style={styles.value} testID="metric-value">
          {metric?.current_value?.toFixed(1)}
        </Text>

        <Sparkline
          data={metric.sparkline}
          width={Dimensions.get('window').width * 0.7}
          height={50}
          isAlerting={metric.is_alerting}
        />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginRight: 12,
    width: '90%',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: { color: '#F9FAFB', fontSize: 14, fontWeight: '600' },
  delta: { fontSize: 12, fontWeight: 'bold' },
  value: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pressable: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
