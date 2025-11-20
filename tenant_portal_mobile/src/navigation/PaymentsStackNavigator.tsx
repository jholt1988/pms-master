import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import MakePaymentScreen from '../screens/payments/MakePaymentScreen';
import PaymentConfirmationScreen from '../screens/payments/PaymentConfirmationScreen';
import PaymentReceiptScreen from '../screens/payments/PaymentReceiptScreen';
import AutoPaySetupScreen from '../screens/payments/AutoPaySetupScreen';
import { PaymentsStackParamList } from './types';
import { theme } from '../theme';

const Stack = createNativeStackNavigator<PaymentsStackParamList>();

/**
 * Payments Stack Navigator
 * Handles all payment-related screens within the Payments tab
 */
export function PaymentsStackNavigator() {
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
        name="PaymentsList"
        component={PaymentsScreen}
        options={{
          headerShown: false, // Use custom header in PaymentsScreen
        }}
      />
      <Stack.Screen
        name="MakePayment"
        component={MakePaymentScreen}
        options={{
          title: 'Make Payment',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={MakePaymentScreen} // Placeholder - will create PaymentMethodsScreen later
        options={{
          title: 'Payment Methods',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="PaymentConfirmation"
        component={PaymentConfirmationScreen}
        options={{
          title: 'Confirm Payment',
          headerShown: true,
          gestureEnabled: false, // Prevent swipe back during payment
        }}
      />
      <Stack.Screen
        name="PaymentReceipt"
        component={PaymentReceiptScreen}
        options={{
          title: 'Receipt',
          headerShown: true,
          gestureEnabled: false, // Prevent swipe back from receipt
        }}
      />
      <Stack.Screen
        name="AutoPaySetup"
        component={AutoPaySetupScreen}
        options={{
          title: 'Auto-Pay Setup',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}
