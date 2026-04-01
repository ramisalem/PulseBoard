export interface Metric {
  id: string;
  name: string;
  current_value: number;
  previous_value: number | null;
  delta: number | null;
  alert_threshold: number | null;
  is_alerting: boolean;
  sparkline: number[]; // Last 50 values
  last_updated: string; // ISO 8601
}

export interface MetricSnapshot {
  metrics: Metric[];
  snapshot_timestamp: string;
}

export interface HistoricalDataPoint {
  timestamp: string;
  value: number;
}

export type DeltaDirection = 'up' | 'down' | 'neutral';
