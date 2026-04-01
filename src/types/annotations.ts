export interface Annotation {
  id: string;
  metric_id: string;
  user_id: string;
  username: string;
  text: string;
  data_point_timestamp: string;
  created_at: string;
  is_pending: boolean; // For optimistic updates
  sync_status: 'pending' | 'synced' | 'failed' | 'conflicted';
}
