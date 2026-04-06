import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  EventType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { logger } from '@core/logger';

const CHANNEL_ID = 'pulseboard-alerts';

export type NotificationHandler = (metricId: string) => void;

let notificationHandler: NotificationHandler | null = null;

export const notificationService = {
  async init(handler: NotificationHandler) {
    notificationHandler = handler;

    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Metric Alerts',
        description: 'Alerts for metric threshold breaches',
        sound: 'default',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
      });
    }

    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data?.metricId) {
        const metricId = detail.notification.data.metricId as string;
        logger.info('User tapped notification', { metricId });
        if (notificationHandler) {
          notificationHandler(metricId);
        }
      }
    });

    logger.info('Notifee notification service initialized');
  },

  async sendAlertNotification(
    metricId: string,
    metricName: string,
    value: number,
    threshold: number,
  ) {
    logger.info('Sending alert notification via Notifee', {
      metricId,
      metricName,
      value,
      threshold,
    });

    try {
      const notificationId = `alert-${metricId}-${Date.now()}`;

      await notifee.displayNotification({
        id: notificationId,
        title: `⚠️ Alert: ${metricName}`,
        body: `Value ${value.toFixed(2)} exceeded threshold of ${threshold.toFixed(2)}`,
        data: {
          metricId,
        },
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          category: AndroidCategory.ALARM,
          pressAction: {
            id: 'open-metric',
          },
        },
      });

      logger.info('Alert notification sent', {
        notificationId,
        metricId,
        metricName,
      });
    } catch (error) {
      logger.error('Failed to send notification', {
        error: String(error),
        metricId,
      });
    }
  },

  async cancelAll() {
    await notifee.cancelAllNotifications();
  },

  async requestPermissions() {
    try {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus >= 1;
    } catch (error) {
      logger.error('Failed to request notification permissions', {
        error: String(error),
      });
      return false;
    }
  },
};
