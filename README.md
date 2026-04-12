# PulseBoard

A React Native mobile application for real-time metrics monitoring with offline-first architecture, WebSocket synchronization, and local push notifications.

## Features

### Metrics Dashboard
- Real-time metrics display with line chart visualizations
- Pull-to-refresh for manual data updates
- WebSocket-based live updates (2-second intervals)
- Connection status indicator
- Sparkline charts using React Native Skia

### Annotations
- Add annotations to metrics at specific data points
- Biometric authentication for adding annotations
- Real-time synchronization via WebSocket
- Offline annotation queue with automatic sync

### Offline-First Architecture
- Local SQLite persistence for metrics and annotations
- Automatic operation queueing when offline
- Background sync when connection restored
- Server-wins conflict resolution strategy

### Push Notifications
- Local notifications when metrics exceed thresholds
- Deep linking to specific metrics on notification tap
- Foreground and background notification handling

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.84.1 |
| Language | TypeScript 5.8.3 |
| State Management | Zustand 5.0.12 |
| Data Fetching | TanStack Query 5.96.1 |
| Charts | Shopify React Native Skia 2.5.5 |
| Database | react-native-quick-sqlite 8.2.7 |
| Networking | Axios 1.14.0 |
| WebSocket | Custom implementation with backpressure queue |
| Push Notifications | @notifee/react-native 9.1.8 |
| Navigation | React Navigation 7.x |
| List Rendering | Shopify FlashList 2.3.1 |
| Testing | Jest 30.3.0, Detox 20.50.1 |


## Prerequisites

- Node.js >= 22.11.0
- npm or yarn
- iOS: Xcode 15+ and CocoaPods
- Android: Android Studio and SDK 33+

## Installation

```bash
# Install dependencies
yarn install

# iOS: Install CocoaPods dependencies
cd ios && pod install && cd ..
```

## Running the App

```bash
# Start Metro bundler
yarn start

# Run on iOS
yarn ios

# Run on Android
yarn android
```

## Running Tests

### Unit Tests
```bash
# Run unit tests
yarn test

# Run with coverage
yarn test:coverage
```

### E2E Tests with Detox
```bash
# Build and run iOS E2E tests
yarn e2e:ios

# Build and run Android E2E tests
yarn e2e:android
```

For prerequisites, what the suite covers, Detox troubleshooting, and CI notes, see [e2e/README.md](e2e/README.md).

## Environment Variables

The application requires configuration for API endpoints and WebSocket connections. Create environment configuration in your deployment pipeline or hardcoded constants for development.

**Required variables:**
- `API_BASE_URL` - REST API endpoint
- `WS_URL` - WebSocket server endpoint

## Project Structure

```
src/
├── app/                    # Navigation and app entry
│   ├── App.tsx            # Main app component
│   └── Navigation.tsx     # Navigation configuration
├── core/                  # Core utilities and services
│   ├── api/               # API client and offline hooks
│   ├── database/          # SQLite connection and schema
│   ├── logger/            # Logging utilities
│   ├── notifications/     # Push notification service
│   └── websocket/         # WebSocket implementation
├── features/              # Feature modules
│   ├── annotations/       # Annotation CRUD and sync
│   ├── auth/              # Authentication and keychain
│   ├── metrics/           # Metrics display and WebSocket
│   └── offlineQueue/      # Offline operation queue
└── types/                 # TypeScript type definitions
```

## Architecture Notes

### Offline-First Design

The application uses an offline-first architecture with the following components:

1. **Local Persistence** - All data stored in SQLite for offline access
2. **Operation Queue** - Mutations queued when offline, processed FIFO when connected
3. **Conflict Resolution** - Server-wins strategy with 409 conflict detection
4. **Network Awareness** - Automatic sync triggered by NetInfo state changes

See `docs/OFFLINE_ARCHITECTURE.md` for detailed architecture documentation.

### WebSocket Implementation

Custom WebSocket implementation with:
- Backpressure queue for handling high-frequency messages
- Exponential backoff reconnection strategy
- Message batch processing (10ms windows)
- Graceful degradation when offline

### Testing Strategy

- **Unit Tests**: Core business logic, stores, and services (75% coverage target)
- **E2E Tests**: Critical user paths with Detox
- **Test Coverage**: Configured for `src/core` and `src/features/*/store|services`

## API Integration

The application integrates with a REST API for:
- `GET /metrics/snapshot` - Initial metrics load
- `POST /annotations` - Create annotation
- `DELETE /annotations/:id` - Delete annotation

WebSocket endpoint receives real-time metric updates.

## Development Notes

- Biometric authentication is simulated in development (check `MetricDetailScreen.tsx`)
- Mock WebSocket server runs on localhost:4000
- SSL pinning configuration available but requires certificate setup

## License

Private assessment project.
