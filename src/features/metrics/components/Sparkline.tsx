import React, { useEffect } from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import {
  useSharedValue,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';

interface SparklineProps {
  data: number[];
  width: number;
  height: number;
  isAlerting: boolean;
}

const COLOR_NORMAL = '#10B981';
const COLOR_ALERT = '#EF4444';

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width,
  height,
  isAlerting,
}) => {
  const pointsSV = useSharedValue('');
  const colorSV = useSharedValue(isAlerting ? COLOR_ALERT : COLOR_NORMAL);

  useEffect(() => {
    colorSV.value = withTiming(isAlerting ? COLOR_ALERT : COLOR_NORMAL, {
      duration: 300,
    });
  }, [isAlerting, colorSV]);

  useEffect(() => {
    if (data.length < 2) {
      pointsSV.value = '';
      return;
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    let path = `M 0 ${height}`;
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((data[i] - min) / range) * height;
      path += ` L ${x} ${y}`;
    }
    path += ` L ${width} ${height} Z`;

    pointsSV.value = path;
  }, [data, width, height, pointsSV]);

  const skiaPath = useDerivedValue(() => {
    if (pointsSV.value === '') return Skia.Path.Make();
    const p = Skia.Path.MakeFromSVGString(pointsSV.value);
    return p ?? Skia.Path.Make();
  });

  return (
    <Canvas style={{ width, height }} testID="sparkline-canvas">
      <Path path={skiaPath} color={colorSV} style="fill" opacity={0.3} />
    </Canvas>
  );
};
