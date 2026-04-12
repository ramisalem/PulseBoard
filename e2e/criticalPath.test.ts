import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { TEST_IDS } from './testIDs';
import { mockMetrics } from './helpers/mockData';

/** Max time for auth bootstrap after reload (spinner → login or dashboard). */
const SESSION_READY_MS = 25000;
const POLL_MS = 400;

describe('Critical Path E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  /**
   * After reload, wait until we are past the loading gate and either login or dashboard is shown.
   */
  async function waitForLoginOrDashboard(): Promise<'login' | 'dashboard'> {
    const start = Date.now();
    while (Date.now() - start < SESSION_READY_MS) {
      await device.disableSynchronization();
      try {
        try {
          await waitFor(element(by.id(TEST_IDS.LOGIN_SCREEN)))
            .toBeVisible()
            .withTimeout(600);
          return 'login';
        } catch {
          /* continue */
        }
        try {
          await waitFor(element(by.id(TEST_IDS.DASHBOARD_SCREEN)))
            .toBeVisible()
            .withTimeout(600);
          return 'dashboard';
        } catch {
          /* continue */
        }
      } finally {
        await device.enableSynchronization();
      }
      await new Promise<void>(resolve => setTimeout(resolve, POLL_MS));
    }
    throw new Error(
      `Neither ${TEST_IDS.LOGIN_SCREEN} nor ${TEST_IDS.DASHBOARD_SCREEN} became visible within ${SESSION_READY_MS}ms`,
    );
  }

  async function confirmLogoutAlert() {
    await waitFor(
      element(by.text('Are you sure you want to logout?')),
    )
      .toBeVisible()
      .withTimeout(5000);
    // Header and alert both expose "Logout"; confirm uses the alert action (second match).
    await element(by.text('Logout')).atIndex(1).tap();
  }

  async function logoutFromDashboard() {
    await device.disableSynchronization();
    try {
      await element(by.id(TEST_IDS.LOGOUT_OPEN_BUTTON)).tap();
      await confirmLogoutAlert();
    } finally {
      await device.enableSynchronization();
    }

    await waitFor(element(by.id(TEST_IDS.LOGIN_SCREEN)))
      .toBeVisible()
      .withTimeout(15000);
  }

  /**
   * Ensure we end on the login screen (fresh credentials flow).
   */
  async function ensureLoggedOut() {
    const screen = await waitForLoginOrDashboard();
    if (screen === 'login') {
      return;
    }
    await logoutFromDashboard();
  }

  /**
   * Login with test credentials and wait for dashboard (Skia/FlashList can keep the bridge busy).
   */
  async function login() {
    await ensureLoggedOut();

    await detoxExpect(element(by.id(TEST_IDS.LOGIN_SCREEN))).toBeVisible();

    await element(by.id(TEST_IDS.USERNAME_INPUT)).typeText('testuser');
    await element(by.id(TEST_IDS.PASSWORD_INPUT)).typeText('password');
    await element(by.id(TEST_IDS.LOGIN_BUTTON)).tap();

    await device.disableSynchronization();
    try {
      await waitFor(element(by.id(TEST_IDS.DASHBOARD_SCREEN)))
        .toBeVisible()
        .withTimeout(30000);
    } finally {
      await device.enableSynchronization();
    }
  }

  async function waitForDashboardVisible() {
    await device.disableSynchronization();
    try {
      await waitFor(element(by.id(TEST_IDS.DASHBOARD_SCREEN)))
        .toBeVisible()
        .withTimeout(15000);
    } finally {
      await device.enableSynchronization();
    }
  }

  /**
   * Helper: Navigate to first metric detail screen
   */
  async function navigateToFirstMetric() {
    const firstMetricCard = element(
      by.id(`${TEST_IDS.METRIC_CARD_PREFIX}${mockMetrics[0].id}`),
    );
    await device.disableSynchronization();
    try {
      await waitFor(firstMetricCard).toBeVisible().withTimeout(10000);
    } finally {
      await device.enableSynchronization();
    }
    await firstMetricCard.tap();

    await device.disableSynchronization();
    try {
      await waitFor(element(by.id(TEST_IDS.ANNOTATIONS_HEADER)))
        .toBeVisible()
        .withTimeout(10000);
    } finally {
      await device.enableSynchronization();
    }
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
      await device.disableSynchronization();
      try {
        await waitFor(firstMetricCard).toBeVisible().withTimeout(15000);
        await detoxExpect(firstMetricCard).toBeVisible();

        const secondMetricCard = element(
          by.id(`${TEST_IDS.METRIC_CARD_PREFIX}${mockMetrics[1].id}`),
        );
        await detoxExpect(secondMetricCard).toBeVisible();

        const thirdMetricCard = element(
          by.id(`${TEST_IDS.METRIC_CARD_PREFIX}${mockMetrics[2].id}`),
        );
        await detoxExpect(thirdMetricCard).toBeVisible();
      } finally {
        await device.enableSynchronization();
      }
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

      await waitForDashboardVisible();

      await detoxExpect(
        element(by.id(TEST_IDS.DASHBOARD_SCREEN)),
      ).toBeVisible();
    });
  });
});
