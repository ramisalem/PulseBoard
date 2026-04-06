import React, { useMemo } from 'react';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import type { HistoricalDataPoint } from '@typings/metrics';

interface FullChartProps {
  data: HistoricalDataPoint[];
  width: number;
  height: number;
  onPointSelected: (index: number) => void;
}

export const FullChart: React.FC<FullChartProps> = ({
  data,
  width,
  height,
  onPointSelected,
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
