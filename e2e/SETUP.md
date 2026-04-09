# E2E Test Setup Instructions

## Step 1: Install Dependencies

Run the following command to install Detox and all required dependencies:

```bash
npm install
```

This will install:

- detox (^20.34.7)
- jest-circus (^30.3.0)

## Step 2: Install Detox CLI (Global)

```bash
npm install -g detox-cli
```

## Step 3: iOS Setup

### 3.1 Install Pods

```bash
cd ios
pod install
cd ..
```

### 3.2 Build the App

```bash
npm run e2e:build:ios
```

### 3.3 Run Tests

```bash
npm run e2e:test:ios
```

## Step 4: Android Setup

### 4.1 Create Android Emulator

Make sure you have an Android emulator named "Pixel_5_API_34" or update `.detoxrc.js` to match your emulator name.

### 4.2 Build the App

```bash
npm run e2e:build:android
```

### 4.3 Run Tests

```bash
npm run e2e:test:android
```

## Quick Start

After setup, you can run all E2E tests with:

**iOS:**

```bash
npm run e2e:ios
```

**Android:**

```bash
npm run e2e:android
```

## Verifying Installation

To verify Detox is installed correctly:

```bash
detox --version
```

To run a quick test:

```bash
detox test --configuration ios.sim.debug
```

## Troubleshooting

### "detox: command not found"

Install Detox CLI globally:

```bash
npm install -g detox-cli
```

### iOS build fails

1. Open `ios/PulseBoard.xcworkspace` in Xcode
2. Build the project manually
3. Fix any errors
4. Try again

### Android build fails

1. Open Android Studio
2. Open the `android` folder
3. Let Gradle sync
4. Build manually
5. Try again

### Tests timeout

Increase timeout in `e2e/jest.config.js`:

```javascript
testTimeout: 240000; // 4 minutes
```

## Next Steps

1. Review test IDs in `e2e/testIDs.js`
2. Check test scenarios in `e2e/criticalPath.test.ts`
3. Add more tests as needed
4. Integrate with CI/CD

## Running Specific Tests

Run a single test file:

```bash
detox test e2e/criticalPath.test.ts --configuration ios.sim.debug
```

Run tests matching a pattern:

```bash
detox test -t "should add an annotation" --configuration ios.sim.debug
```

## Debug Mode

Run tests in debug mode:

```bash
detox test --configuration ios.sim.debug --verbose
```

Take screenshots on failure:

```bash
detox test --configuration ios.sim.debug --take-screenshots failing
```

Record video:

```bash
detox test --configuration ios.sim.debug --record-videos failing
```
