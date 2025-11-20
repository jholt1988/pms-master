import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/**
 * Auth Stack Navigation
 * Screens accessible before authentication
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type AuthStackNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

/**
 * Main Tab Navigation
 * Bottom tabs for authenticated users
 */
export type MainTabParamList = {
  Home: undefined;
  Payments: undefined;
  Maintenance: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

/**
 * Payments Stack Navigation
 * Screens within the Payments flow
 */
export type PaymentsStackParamList = {
  PaymentsList: undefined;
  MakePayment: undefined;
  PaymentMethods: { returnTo?: string; selectMode?: boolean };
  PaymentConfirmation: { amount: number; paymentMethodId: number; paymentType: 'full' | 'partial' };
  PaymentReceipt: { paymentId: number };
  AutoPaySetup: undefined;
};

export type PaymentsStackNavigationProp = NativeStackNavigationProp<PaymentsStackParamList>;

/**
 * Maintenance Stack Navigation
 * Screens within the Maintenance flow
 */
export type MaintenanceStackParamList = {
  MaintenanceList: undefined;
  CreateMaintenanceRequest: undefined;
  MaintenanceDetail: { requestId: number };
};

export type MaintenanceStackNavigationProp = NativeStackNavigationProp<MaintenanceStackParamList>;

/**
 * Root Stack Navigation
 * Top-level navigation that switches between Auth and Main
 */
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Navigation prop for specific screens
 */
export type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
export type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
export type HomeScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Home'>;
export type PaymentsScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Payments'>;
export type MaintenanceScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Maintenance'>;
export type ProfileScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Profile'>;

/**
 * Route prop for specific screens
 */
export type LoginScreenRouteProp = RouteProp<AuthStackParamList, 'Login'>;
export type RegisterScreenRouteProp = RouteProp<AuthStackParamList, 'Register'>;
export type HomeScreenRouteProp = RouteProp<MainTabParamList, 'Home'>;
export type PaymentsScreenRouteProp = RouteProp<MainTabParamList, 'Payments'>;
export type MaintenanceScreenRouteProp = RouteProp<MainTabParamList, 'Maintenance'>;
export type ProfileScreenRouteProp = RouteProp<MainTabParamList, 'Profile'>;

/**
 * Combined navigation and route props for components
 */
export type LoginScreenProps = {
  navigation: LoginScreenNavigationProp;
  route: LoginScreenRouteProp;
};

export type RegisterScreenProps = {
  navigation: RegisterScreenNavigationProp;
  route: RegisterScreenRouteProp;
};

export type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
};

export type PaymentsScreenProps = {
  navigation: PaymentsScreenNavigationProp;
  route: PaymentsScreenRouteProp;
};

export type MaintenanceScreenProps = {
  navigation: MaintenanceScreenNavigationProp;
  route: MaintenanceScreenRouteProp;
};

export type ProfileScreenProps = {
  navigation: ProfileScreenNavigationProp;
  route: ProfileScreenRouteProp;
};

/**
 * Type helper to ensure navigation is properly typed
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
