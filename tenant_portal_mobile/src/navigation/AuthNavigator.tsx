import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import { AuthStackParamList } from './types';
import * as theme from '../theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Auth Navigator
 * Handles authentication flow: Login, Register, Forgot Password
 */
const AuthNavigatorComponent = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Sign In',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'Create Account',
        }}
      />
      {/* ForgotPassword screen to be added in future */}
    </Stack.Navigator>
  );
};

export const AuthNavigator = React.memo(AuthNavigatorComponent);
