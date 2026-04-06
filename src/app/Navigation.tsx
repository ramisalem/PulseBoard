import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStore } from '@features/auth/store/authStore';
import { LoginScreen } from '@features/auth/components/LoginScreen';
import { DashboardScreen } from '@features/metrics/components/DashboardScreen';
import { MetricDetailScreen } from '@features/annotations/components/MetricDetailScreen';
import { PendingOperationsScreen } from '@features/offlineQueue/components/PendingOperationsScreen';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  MetricDetail: { metricId: string };
  PendingOps: undefined;
};

export type { RootStackParamList };

const Stack = createNativeStackNavigator<RootStackParamList>();

export const Navigation = () => {
  const { isAuthenticated, isAuthLoading } = useAuthStore();

  if (isAuthLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
                title: 'PulseBoard',
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#111827',
                },
                headerTitleStyle: {
                  color: '#F9FAFB',
                  fontSize: 20,
                  fontWeight: 'bold',
                },
                headerTintColor: '#F9FAFB',
              }}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#111827',
                },
                headerBackTitle: 'Back',
                headerTitleStyle: {
                  color: '#F9FAFB',
                  fontSize: 20,
                  fontWeight: 'bold',
                },
                headerTintColor: '#F9FAFB',
              }}
              name="MetricDetail"
              component={MetricDetailScreen}
            />
            <Stack.Screen
              name="PendingOps"
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
