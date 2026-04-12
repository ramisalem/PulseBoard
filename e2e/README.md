# Detox E2E Tests

This directory contains end-to-end tests for PulseBoard using Detox.

**More setup detail:** [SETUP.md](SETUP.md) · **Command cheat sheet:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

## Prerequisites

1. **Node.js** >= 22.11.0 (see repo root `package.json` `engines`).

2. Install dependencies from the project root:

```bash
yarn install
```

3. For iOS testing:
   - Xcode 15 or later
   - iOS Simulator

4. For Android testing:
   - Android Studio
   - Android Emulator — API **34** is what Detox is configured against in `.detoxrc.js` (the app may support a broader SDK range; see root [README.md](../README.md)).

## Running Tests

### iOS

```bash
# Build the app
yarn e2e:build:ios

# Run tests
yarn e2e:test:ios

# Or build and test in one command
yarn e2e:ios
```

### Android

```bash
# Build the app
yarn e2e:build:android

# Run tests
yarn e2e:test:android

# Or build and test in one command
yarn e2e:android
```

`npm run` works the same for these scripts if you prefer npm.

## Test coverage (current suite)

[`criticalPath.test.ts`](criticalPath.test.ts) exercises:

### 1. App launch and dashboard

- Login with test credentials
- Dashboard visible after login (mock API + metrics list)
- Metric cards visible for mocked snapshot data

### 2. Navigation to metric detail

- Open first metric from the dashboard
- Detail screen shows annotations header, list, and share control
- Hardware back returns to the dashboard

Additional flows (annotations, offline sync, pending ops) can be added in the same file or new specs; keep `testIDs.js` in sync with the app.

## Test structure

```
e2e/
├── criticalPath.test.ts    # Main E2E test file
├── init.js                 # Detox + mock server bootstrap
├── jest.config.js          # Jest configuration for Detox
├── jest.config.advanced.js # Optional advanced Jest config
├── testIDs.js              # Centralized test IDs
└── helpers/
    ├── mockData.js
    ├── mockWebSocket.js
    ├── utils.ts
    └── assertions.ts
```

## Configuration

- `.detoxrc.js` — Detox configuration for iOS and Android
- `e2e/jest.config.js` — Jest configuration for E2E

## Test IDs

All test IDs are centralized in `e2e/testIDs.js` for easy maintenance. Example:

```javascript
TEST_IDS = {
  LOGIN_SCREEN: 'login-screen',
  USERNAME_INPUT: 'username-input',
  PASSWORD_INPUT: 'password-input',
  LOGIN_BUTTON: 'login-button',
  DASHBOARD_SCREEN: 'dashboard-screen',
  LOGOUT_OPEN_BUTTON: 'logout-open-button',
  // ...
};
```

## Mocking strategy

1. **Mock server** — `init.js` starts `mock-server` before tests; the app calls `http://localhost:4000` (iOS sim) / `http://10.0.2.2:4000` (Android emu).
2. **Mock WebSocket data** — helpers supply predefined metrics where applicable.
3. **Network simulation** — `device.setURLBlacklist()` can be used for offline scenarios in extended tests.

## Troubleshooting

### iOS tests failing

- Ensure iOS Simulator is running and the app builds in Xcode.
- Verify Detox is installed and pods are in sync (`cd ios && pod install`).

### Android tests failing

- Ensure an emulator is running and the Android SDK matches your Detox config.
- Confirm the app build succeeds.

### Timeout / “app is busy” / visibility mismatches

- Skia, FlashList, and animations can keep Detox’s sync layer busy. The suite uses `device.disableSynchronization()` around sensitive waits; extend that pattern if new screens flake.
- Increase timeouts in `e2e/jest.config.js` if hardware is slow.
- Run with higher log level to dump the view hierarchy on failure, e.g. `detox test --configuration ios.sim.debug --loglevel trace`.

### Watchman recrawl warnings

Follow the hint in the terminal (`watchman watch-del` / `watchman watch-project`) for the project path.

## Best practices

1. Prefer stable `testID`s over text where possible.
2. Use `waitFor` for async UI; pair with sync disable when animations block idle detection.
3. After `reloadReactNative()`, wait explicitly for login **or** dashboard — not a fixed sleep — while `restoreSession` runs.
4. Keep tests independent; avoid order-dependent state.

## CI/CD integration

Below is a **minimal** illustration only — real workflows need checkout, Node/yarn install, simulator/emulator boot, and often caching.

```yaml
# Example snippet (not copy-paste complete)
- name: Run E2E Tests (iOS)
  run: yarn e2e:ios

- name: Run E2E Tests (Android)
  run: yarn e2e:android
```

## Adding new tests

1. Add `testID`s to React Native components.
2. Update `testIDs.js` with new IDs.
3. Add cases in `criticalPath.test.ts` or a new `*.test.ts` under `e2e/`.
4. Run `yarn e2e:test:ios` (or Android) locally.

## Debugging

```bash
# Verbose Detox output
detox test --configuration ios.sim.debug --loglevel trace

# Specific test name filter
detox test --configuration ios.sim.debug -t "should tap a metric card"
```
