# Detox E2E Tests

This directory contains end-to-end tests for PulseBoard using Detox.

## Prerequisites

1. Install dependencies:

```bash
npm install
```

2. For iOS testing:
   - Xcode 15 or later
   - iOS Simulator

3. For Android testing:
   - Android Studio
   - Android Emulator with API 34

## Running Tests

### iOS

```bash
# Build the app
npm run e2e:build:ios

# Run tests
npm run e2e:test:ios

# Or build and test in one command
npm run e2e:ios
```

### Android

```bash
# Build the app
npm run e2e:build:android

# Run tests
npm run e2e:test:android

# Or build and test in one command
npm run e2e:android
```

## Test Coverage

The E2E tests cover the following critical paths:

### 1. App Launch and Dashboard Rendering

- App launches successfully
- User logs in with credentials
- Dashboard renders with mocked WebSocket data
- Metric cards are displayed correctly

### 2. Navigation to Detail Screen

- User taps a metric card
- Navigation to metric detail screen works
- Detail screen displays correctly with annotations list

### 3. Adding Annotations

- User can add an annotation
- Annotation appears in the list immediately
- Annotation is persisted and visible

### 4. Offline Annotation and Sync

- User creates annotation while offline
- Annotation is saved locally
- When network is restored, annotation syncs
- Offline capabilities work correctly

### 5. Additional Critical Scenarios

- Alerting metrics display visual indicators
- Navigation back to dashboard works
- Multiple annotations on same metric

## Test Structure

```
e2e/
├── criticalPath.test.ts    # Main E2E test file
├── init.js                  # Detox initialization
├── jest.config.js           # Jest configuration for Detox
├── testIDs.js              # Centralized test IDs
└── helpers/
    ├── mockData.js         # Mock data for tests
    └── mockWebSocket.js    # Mock WebSocket helper
```

## Configuration

- `.detoxrc.js` - Detox configuration for iOS and Android
- `e2e/jest.config.js` - Jest configuration specific to E2E tests

## Test IDs

All test IDs are centralized in `e2e/testIDs.js` for easy maintenance:

```javascript
TEST_IDS = {
  LOGIN_SCREEN: 'login-screen',
  USERNAME_INPUT: 'username-input',
  PASSWORD_INPUT: 'password-input',
  LOGIN_BUTTON: 'login-button',
  DASHBOARD_SCREEN: 'dashboard-screen',
  // ... etc
};
```

## Mocking Strategy

The tests use:

1. **Mock WebSocket Data**: Predefined metrics data for testing
2. **Mock Annotations**: Test annotation objects
3. **Network Simulation**: Using Detox's `device.setURLBlacklist()` for offline testing

## Troubleshooting

### iOS Tests Failing

- Ensure iOS Simulator is running
- Check that the app builds successfully in Xcode
- Verify Detox is properly installed

### Android Tests Failing

- Ensure Android Emulator is running
- Check that the app builds successfully
- Verify Android SDK is properly configured

### Timeout Errors

- Increase timeout values in `e2e/jest.config.js`
- Check network connectivity
- Ensure simulator/emulator has enough resources

## Best Practices

1. **Use Test IDs**: Always use test IDs for element selection
2. **Wait for Elements**: Use `waitFor` for async operations
3. **Clean State**: Each test starts with a fresh app instance
4. **Independent Tests**: Tests should not depend on each other
5. **Descriptive Names**: Use clear, descriptive test names

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests (iOS)
  run: npm run e2e:ios

- name: Run E2E Tests (Android)
  run: npm run e2e:android
```

## Adding New Tests

1. Add test IDs to components
2. Update `testIDs.js` with new IDs
3. Create test in `criticalPath.test.ts` or create new test file
4. Run tests to verify

## Debugging

To debug tests:

```bash
# Run with verbose output
detox test --configuration ios.sim.debug --verbose

# Run specific test
detox test --configuration ios.sim.debug -t "should add an annotation"
```
