// These IDs match the mock-server/src/index.ts testMetricIds
export const mockMetrics = [
  {
    id: 'metric-1',
    name: 'CPU Usage',
    current_value: 45.5,
    previous_value: 40.2,
    delta: 5.3,
    alert_threshold: 80,
    is_alerting: false,
    sparkline: [30, 35, 40, 45, 50, 45, 40, 35, 40, 45],
    last_updated: new Date().toISOString(),
  },
  {
    id: 'metric-2',
    name: 'Memory Usage',
    current_value: 62.3,
    previous_value: 58.1,
    delta: 4.2,
    alert_threshold: 75,
    is_alerting: false,
    sparkline: [55, 58, 60, 62, 65, 63, 61, 60, 62, 62],
    last_updated: new Date().toISOString(),
  },
  {
    id: 'metric-3',
    name: 'Network Latency',
    current_value: 120.8,
    previous_value: 95.2,
    delta: 25.6,
    alert_threshold: 100,
    is_alerting: true,
    sparkline: [90, 95, 100, 105, 110, 115, 120, 125, 120, 120],
    last_updated: new Date().toISOString(),
  },
];

export const mockWebSocketServer = {
  start: () => {
    console.log('Mock WebSocket server started');
  },
  stop: () => {
    console.log('Mock WebSocket server stopped');
  },
  sendMetrics: metrics => {
    console.log('Sending mock metrics:', metrics);
  },
};

export const mockAnnotation = {
  id: 'test-annotation-1',
  metric_id: 'metric-1',
  user_id: 'test-user',
  username: 'TestUser',
  text: 'Test annotation for E2E',
  data_point_timestamp: new Date().toISOString(),
  created_at: new Date().toISOString(),
  is_pending: false,
  sync_status: 'synced',
};
