import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaintenanceScreen from '../screens/maintenance/MaintenanceScreen';
import { CreateMaintenanceRequestScreen } from '../screens/maintenance/CreateMaintenanceRequestScreen';
import { MaintenanceDetailScreen } from '../screens/maintenance/MaintenanceDetailScreen';
import { MaintenanceStackParamList } from './types';
import { theme } from '../theme';

const Stack = createNativeStackNavigator<MaintenanceStackParamList>();

/**
 * Maintenance Stack Navigator
 * Handles all maintenance-related screens within the Maintenance tab
 */
export function MaintenanceStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="MaintenanceList"
        component={MaintenanceScreen}
        options={{
          headerShown: false, // Use custom header in MaintenanceScreen
        }}
      />
      <Stack.Screen
        name="CreateMaintenanceRequest"
        component={CreateMaintenanceRequestScreen}
        options={{
          title: 'New Request',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="MaintenanceDetail"
        component={MaintenanceDetailScreen}
        options={{
          title: 'Request Details',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}
