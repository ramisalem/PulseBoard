export function findClosestDataPointIndex(
  touchX: number,
  chartWidth: number,
  dataLength: number,
  scale: number,
  translateX: number,
): number {
  if (dataLength === 0) return -1;

  const visibleWidth = chartWidth / scale;

  const dataOffset = (-translateX / visibleWidth) * dataLength;

  const touchRatio = touchX / chartWidth;

  const index = Math.floor(dataOffset + (touchRatio * dataLength) / scale);

  return Math.max(0, Math.min(index, dataLength - 1));
}
