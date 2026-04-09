import { makeImageFromView } from '@shopify/react-native-skia';
import Share from 'react-native-share';
import { logger } from '@core/logger';
import type { RefObject } from 'react';
import { View } from 'react-native';

export async function shareChartAsImage(
  chartRef: RefObject<View | null>,
  metricName?: string,
): Promise<void> {
  try {
    if (!chartRef.current) {
      throw new Error('Chart ref is null');
    }

    const image = await makeImageFromView(chartRef as RefObject<View>);

    if (!image) {
      throw new Error('Failed to capture chart image');
    }

    const pngBase64 = image.encodeToBase64();
    const shareMessage = metricName?.trim()
      ? `Check out this ${metricName} metric from PulseBoard`
      : 'Check out this metric from PulseBoard';

    const shareOptions = {
      title: 'PulseBoard Metric Chart',
      message: shareMessage,
      url: `data:image/png;base64,${pngBase64}`,
      type: 'image/png',
    };

    await Share.open(shareOptions);
  } catch (error) {
    if ((error as Error).message !== 'User did not share') {
      logger.error('Failed to share chart', { error: String(error) });
    }
  }
}
