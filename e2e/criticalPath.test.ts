import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { TEST_IDS } from './testIDs';
import { mockMetrics } from './helpers/mockData';

describe('Critical Path E2E Tests', () => {
  beforeAll(async () => {
    // App is already launched by init.js, just ensure it's ready
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  /**
   * Helper: Ensure we're logged out before starting a fresh login
   */
  async function ensureLoggedOut() {
    // Wait a bit for app to stabilize after reload
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Check if we're on the dashboard (already logged in)
      await waitFor(element(by.id(TEST_IDS.DASHBOARD_SCREEN)))
        .toBeVisible()
        .withTimeout(3000);

      // If we get here, we're logged in - log out
      const logoutText = element(by.text('Logout'));
      try {
        await waitFor(logoutText).toBeVisible().withTimeout(2000);
        await logoutText.tap();

        // Confirm logout in alert
        const logoutButton = element(by.text('Logout'));
        await waitFor(logoutButton).toBeVisible().withTimeout(2000);
        await logoutButton.tap();
      } catch {
        // Logout button not found or alert not shown, try alternative
      }

      // Wait for login screen
      await waitFor(element(by.id(TEST_IDS.LOGIN_SCREEN)))
        .toBeVisible()
        .withTimeout(5000);
    } catch {
      // Not on dashboard, assume we're on login screen
      // Wait a moment for login screen to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * Helper: Login with test credentials
   */
  async function login() {
    await ensureLoggedOut();

    await detoxExpect(element(by.id(TEST_IDS.LOGIN_SCREEN))).toBeVisible();

    await element(by.id(TEST_IDS.USERNAME_INPUT)).typeText('testuser');
    await element(by.id(TEST_IDS.PASSWORD_INPUT)).typeText('password');
    await element(by.id(TEST_IDS.LOGIN_BUTTON)).tap();

    // Wait longer for dashboard - it needs to fetch metrics via HTTP
    await waitFor(element(by.id(TEST_IDS.DASHBOARD_SCREEN)))
      .toBeVisible()
      .withTimeout(20000);
  }

  /**
   * Helper: Navigate to first metric detail screen
   */
  async function navigateToFirstMetric() {
    const firstMetricCard = element(
      by.id(`${TEST_IDS.METRIC_CARD_PREFIX}${mockMetrics[0].id}`),
    );
    await waitFor(firstMetricCard).toBeVisible().withTimeout(5000);
    await firstMetricCard.tap();

    await waitFor(element(by.id(TEST_IDS.ANNOTATIONS_HEADER)))
      .toBeVisible()
      .withTimeout(5000);
  }

  describe('1. App Launch and Dashboard Rendering', () => {
    it('should launch app and render dashboard with mocked WS data', async () => {
      await login();

      await detoxExpect(
        element(by.id(TEST_IDS.DASHBOARD_SCREEN)),
      ).toBeVisible();

      const firstMetricCard = element(
        by.id(`${TEST_IDS.METRIC_CARD_PREFIX}${mockMetrics[0].id}`),
      );
      await waitFor(firstMetricCard).toBeVisible().withTimeout(10000);
      await detoxExpect(firstMetricCard).toBeVisible();

      const secondMetricCard = element(
        by.id(`${TEST_IDS.METRIC_CARD_PREFIX}${mockMetrics[1].id}`),
      );
      await detoxExpect(secondMetricCard).toBeVisible();

      const thirdMetricCard = element(
        by.id(`${TEST_IDS.METRIC_CARD_PREFIX}${mockMetrics[2].id}`),
      );
      await detoxExpect(thirdMetricCard).toBeVisible();
    });
  });

  describe('2. Navigation to Detail Screen', () => {
    beforeEach(async () => {
      await login();
    });

    it('should tap a metric card and navigate to detail screen', async () => {
      await navigateToFirstMetric();

      await detoxExpect(
        element(by.id(TEST_IDS.ANNOTATIONS_HEADER)),
      ).toBeVisible();
      await detoxExpect(
        element(by.id(TEST_IDS.ANNOTATIONS_LIST)),
      ).toBeVisible();
      await detoxExpect(
        element(by.id(TEST_IDS.SHARE_CHART_BUTTON)),
      ).toBeVisible();
    });

    it('should navigate back from detail screen to dashboard', async () => {
      await navigateToFirstMetric();

      await device.pressBack();

      await waitFor(element(by.id(TEST_IDS.DASHBOARD_SCREEN)))
        .toBeVisible()
        .withTimeout(5000);

      await detoxExpect(
        element(by.id(TEST_IDS.DASHBOARD_SCREEN)),
      ).toBeVisible();
    });
  });
});
