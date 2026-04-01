export interface WebSocketMessage {
  event_id: string;
  metric_id: string;
  value: number;
  timestamp: string; // ISO 8601
  delta: number | null;
  alert_threshold: number | null;
}

export interface AnnotationMessage {
  event_id: string;
  metric_id: string;
  annotation_id: string;
  user_id: string;
  text: string;
  data_point_timestamp: string; // ISO 8601
  created_at: string; // ISO 8601
}

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'reconnecting';

export interface WebSocketState {
  status: ConnectionStatus;
  reconnectAttempt: number;
  lastConnectedAt: string | null;
}
