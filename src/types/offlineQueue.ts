export type OperationType = 'create_annotation' | 'update_annotation' | 'delete_annotation';

export interface QueuedOperation {
  id: string;
  operation_type: OperationType;
  payload: Record<string, unknown>;
  metric_id: string;
  created_at: string; // ISO 8601
  retry_count: number;
  max_retries: number;
  status: 'pending' | 'processing' | 'failed' | 'discarded';
  conflict_resolution?: ConflictResolution;
}

export interface ConflictResolution {
  type: 'server_wins' | 'client_wins' | 'merged';
  server_data?: Record<string, unknown>;
  resolved_at: string;
}
