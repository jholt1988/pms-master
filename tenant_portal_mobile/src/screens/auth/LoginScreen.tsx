import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, clearError } from '../../store/authSlice';
import { Button, Input } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { BiometricAuthService, BiometricCapabilities } from '../../services/biometricAuth';
import type { LoginScreenProps } from '../../navigation/types';
import { getErrorMessage } from '../../utils/error';

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Form validation
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  // Check biometric capabilities on mount
  useEffect(() => {
    checkBiometricSupport();
  }, [checkBiometricSupport]);

  const handleBiometricLogin = useCallback(async () => {
    try {
      const result = await BiometricAuthService.attemptBiometricLogin();
      
      if (result.success && result.username) {
        setUsername(result.username);
        Alert.alert(
          'Biometric Login',
          'Please enter your password to continue',
          [{ text: 'OK' }]
        );
      } else if (result.error && result.error !== 'Authentication cancelled') {
        Alert.alert('Biometric Login Failed', result.error);
      }
    } catch (error) {
      console.error('Biometric login error:', error);
    }
  }, []);

  const checkBiometricSupport = useCallback(async () => {
    const capabilities = await BiometricAuthService.checkCapabilities();
    setBiometricCapabilities(capabilities);
    
    if (capabilities.isAvailable) {
      const enabled = await BiometricAuthService.isBiometricEnabled();
      setBiometricEnabled(enabled);
      
      // Auto-prompt biometric login if enabled
      if (enabled) {
        setTimeout(() => {
          handleBiometricLogin();
        }, 500); // Small delay for better UX
      }
    }
  }, [handleBiometricLogin]);

  const promptEnableBiometric = async (username: string) => {
    if (!biometricCapabilities?.isAvailable) {
      return;
    }

    const biometricName = BiometricAuthService.getBiometricTypeName(
      biometricCapabilities.biometryType
    );

    Alert.alert(
      `Enable ${biometricName}?`,
      `Would you like to use ${biometricName} for faster login next time?`,
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Enable',
          onPress: async () => {
            const result = await BiometricAuthService.enableBiometric(username);
            if (result.success) {
              setBiometricEnabled(true);
              Alert.alert('Success', `${biometricName} login enabled!`);
            } else if (result.error) {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  const validateForm = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    // Clear previous errors
    dispatch(clearError());
    setErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      const result = await dispatch(
        login({ username, password, rememberMe })
      ).unwrap();

      console.log('Login successful:', result);
      
      // Prompt to enable biometric after successful login
      if (!biometricEnabled && biometricCapabilities?.isAvailable) {
        // Small delay to let login complete
        setTimeout(() => {
          promptEnableBiometric(username);
        }, 500);
      }

      // Navigation will be handled by root navigator checking auth state
    } catch (err) {
      const message = getErrorMessage(err, 'Please check your credentials and try again.');
      Alert.alert('Login Failed', message);
    }
  };

  const handleForgotPassword = () => {
    // TODO: Navigate to forgot password screen when implemented
    Alert.alert('Forgot Password', 'This feature will be implemented soon.');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <Input
              label="Username or Email"
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              error={errors.username}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              }
            />

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={styles.checkbox}>
                  {rememberMe && <View style={styles.checkboxChecked} />}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Server Error Message */}
            {error && <Text style={styles.serverError}>{error}</Text>}

            {/* Login Button */}
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              style={styles.loginButton}
            />

            {/* Biometric Login Button */}
            {biometricEnabled && biometricCapabilities && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={isLoading}
              >
                <Text style={styles.biometricButtonText}>
                  🔒 Sign in with {BiometricAuthService.getBiometricTypeName(biometricCapabilities.biometryType)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don’t have an account? </Text>
              <TouchableOpacity onPress={handleRegister}>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Tenant Portal v1.0</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 4,
    marginRight: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 12,
    height: 12,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  rememberMeText: {
    ...typography.body2,
    color: colors.text,
  },
  forgotPasswordText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  showPasswordText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  serverError: {
    ...typography.body2,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.error + '10',
    borderRadius: 4,
  },
  loginButton: {
    marginBottom: spacing.md,
  },
  biometricButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  biometricButtonText: {
    ...typography.body1,
    color: colors.primary,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.caption,
    color: colors.textLight,
  },
});
