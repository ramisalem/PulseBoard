# Offline-First Architecture - Technical Writeup

## Overview

PulseBoard implements a complete offline-first architecture that allows users to fully interact with the application without network connectivity. All mutations are queued locally and automatically synchronized when connectivity is restored.

## Architecture Components

### 1. SQLite Persistence Layer

**Library**: `react-native-quick-sqlite` (v8.2.7)

All data is persisted to SQLite, providing:

- Full offline read access to all cached data
- Durable storage of pending operations
- Transaction support for atomic updates

**Tables**:

- `metrics` - Cached metric data with sparkline history
- `metric_history` - Historical data points for sparklines
- `annotations` - User annotations with sync status
- `offline_queue` - Pending operations awaiting sync

### 2. Operation Queue

Located at: `src/features/offlineQueue/services/operationQueue.ts`

All mutations are serialized to the operation queue with:

- Unique operation ID
- Operation type (`create_annotation`, `update_annotation`, `delete_annotation`)
- JSON payload
- Timestamp for ordering
- Retry count and max retries
- Status (`pending`, `processing`, `synced`, `failed`, `discarded`)

### 3. Sync Manager

Located at: `src/features/offlineQueue/services/syncManager.ts`

The sync manager:

- Listens to `NetInfo` for connectivity changes
- Automatically processes the queue when network becomes available
- Processes operations in FIFO order (by `created_at`)
- Handles retries for transient failures

### 4. Conflict Resolution

Located at: `src/features/offlineQueue/services/conflictResolver.ts`

## Conflict Resolution Strategy: Server-Wins

### Scenario Analysis

Given the scenario:

- **10:00:00** - User A creates annotation on metric M while offline
- **10:00:05** - User B creates annotation on metric M while online
- **10:01:00** - User A reconnects

### Resolution Behavior

When User A reconnects, their annotation is sent to the server. The server determines if a conflict exists based on:

- Duplicate annotation IDs
- Same metric_id + timestamp combination
- Business logic specific to the annotation type

**Server-Wins Strategy Implementation**:

```typescript
if (serverResponse.status === 409) {
  // Conflict detected - server wins
  // User A's annotation is discarded
  return {
    success: false,
    shouldRollback: true,
    serverData: serverResponse.data,
  };
}
```

### Why Server-Wins?

**Trade-offs Accepted**:

| Aspect              | Decision                         | Rationale                                         |
| ------------------- | -------------------------------- | ------------------------------------------------- |
| **Data Loss**       | User A may lose their annotation | Simpler than merging; prevents inconsistent state |
| **User Experience** | Silent rollback                  | No user intervention needed; no blocking dialogs  |
| **Implementation**  | Simple                           | No merge logic required; server is authoritative  |
| **Scalability**     | High                             | No complex CRDTs or OT algorithms                 |
| **Consistency**     | Strong                           | Server always has canonical state                 |

**Alternative Strategies Considered**:

1. **Client-Wins**: User A's annotation would overwrite User B's
   - ❌ Rejected: Could lose User B's more recent data
   - ❌ Could cause confusion when User B sees their annotation disappear

2. **Last-Write-Wins (LWW)**: Use timestamps to determine winner
   - ❌ Rejected: Clock synchronization issues across devices
   - ❌ Still requires a tie-breaker

3. **Merge/Union**: Keep both annotations
   - ❌ Rejected: Annotations on the same data point may conflict semantically
   - ❌ Requires more complex UI to show "duplicate" annotations

4. **Manual Resolution**: Prompt user to resolve conflicts
   - ❌ Rejected: Poor UX for mobile; interrupts workflow
   - ❌ Requires user to understand the conflict

### Implementation Details

The `resolveConflict` function handles three categories of responses:

```typescript
// Success - operation synced
if (status >= 200 && status < 300) {
  return { success: true, shouldRollback: false };
}

// Conflict - server wins, discard client operation
if (status === 409) {
  return { success: false, shouldRollback: true };
}

// Client error - bad request, discard
if (status >= 400 && status < 500) {
  return { success: false, shouldRollback: true };
}

// Server/network error - retry later
return { success: false, shouldRollback: false };
```

### Server Responsibilities

For this strategy to work, the server must:

1. Detect conflicts (e.g., duplicate IDs, business rule violations)
2. Return HTTP 409 with the server's version of the resource
3. Include enough data in the response for potential manual resolution (future enhancement)

### Future Enhancements

If conflict rates become problematic, consider:

1. **Optimistic UI with rollback indication** - Show a toast when an operation is rolled back
2. **Conflict review screen** - Allow users to see and re-submit discarded operations
3. **Operational Transform** - For text-based annotations, merge non-conflicting portions
4. **Version vectors** - More sophisticated conflict detection

## Offline Usability

The app is fully functional offline:

### Read Operations

- Metrics loaded from SQLite cache on app startup (`metricsStore.loadFromCache()`)
- Annotations loaded from SQLite (`annotationsDb.getByMetricId()`)
- Historical data available via `metric_history` table

### Write Operations

- All mutations go through the operation queue
- UI shows "Pending Sync" badge for unsynced annotations
- `PendingOperationsScreen` allows users to view and manage queue

### Network Detection

- `NetInfo` provides real-time connectivity status
- UI shows connection status in dashboard header
- Automatic sync when network restored

## Pending Operations UI

Users can view and manage their pending operations:

**Location**: Navigate to "Pending Operations" screen

**Features**:

- List all pending operations with creation time
- Discard individual operations
- Discard all pending operations
- Visual indication of operation type

**Implementation**: `src/features/offlineQueue/components/PendingOperationsScreen.tsx`

## Data Flow

```
[User Action] → [Store] → [SQLite (local)] → [Queue] → [SyncManager]
                      ↓                              ↓
                 [UI Update]              [Network Available?]
                                                    ↓
                                          [API Request] → [Server]
                                                    ↓
                                          [Response] → [Conflict?]
                                                    ↓
                                          [Update Status/Discard]
```

## Retry Strategy

- **Max Retries**: 3 (configurable per operation)
- **Retry Trigger**: Network errors, 5xx server errors
- **Backoff**: Not implemented (relies on network state changes)
- **Dead Letter**: After max retries, operation remains in `failed` status

## Testing Considerations

When testing offline behavior:

1. Use React Native Debugger to throttle network
2. Verify SQLite persistence across app restarts
3. Test conflict scenarios with mock server returning 409
4. Verify queue ordering with multiple operations
