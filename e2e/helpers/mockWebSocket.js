import { mockMetrics } from './mockData';

export class MockWebSocket {
  constructor() {
    this.connected = false;
    this.listeners = [];
  }

  connect() {
    this.connected = true;
    this.simulateMetricsUpdate();
  }

  disconnect() {
    this.connected = false;
    this.listeners = [];
  }

  simulateMetricsUpdate() {
    if (this.connected) {
      const message = {
        type: 'metrics_update',
        data: mockMetrics,
        timestamp: new Date().toISOString(),
      };
      this.notifyListeners(message);
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners(message) {
    this.listeners.forEach(callback => callback(message));
  }
}
