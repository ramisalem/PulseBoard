import React, { useEffect } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, Linking } from 'react-native';
import { useAuthStore } from '@features/auth/store/authStore';
import { LoginScreen } from '@features/auth/components/LoginScreen';
import { DashboardScreen } from '@features/metrics/components/DashboardScreen';
import { MetricDetailScreen } from '@features/annotations/components/MetricDetailScreen';
import { PendingOperationsScreen } from '@features/offlineQueue/components/PendingOperationsScreen';
import { notificationService } from '@core/notifications/notificationService';
import { logger } from '@core/logger';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  MetricDetail: { metricId: string };
  PendingOps: undefined;
};

export type { RootStackParamList };

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const baseHeaderOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: '#111827',
  },
  headerTitleStyle: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  headerTintColor: '#F9FAFB',
};

const detailHeaderOptions = {
  ...baseHeaderOptions,
  headerBackTitle: 'Back' as const,
};

export function navigateToMetric(metricId: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MetricDetail', { metricId });
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ['pulseboard://', 'https://pulseboard.app'],
  config: {
    screens: {
      Dashboard: '',
      MetricDetail: 'metric/:metricId',
      PendingOps: 'pending',
      Login: 'login',
    },
  },
};

export const Navigation = () => {
  const { isAuthenticated, isAuthLoading } = useAuthStore();

  useEffect(() => {
    notificationService.init(metricId => {
      logger.info('Notification tapped, navigating to metric', { metricId });
      navigateToMetric(metricId);
    });

    Linking.getInitialURL().then(url => {
      if (url) {
        logger.info('App opened with deep link', { url });
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      logger.info('Deep link received', { url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (isAuthLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                ...baseHeaderOptions,
                title: 'PulseBoard',
              }}
            />
            <Stack.Screen
              options={detailHeaderOptions}
              name="MetricDetail"
              component={MetricDetailScreen}
            />
            <Stack.Screen
              name="PendingOps"
              options={detailHeaderOptions}
              component={PendingOperationsScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
});
