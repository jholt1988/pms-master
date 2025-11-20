import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Loading } from '../../components/common';
import * as theme from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { register, clearError } from '../../store/authSlice';
import type { RegisterScreenProps } from '../../navigation/types';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

type RegistrationStep = 1 | 2 | 3;

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  React.useEffect(() => {
    if (error) {
      Alert.alert('Registration Failed', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [dispatch, error]);

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/(?=.*[@$!%*?&#])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character (@$!%*?&#)';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      setErrors({});
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      setErrors({});
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as RegistrationStep);
      setErrors({});
    }
  };

  const handleRegister = async () => {
    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'Please accept the Terms of Service and Privacy Policy to continue');
      return;
    }

    try {
      await dispatch(register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      })).unwrap();

      // On success, show confirmation and navigate to login
      Alert.alert(
        'Registration Successful!',
        'Your account has been created. You can now log in.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err) {
      // Error handled by Redux and useEffect above
      console.error('Registration error:', err);
    }
  };

  const getPasswordStrength = (): { strength: string; color: string; width: string } => {
    const password = formData.password;
    if (!password) return { strength: '', color: theme.colors.border, width: '0%' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&#]/.test(password)) score++;

    if (score <= 2) return { strength: 'Weak', color: theme.colors.error, width: '33%' };
    if (score <= 4) return { strength: 'Medium', color: theme.colors.warning, width: '66%' };
    return { strength: 'Strong', color: theme.colors.success, width: '100%' };
  };

  const passwordStrength = getPasswordStrength();

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}
            >
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Account Credentials</Text>
      <Text style={styles.stepDescription}>
        Choose your username and password
      </Text>

      <Input
        label="Username"
        value={formData.username}
        onChangeText={(text) => setFormData({ ...formData, username: text })}
        error={errors.username}
        autoCapitalize="none"
      />

      <Input
        label="Email"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Password"
        value={formData.password}
        onChangeText={(text) => setFormData({ ...formData, password: text })}
        error={errors.password}
        secureTextEntry={!showPassword}
        rightIcon={
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.passwordToggle}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        }
      />

      {formData.password.length > 0 && (
        <View style={styles.passwordStrength}>
          <View style={styles.strengthBarContainer}>
            <View
              style={[
                styles.strengthBar,
                { backgroundColor: passwordStrength.color },
                passwordStrength.width === '33%' && { width: '33%' },
                passwordStrength.width === '66%' && { width: '66%' },
                passwordStrength.width === '100%' && { width: '100%' },
              ]}
            />
          </View>
          <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
            Password Strength: {passwordStrength.strength}
          </Text>
        </View>
      )}

      <Input
        label="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
        error={errors.confirmPassword}
        secureTextEntry={!showConfirmPassword}
        rightIcon={
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Text style={styles.passwordToggle}>
              {showConfirmPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.buttonSpacing}>
        <Button
          title="Next"
          onPress={handleNextStep}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>
        Tell us a bit about yourself
      </Text>

      <Input
        label="First Name"
        value={formData.firstName}
        onChangeText={(text) => setFormData({ ...formData, firstName: text })}
        error={errors.firstName}
        autoCapitalize="words"
      />

      <Input
        label="Last Name"
        value={formData.lastName}
        onChangeText={(text) => setFormData({ ...formData, lastName: text })}
        error={errors.lastName}
        autoCapitalize="words"
      />

      <Input
        label="Phone Number"
        value={formData.phone}
        onChangeText={(text) => setFormData({ ...formData, phone: text })}
        error={errors.phone}
        keyboardType="phone-pad"
        placeholder="(555) 123-4567"
      />

      <View style={styles.buttonRow}>
        <View style={styles.halfButtonContainer}>
          <Button
            title="Back"
            onPress={handlePreviousStep}
            variant="outline"
          />
        </View>
        <View style={styles.halfButtonContainer}>
          <Button
            title="Next"
            onPress={handleNextStep}
          />
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Terms & Conditions</Text>
      <Text style={styles.stepDescription}>
        Please review and accept our terms
      </Text>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Account Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Username:</Text>
          <Text style={styles.summaryValue}>{formData.username}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Email:</Text>
          <Text style={styles.summaryValue}>{formData.email}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryValue}>
            {formData.firstName} {formData.lastName}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Phone:</Text>
          <Text style={styles.summaryValue}>{formData.phone}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAcceptedTerms(!acceptedTerms)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          {acceptedTerms && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the{' '}
          <Text style={styles.link} onPress={() => Alert.alert('Terms of Service', 'Terms content coming soon')}>
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text style={styles.link} onPress={() => Alert.alert('Privacy Policy', 'Privacy policy content coming soon')}>
            Privacy Policy
          </Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <View style={styles.halfButtonContainer}>
          <Button
            title="Back"
            onPress={handlePreviousStep}
            variant="outline"
          />
        </View>
        <View style={styles.halfButtonContainer}>
          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            disabled={!acceptedTerms}
          />
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return <Loading text="Creating your account..." fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Tenant Portal</Text>
          </View>

          {renderStepIndicator()}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepNumber: {
    ...theme.typography.body1,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stepNumberActive: {
    color: theme.colors.surface,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
  },
  stepLineActive: {
    backgroundColor: theme.colors.primary,
  },
  stepContent: {
    marginBottom: theme.spacing.lg,
  },
  stepTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  stepDescription: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  passwordStrength: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.small,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  strengthBar: {
    height: '100%',
    borderRadius: theme.borderRadius.small,
  },
  strengthText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  passwordToggle: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  buttonSpacing: {
    marginTop: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  halfButtonContainer: {
    flex: 0.48,
  },
  summaryContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.small,
  },
  summaryTitle: {
    ...theme.typography.h6,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    ...theme.typography.body2,
    color: theme.colors.text,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.small,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...theme.typography.body2,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 20,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  loginLinkText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  loginLinkBold: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
