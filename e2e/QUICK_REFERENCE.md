# E2E Quick Reference

## Installation

```bash
npm install                                    # Install all deps
npm install -g detox-cli                       # Install Detox CLI globally
cd ios && pod install && cd ..                 # iOS pods
```

## Run Tests

```bash
# iOS
npm run e2e:ios                                # Build and test iOS
npm run e2e:build:ios                          # Build only
npm run e2e:test:ios                           # Test only

# Android
npm run e2e:android                            # Build and test Android
npm run e2e:build:android                      # Build only
npm run e2e:test:android                       # Test only
```

## Run Specific Tests

```bash
# Specific file
detox test e2e/criticalPath.test.ts --configuration ios.sim.debug

# Specific test name
detox test -t "should add an annotation" --configuration ios.sim.debug

# With verbose output
detox test --configuration ios.sim.debug --verbose
```

## Debug & Troubleshoot

```bash
# Take screenshots on failure
detox test --configuration ios.sim.debug --take-screenshots failing

# Record videos on failure
detox test --configuration ios.sim.debug --record-videos failing

# Debug mode
detox test --configuration ios.sim.debug --inspect-brk
```

## Test ID Patterns

```javascript
// Login
'login-screen';
'username-input';
'password-input';
'login-button';

// Dashboard
'dashboard-screen';
'metric-card-{id}';

// Detail
'annotations-header';
'annotations-list';
'annotation-modal';
'annotation-input';
'submit-annotation-button';
'annotation-item-{id}';
'share-chart-button';
```

## Common Actions

```javascript
// Wait for element
await waitFor(element(by.id('test-id')))
  .toBeVisible()
  .withTimeout(5000);

// Type text
await element(by.id('input')).typeText('text');

// Tap
await element(by.id('button')).tap();

// Expect visible
await expect(element(by.id('test-id'))).toBeVisible();

// Network control
await device.setURLBlacklist(['.*']); // Offline
await device.setURLBlacklist([]); // Online

// Reload app
await device.reloadReactNative();

// Go back
await device.pressBack();
```

## File Locations

```
e2e/
├── criticalPath.test.ts      # Main tests
├── testIDs.js                # All test IDs
├── helpers/
│   ├── mockData.js          # Mock data
│   ├── mockWebSocket.js     # WebSocket mock
│   ├── utils.ts             # Utilities
│   └── assertions.ts        # Custom assertions
├── README.md                # Full docs
└── SETUP.md                 # Setup guide
```

## Test Structure

```javascript
describe('Feature', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should do something', async () => {
    // Test code
  });
});
```

## Configuration Files

- `.detoxrc.js` - Detox config
- `e2e/jest.config.js` - Jest config
- `e2e/init.js` - Detox init

## Timeouts

```javascript
// Jest config
testTimeout: (120000) // 2 minutes

  // In test
  .withTimeout(5000); // 5 seconds
```

## CI/CD Integration

```yaml
# GitHub Actions
- name: Run E2E Tests
  run: npm run e2e:ios
```

## Useful Commands

```bash
# Check Detox version
detox --version

# List available configurations
detox test --help

# Clean build
detox clean

# Reset simulators
xcrun simctl shutdown all && xcrun simctl erase all
```
