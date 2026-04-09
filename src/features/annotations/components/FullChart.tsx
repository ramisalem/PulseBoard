import React, { useMemo } from 'react';
import {
  Canvas,
  Group,
  Path,
  Skia,
  Circle,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import type { HistoricalDataPoint } from '@typings/metrics';
import type { Annotation } from '@typings/annotations';

interface FullChartProps {
  data: HistoricalDataPoint[];
  width: number;
  height: number;
  onPointSelected: (index: number) => void;
  annotations?: Annotation[];
}

export const FullChart: React.FC<FullChartProps> = ({
  data,
  width,
  height,
  onPointSelected,
  annotations = [],
}) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const skiaPath = useMemo(() => {
    if (data.length < 2) return null;
    const min = Math.min(...data.map(d => d.value));
    const max = Math.max(...data.map(d => d.value));
    const range = max - min || 1;

    let path = `M 0 ${height}`;
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((data[i].value - min) / range) * height;
      path += ` L ${x} ${y}`;
    }
    path += ` L ${width} ${height} Z`;
    return Skia.Path.MakeFromSVGString(path);
  }, [data, width, height]);

  // Calculate annotation marker positions
  const annotationMarkers = useMemo(() => {
    if (data.length < 2) return [];

    const min = Math.min(...data.map(d => d.value));
    const max = Math.max(...data.map(d => d.value));
    const range = max - min || 1;

    // Create a map of timestamps to data indices for quick lookup
    const timestampToIndex = new Map<string, number>();
    data.forEach((point, index) => {
      timestampToIndex.set(point.timestamp, index);
    });

    return annotations
      .map(annotation => {
        const dataIndex = timestampToIndex.get(annotation.data_point_timestamp);
        if (dataIndex === undefined) return null;

        const x = (dataIndex / (data.length - 1)) * width;
        const y = height - ((data[dataIndex].value - min) / range) * height;

        return {
          x,
          y,
          annotation,
          dataIndex,
        };
      })
      .filter((marker): marker is NonNullable<typeof marker> => marker !== null);
  }, [data, width, height, annotations]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const tapGesture = Gesture.Tap().onEnd(e => {
    const fakeIndex = Math.floor((e.x / width) * data.length);
    runOnJS(onPointSelected)(Math.max(0, Math.min(fakeIndex, data.length - 1)));
  });

  const composedGesture = Gesture.Race(
    pinchGesture,
    Gesture.Simultaneous(panGesture, tapGesture),
  );

  const transform = useDerivedValue(
    () => [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    [translateX, translateY, scale],
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={[styles.container, { width, height }]}>
        <Canvas style={styles.canvas} testID="full-chart-canvas">
          <Group transform={transform}>
            {skiaPath && (
              <Path
                path={skiaPath}
                color="#3B82F6"
                style="fill"
                opacity={0.2}
              />
            )}
            {skiaPath && (
              <Path
                path={skiaPath}
                color="#3B82F6"
                style="stroke"
                strokeWidth={2}
              />
            )}
            {/* Annotation markers */}
            {annotationMarkers.map(({ x, y, annotation }) => (
              <Group key={`annotation-${annotation.id}`}>
                {/* Outer glow circle */}
                <Circle
                  cx={x}
                  cy={y}
                  r={12}
                  color="#F59E0B"
                  opacity={0.3}
                />
                {/* Inner solid circle */}
                <Circle
                  cx={x}
                  cy={y}
                  r={6}
                  color={annotation.sync_status === 'pending' ? '#F59E0B' : '#EF4444'}
                />
                {/* White center dot */}
                <Circle
                  cx={x}
                  cy={y}
                  r={2}
                  color="#FFFFFF"
                />
              </Group>
            ))}
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#111827', overflow: 'hidden' },
  canvas: { flex: 1 },
});
