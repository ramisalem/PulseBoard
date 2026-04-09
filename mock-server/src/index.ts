import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/metrics' });

const PORT = 4000;

interface Metric {
  id: string;
  name: string;
  current_value: number;
  previous_value: number | null;
  delta: number | null;
  alert_threshold: number | null;
  is_alerting: boolean;
  sparkline: number[];
  last_updated: string;
}

interface Annotation {
  id: string;
  metric_id: string;
  user_id: string;
  username: string;
  text: string;
  data_point_timestamp: string;
  created_at: string;
}

const metrics: Map<string, Metric> = new Map();
const annotations: Map<string, Annotation> = new Map();

function initMetrics() {
  // Use predictable IDs for E2E tests
  const testMetricIds = [
    'metric-1',
    'metric-2',
    'metric-3',
    'metric-4',
    'metric-5',
    'metric-6',
    'metric-7',
    'metric-8',
    'metric-9',
    'metric-10',
  ];

  const testMetricValues = [
    { name: 'CPU Usage', value: 45.5, alertThreshold: 80, isAlerting: false },
    { name: 'Memory Usage', value: 62.3, alertThreshold: 75, isAlerting: false },
    { name: 'Network Latency', value: 120.8, alertThreshold: 100, isAlerting: true },
    { name: 'Network In', value: 35.2, alertThreshold: null, isAlerting: false },
    { name: 'Network Out', value: 28.7, alertThreshold: null, isAlerting: false },
    { name: 'Disk I/O', value: 52.1, alertThreshold: 80, isAlerting: false },
    { name: 'Latency', value: 15.3, alertThreshold: 50, isAlerting: false },
    { name: 'Request Rate', value: 250.5, alertThreshold: 80, isAlerting: false },
    { name: 'Active Users', value: 1250, alertThreshold: 2000, isAlerting: false },
    { name: 'Queue Depth', value: 12, alertThreshold: 50, isAlerting: false },
  ];

  for (let i = 0; i < 10; i++) {
    const id = testMetricIds[i];
    const config = testMetricValues[i];
    const baseValue = config.value;
    metrics.set(id, {
      id,
      name: config.name,
      current_value: baseValue,
      previous_value: null,
      delta: null,
      alert_threshold: config.alertThreshold,
      is_alerting: config.isAlerting,
      sparkline: Array(10)
        .fill(0)
        .map(() => baseValue + (Math.random() - 0.5) * 20),
      last_updated: new Date().toISOString(),
    });
  }
}

function broadcastMetric(metric: Metric) {
  const message = {
    event_id: uuidv4(),
    metric_id: metric.id,
    value: metric.current_value,
    timestamp: metric.last_updated,
    delta: metric.delta,
    alert_threshold: metric.alert_threshold,
  };

  const payload = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function simulateMetrics() {
  metrics.forEach(metric => {
    const change = (Math.random() - 0.5) * 10;
    metric.previous_value = metric.current_value;
    metric.current_value = Math.max(
      0,
      Math.min(100, metric.current_value + change),
    );
    metric.delta = metric.current_value - metric.previous_value;
    metric.is_alerting =
      metric.alert_threshold !== null &&
      metric.current_value > metric.alert_threshold;
    metric.sparkline.push(metric.current_value);
    if (metric.sparkline.length > 50) {
      metric.sparkline.shift();
    }
    metric.last_updated = new Date().toISOString();

    broadcastMetric(metric);
  });
}

function triggerAlert() {
  const alertableMetrics = Array.from(metrics.values()).filter(
    m => m.alert_threshold !== null && !m.is_alerting,
  );

  if (alertableMetrics.length === 0) return;

  const metric =
    alertableMetrics[Math.floor(Math.random() * alertableMetrics.length)];

  metric.previous_value = metric.current_value;
  metric.current_value =
    (metric.alert_threshold ?? 80) + 5 + Math.random() * 10;
  metric.delta = metric.current_value - metric.previous_value;
  metric.is_alerting = true;
  metric.sparkline.push(metric.current_value);
  if (metric.sparkline.length > 50) {
    metric.sparkline.shift();
  }
  metric.last_updated = new Date().toISOString();

  console.log(
    `🚨 ALERT: ${metric.name} spiked to ${metric.current_value.toFixed(2)} (threshold: ${metric.alert_threshold})`,
  );

  broadcastMetric(metric);
}

app.get('/metrics/snapshot', (_req, res) => {
  res.json({
    metrics: Array.from(metrics.values()),
    snapshot_timestamp: new Date().toISOString(),
  });
});

app.get('/annotations/:metricId', (req, res) => {
  const { metricId } = req.params;
  const metricAnnotations = Array.from(annotations.values()).filter(
    a => a.metric_id === metricId,
  );
  res.json(metricAnnotations);
});

app.post('/annotations', (req, res) => {
  const {
    id,
    metric_id,
    user_id,
    username,
    text,
    data_point_timestamp,
    created_at,
  } = req.body;

  if (!metric_id || !user_id || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const annotation: Annotation = {
    id: id || uuidv4(),
    metric_id,
    user_id,
    username: username || 'Unknown',
    text,
    data_point_timestamp: data_point_timestamp || new Date().toISOString(),
    created_at: created_at || new Date().toISOString(),
  };

  annotations.set(annotation.id, annotation);
  console.log(`Annotation created: ${annotation.id} on metric ${metric_id}`);

  res.status(201).json(annotation);
});

app.delete('/annotations/:id', (req, res) => {
  const { id } = req.params;

  if (!annotations.has(id)) {
    return res.status(404).json({ error: 'Annotation not found' });
  }

  annotations.delete(id);
  res.status(204).send();
});

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  res.json({
    user: {
      id: 'user-123',
      username,
      email: `${username}@pulseboard.io`,
    },
    tokens: {
      access_token: 'mock-access-token-' + uuidv4(),
      refresh_token: 'mock-refresh-token-' + uuidv4(),
      access_token_expires_at: Date.now() + 3600000,
    },
  });
});

app.post('/auth/refresh', (_req, res) => {
  res.json({
    access_token: 'mock-access-token-' + uuidv4(),
    refresh_token: 'mock-refresh-token-' + uuidv4(),
    access_token_expires_at: Date.now() + 3600000,
  });
});

wss.on('connection', ws => {
  console.log('Client connected to metrics WebSocket');

  ws.send(
    JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
    }),
  );

  ws.on('close', () => {
    console.log('Client disconnected from metrics WebSocket');
  });
});

initMetrics();

setInterval(simulateMetrics, 2000);
setInterval(triggerAlert, 10000);

httpServer.listen(PORT, () => {
  console.log(`PulseBoard Mock Server running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/metrics`);
});
