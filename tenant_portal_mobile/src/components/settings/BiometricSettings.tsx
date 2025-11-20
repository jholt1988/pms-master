import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native';
import { BiometricAuthService, BiometricCapabilities } from '../../services/biometricAuth';
import * as theme from '../../theme';

interface BiometricSettingsProps {
  username: string; // Current logged-in user
}

export const BiometricSettings: React.FC<BiometricSettingsProps> = ({ username }) => {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    loadBiometricStatus();
  }, []);

  const loadBiometricStatus = async () => {
    setIsLoading(true);
    try {
      const caps = await BiometricAuthService.checkCapabilities();
      setCapabilities(caps);

      if (caps.isAvailable) {
        const enabled = await BiometricAuthService.isBiometricEnabled();
        setIsEnabled(enabled);
      }
    } catch (error) {
      console.error('Error loading biometric status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (value: boolean) => {
    if (!capabilities?.isAvailable) {
      return;
    }

    setIsSwitching(true);

    try {
      if (value) {
        // Enable biometric
        const result = await BiometricAuthService.enableBiometric(username);
        
        if (result.success) {
          setIsEnabled(true);
          Alert.alert(
            'Success',
            `${BiometricAuthService.getBiometricTypeName(capabilities.biometryType)} login enabled`
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to enable biometric authentication');
        }
      } else {
        // Disable biometric
        Alert.alert(
          'Disable Biometric Login',
          `Are you sure you want to disable ${BiometricAuthService.getBiometricTypeName(capabilities.biometryType)} login?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                try {
                  await BiometricAuthService.disableBiometric();
                  setIsEnabled(false);
                  Alert.alert('Disabled', 'Biometric login has been disabled');
                } catch (disableError) {
                  console.error('Error disabling biometric authentication:', disableError);
                  Alert.alert('Error', 'Failed to disable biometric authentication');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error toggling biometric:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (!capabilities?.hasHardware) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Text style={styles.unavailableTitle}>Biometric Authentication Unavailable</Text>
          <Text style={styles.unavailableText}>
            This device does not support biometric authentication
          </Text>
        </View>
      </View>
    );
  }

  if (!capabilities.isEnrolled) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Text style={styles.unavailableTitle}>No Biometric Credentials Enrolled</Text>
          <Text style={styles.unavailableText}>
            Please set up {BiometricAuthService.getBiometricTypeName(capabilities.biometryType)} in your device settings to use this feature
          </Text>
        </View>
      </View>
    );
  }

  const biometricName = BiometricAuthService.getBiometricTypeName(capabilities.biometryType);

  return (
    <View style={styles.container}>
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{biometricName} Login</Text>
          <Text style={styles.settingDescription}>
            Use {biometricName} for faster and more secure login
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          disabled={isSwitching}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary + '40',
          }}
          thumbColor={isEnabled ? theme.colors.primary : theme.colors.disabled}
        />
      </View>

      {isEnabled && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ You can quickly sign in using {biometricName} on the login screen
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingTitle: {
    ...theme.typography.body1,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  infoBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.small,
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  unavailableContainer: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  unavailableTitle: {
    ...theme.typography.body1,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  unavailableText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
