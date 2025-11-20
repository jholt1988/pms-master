import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getErrorMessage } from '../utils/error';

const BIOMETRIC_USERNAME_KEY = 'biometric_username';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryType: 'FaceID' | 'TouchID' | 'Fingerprint' | 'Iris' | 'None';
  hasHardware: boolean;
  isEnrolled: boolean;
}

export class BiometricAuthService {
  /**
   * Check if biometric authentication is available on this device
   */
  static async checkCapabilities(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometryType: BiometricCapabilities['biometryType'] = 'None';
      
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometryType = Platform.OS === 'ios' ? 'FaceID' : 'Fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometryType = Platform.OS === 'ios' ? 'TouchID' : 'Fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometryType = 'Iris';
      }

      return {
        isAvailable: hasHardware && isEnrolled,
        biometryType,
        hasHardware,
        isEnrolled,
      };
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      return {
        isAvailable: false,
        biometryType: 'None',
        hasHardware: false,
        isEnrolled: false,
      };
    }
  }

  /**
   * Get a user-friendly name for the biometric type
   */
  static getBiometricTypeName(biometryType: BiometricCapabilities['biometryType']): string {
    switch (biometryType) {
      case 'FaceID':
        return 'Face ID';
      case 'TouchID':
        return 'Touch ID';
      case 'Fingerprint':
        return 'Fingerprint';
      case 'Iris':
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  }

  /**
   * Authenticate user with biometrics
   */
  static async authenticate(promptMessage?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const capabilities = await this.checkCapabilities();

      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: capabilities.hasHardware
            ? 'No biometric credentials enrolled. Please set up biometric authentication in your device settings.'
            : 'Biometric authentication is not available on this device.',
        };
      }

      const biometricName = this.getBiometricTypeName(capabilities.biometryType);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || `Authenticate with ${biometricName}`,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error === 'user_cancel'
            ? 'Authentication cancelled'
            : 'Authentication failed. Please try again.',
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: getErrorMessage(error, 'An error occurred during authentication'),
      };
    }
  }

  /**
   * Enable biometric authentication for a user
   * Stores username securely for future biometric logins
   */
  static async enableBiometric(username: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const capabilities = await this.checkCapabilities();

      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
        };
      }

      // Test biometric authentication before enabling
      const authResult = await this.authenticate('Confirm your identity to enable biometric login');

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed',
        };
      }

      // Store username for biometric login
      await SecureStore.setItemAsync(BIOMETRIC_USERNAME_KEY, username);
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

      return { success: true };
    } catch (error) {
      console.error('Error enabling biometric authentication:', error);
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to enable biometric authentication'),
      };
    }
  }

  /**
   * Disable biometric authentication
   * Removes stored username
   */
  static async disableBiometric(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_USERNAME_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    } catch (error) {
      console.error('Error disabling biometric authentication:', error);
      throw error;
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }

  /**
   * Get stored username for biometric login
   */
  static async getStoredUsername(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(BIOMETRIC_USERNAME_KEY);
    } catch (error) {
      console.error('Error getting stored username:', error);
      return null;
    }
  }

  /**
   * Attempt biometric login
   * Returns username if successful
   */
  static async attemptBiometricLogin(): Promise<{
    success: boolean;
    username?: string;
    error?: string;
  }> {
    try {
      const isEnabled = await this.isBiometricEnabled();

      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometric authentication is not enabled',
        };
      }

      const username = await this.getStoredUsername();

      if (!username) {
        return {
          success: false,
          error: 'No stored credentials found',
        };
      }

      const authResult = await this.authenticate('Sign in with biometric authentication');

      if (authResult.success) {
        return {
          success: true,
          username,
        };
      } else {
        return {
          success: false,
          error: authResult.error,
        };
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      return {
        success: false,
        error: getErrorMessage(error, 'Biometric login failed'),
      };
    }
  }

  /**
   * Prompt user to enable biometric authentication after successful login
   */
  static async promptEnableBiometric(username: string): Promise<{
    enabled: boolean;
    error?: string;
  }> {
    try {
      const capabilities = await this.checkCapabilities();

      if (!capabilities.isAvailable) {
        return { enabled: false };
      }

      const result = await this.enableBiometric(username);

      if (result.success) {
        return { enabled: true };
      } else {
        return {
          enabled: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('Error prompting biometric enable:', error);
      return {
        enabled: false,
        error: getErrorMessage(error, 'Failed to enable biometric authentication'),
      };
    }
  }
}
