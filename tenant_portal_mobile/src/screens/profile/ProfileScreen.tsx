import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Loading } from '../../components/common';
import { BiometricSettings } from '../../components/settings';
import * as theme from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/authSlice';
import { fetchProfile, updateProfile, changePassword, clearUserError } from '../../store/userSlice';
import type { ProfileScreenProps } from '../../navigation/types';
import { getErrorMessage } from '../../utils/error';

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { profile, isLoading, error } = useAppSelector((state) => state.user);

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Profile form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Load profile on mount
  const loadProfile = useCallback(async () => {
    try {
      await dispatch(fetchProfile()).unwrap();
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, [dispatch]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearUserError()) },
      ]);
    }
  }, [dispatch, error]);

  const handleSaveProfile = async () => {
    try {
      await dispatch(updateProfile(formData)).unwrap();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to update profile'));
    }
  };

  const handleCancelEdit = () => {
    // Reset form to profile data
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
    setIsEditing(false);
  };

  const validatePasswordChange = (): boolean => {
    const errors: typeof passwordErrors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one number';
    } else if (!/(?=.*[@$!%*?&#])/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one special character';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordChange()) {
      return;
    }

    try {
      await dispatch(
        changePassword({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        })
      ).unwrap();

      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});

      Alert.alert('Success', 'Password changed successfully');
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to change password'));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(logout()).unwrap();
              // Navigation will be handled by root navigator
            } catch (err) {
              console.error('Logout error:', err);
            }
          },
        },
      ]
    );
  };

  if (isLoading && !profile) {
    return <Loading text="Loading profile..." fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account</Text>
        </View>

        {/* Profile Picture Placeholder */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.firstName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.username}>@{user?.username}</Text>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <Input
              label="First Name"
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              editable={isEditing}
              autoCapitalize="words"
            />

            <Input
              label="Last Name"
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              editable={isEditing}
              autoCapitalize="words"
            />

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              editable={isEditing}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Phone"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              editable={isEditing}
              keyboardType="phone-pad"
            />

            {isEditing && (
              <View style={styles.editButtonRow}>
                <View style={styles.halfButtonContainer}>
                  <Button
                    title="Cancel"
                    onPress={handleCancelEdit}
                    variant="outline"
                  />
                </View>
                <View style={styles.halfButtonContainer}>
                  <Button
                    title="Save"
                    onPress={handleSaveProfile}
                    loading={isLoading}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowPasswordModal(true)}
          >
            <Text style={styles.menuItemText}>Change Password</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          {/* Biometric Settings */}
          {user?.username && <BiometricSettings username={user.username} />}
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user?.role || 'User'}</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            fullWidth
          />
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalCancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Change Password</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <Input
                label="Current Password"
                value={passwordData.currentPassword}
                onChangeText={(text) =>
                  setPasswordData({ ...passwordData, currentPassword: text })
                }
                error={passwordErrors.currentPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <Input
                label="New Password"
                value={passwordData.newPassword}
                onChangeText={(text) =>
                  setPasswordData({ ...passwordData, newPassword: text })
                }
                error={passwordErrors.newPassword}
                secureTextEntry
                autoCapitalize="none"
                helperText="Min 8 characters, uppercase, lowercase, number, special character"
              />

              <Input
                label="Confirm New Password"
                value={passwordData.confirmPassword}
                onChangeText={(text) =>
                  setPasswordData({ ...passwordData, confirmPassword: text })
                }
                error={passwordErrors.confirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <View style={styles.modalButtonContainer}>
                <Button
                  title="Change Password"
                  onPress={handleChangePassword}
                  loading={isLoading}
                  fullWidth
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    ...theme.typography.h1,
    color: theme.colors.surface,
    fontSize: 40,
  },
  username: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h6,
    color: theme.colors.text,
    fontWeight: '600',
  },
  editButton: {
    ...theme.typography.body1,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    ...theme.shadows.small,
  },
  editButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  halfButtonContainer: {
    flex: 0.48,
  },
  menuItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  menuItemText: {
    ...theme.typography.body1,
    color: theme.colors.text,
  },
  menuItemArrow: {
    ...theme.typography.h5,
    color: theme.colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  infoLabel: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    ...theme.typography.body2,
    color: theme.colors.text,
    fontWeight: '600',
  },
  logoutContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h6,
    color: theme.colors.text,
    fontWeight: '600',
  },
  modalCancelButton: {
    ...theme.typography.body1,
    color: theme.colors.primary,
    width: 60,
  },
  modalBody: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  modalButtonContainer: {
    marginTop: theme.spacing.lg,
  },
});
