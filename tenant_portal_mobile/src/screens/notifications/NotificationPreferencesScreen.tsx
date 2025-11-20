/**
 * NotificationPreferencesScreen
 * Manage notification preferences for each category
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Switch, Button, Card, Divider, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchPreferences,
  updatePreferences,
} from '../../store/notificationSlice';
import { NotificationCategory, NotificationPreferences } from '../../types/notification';
import { theme } from '../../theme';

const NotificationPreferencesScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const { preferences, isLoading } = useSelector((state: RootState) => state.notification);
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  // Local state for preferences
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    dispatch(fetchPreferences());
  }, [dispatch]);

  // Update local state when Redux state changes
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  // Handle master push notification toggle
  const handleMasterToggle = (value: boolean) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      enablePushNotifications: value,
    });
    setHasChanges(true);
  };

  // Handle category enabled toggle
  const handleCategoryEnabledToggle = (category: NotificationCategory, value: boolean) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      categories: {
        ...localPreferences.categories,
        [category]: {
          ...localPreferences.categories[category],
          enabled: value,
        },
      },
    });
    setHasChanges(true);
  };

  // Handle category push toggle
  const handleCategoryPushToggle = (category: NotificationCategory, value: boolean) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      categories: {
        ...localPreferences.categories,
        [category]: {
          ...localPreferences.categories[category],
          pushEnabled: value,
        },
      },
    });
    setHasChanges(true);
  };

  // Handle category email toggle
  const handleCategoryEmailToggle = (category: NotificationCategory, value: boolean) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      categories: {
        ...localPreferences.categories,
        [category]: {
          ...localPreferences.categories[category],
          emailEnabled: value,
        },
      },
    });
    setHasChanges(true);
  };

  // Handle save preferences
  const handleSave = async () => {
    if (!localPreferences) return;

    setIsSaving(true);
    try {
      await dispatch(updatePreferences(localPreferences)).unwrap();
      setHasChanges(false);
      Alert.alert('Success', 'Notification preferences saved successfully.');
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset to defaults
  const handleReset = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all notification preferences to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            if (!userId) return;

            // Default preferences
            const defaultPreferences: NotificationPreferences = {
              userId,
              enablePushNotifications: true,
              categories: {
                [NotificationCategory.PAYMENT]: {
                  enabled: true,
                  pushEnabled: true,
                  emailEnabled: true,
                },
                [NotificationCategory.MAINTENANCE]: {
                  enabled: true,
                  pushEnabled: true,
                  emailEnabled: true,
                },
                [NotificationCategory.LEASE]: {
                  enabled: true,
                  pushEnabled: true,
                  emailEnabled: true,
                },
                [NotificationCategory.DOCUMENT]: {
                  enabled: true,
                  pushEnabled: true,
                  emailEnabled: false,
                },
                [NotificationCategory.SYSTEM]: {
                  enabled: true,
                  pushEnabled: false,
                  emailEnabled: false,
                },
                [NotificationCategory.ANNOUNCEMENT]: {
                  enabled: true,
                  pushEnabled: true,
                  emailEnabled: false,
                },
              },
            };

            setLocalPreferences(defaultPreferences);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  // Handle discard changes
  const handleDiscard = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setLocalPreferences(preferences);
            setHasChanges(false);
          },
        },
      ]
    );
  };

  // Get category info
  const getCategoryInfo = (category: NotificationCategory) => {
    const info = {
      [NotificationCategory.PAYMENT]: {
        title: 'Payment Notifications',
        description: 'Payment confirmations, due date reminders, and payment-related updates',
        icon: 'credit-card',
        color: theme.colors.success,
      },
      [NotificationCategory.MAINTENANCE]: {
        title: 'Maintenance Notifications',
        description: 'Updates on maintenance requests, technician assignments, and completion notifications',
        icon: 'hammer-wrench',
        color: theme.colors.warning,
      },
      [NotificationCategory.LEASE]: {
        title: 'Lease Notifications',
        description: 'Lease renewal reminders, expiration alerts, and lease-related documents',
        icon: 'file-document',
        color: theme.colors.info,
      },
      [NotificationCategory.DOCUMENT]: {
        title: 'Document Notifications',
        description: 'New documents available, signature requests, and document updates',
        icon: 'file-multiple',
        color: theme.colors.primary,
      },
      [NotificationCategory.SYSTEM]: {
        title: 'System Notifications',
        description: 'App updates, account changes, and system maintenance notices',
        icon: 'cog',
        color: theme.colors.secondary,
      },
      [NotificationCategory.ANNOUNCEMENT]: {
        title: 'Announcements',
        description: 'Important announcements from property management and community updates',
        icon: 'bullhorn',
        color: theme.colors.warning,
      },
    };
    return info[category];
  };

  // Render category preference card
  const renderCategoryCard = (category: NotificationCategory) => {
    if (!localPreferences) return null;

    const categoryInfo = getCategoryInfo(category);
    const categoryPrefs = localPreferences.categories[category];

    return (
      <Card key={category} style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryInfo.color + '20' }]}>
            <IconButton
              icon={categoryInfo.icon}
              size={28}
              iconColor={categoryInfo.color}
              style={styles.iconButton}
            />
          </View>
          <View style={styles.categoryHeaderText}>
            <Text style={styles.categoryTitle}>{categoryInfo.title}</Text>
            <Text style={styles.categoryDescription}>{categoryInfo.description}</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Enable/Disable Category */}
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceLabel}>
            <Text style={styles.preferenceLabelText}>Enable Notifications</Text>
            <Text style={styles.preferenceLabelSubtext}>
              Receive notifications for this category
            </Text>
          </View>
          <Switch
            value={categoryPrefs.enabled}
            onValueChange={(value) => handleCategoryEnabledToggle(category, value)}
            color={theme.colors.primary}
          />
        </View>

        {/* Push Notifications */}
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceLabel}>
            <Text
              style={[
                styles.preferenceLabelText,
                !categoryPrefs.enabled && styles.disabledText,
              ]}
            >
              Push Notifications
            </Text>
            <Text
              style={[
                styles.preferenceLabelSubtext,
                !categoryPrefs.enabled && styles.disabledText,
              ]}
            >
              Receive push notifications on your device
            </Text>
          </View>
          <Switch
            value={categoryPrefs.pushEnabled}
            onValueChange={(value) => handleCategoryPushToggle(category, value)}
            disabled={!categoryPrefs.enabled || !localPreferences.enablePushNotifications}
            color={theme.colors.primary}
          />
        </View>

        {/* Email Notifications */}
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceLabel}>
            <Text
              style={[
                styles.preferenceLabelText,
                !categoryPrefs.enabled && styles.disabledText,
              ]}
            >
              Email Notifications
            </Text>
            <Text
              style={[
                styles.preferenceLabelSubtext,
                !categoryPrefs.enabled && styles.disabledText,
              ]}
            >
              Receive email notifications
            </Text>
          </View>
          <Switch
            value={categoryPrefs.emailEnabled}
            onValueChange={(value) => handleCategoryEmailToggle(category, value)}
            disabled={!categoryPrefs.enabled}
            color={theme.colors.primary}
          />
        </View>
      </Card>
    );
  };

  if (isLoading && !localPreferences) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Customize how you receive notifications
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Master Push Notification Toggle */}
        <Card style={styles.masterCard}>
          <View style={styles.masterCardContent}>
            <View style={styles.masterIcon}>
              <IconButton
                icon="bell"
                size={32}
                iconColor={theme.colors.primary}
                style={styles.iconButton}
              />
            </View>
            <View style={styles.masterInfo}>
              <Text style={styles.masterTitle}>Push Notifications</Text>
              <Text style={styles.masterDescription}>
                {localPreferences?.enablePushNotifications
                  ? 'Push notifications are enabled'
                  : 'Enable push notifications to receive alerts on your device'}
              </Text>
            </View>
            <Switch
              value={localPreferences?.enablePushNotifications || false}
              onValueChange={handleMasterToggle}
              color={theme.colors.primary}
            />
          </View>
        </Card>

        {/* Warning when push disabled */}
        {localPreferences && !localPreferences.enablePushNotifications && (
          <Card style={styles.warningCard}>
            <View style={styles.warningContent}>
              <IconButton
                icon="alert"
                size={24}
                iconColor={theme.colors.warning}
                style={styles.iconButton}
              />
              <Text style={styles.warningText}>
                Push notifications are disabled. You won’t receive any push alerts until you enable them.
              </Text>
            </View>
          </Card>
        )}

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Notification Categories</Text>

        {/* Category Cards */}
        {renderCategoryCard(NotificationCategory.PAYMENT)}
        {renderCategoryCard(NotificationCategory.MAINTENANCE)}
        {renderCategoryCard(NotificationCategory.LEASE)}
        {renderCategoryCard(NotificationCategory.DOCUMENT)}
        {renderCategoryCard(NotificationCategory.SYSTEM)}
        {renderCategoryCard(NotificationCategory.ANNOUNCEMENT)}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handleReset}
            style={styles.actionButton}
            disabled={isSaving}
          >
            Reset to Defaults
          </Button>
          {hasChanges && (
            <Button
              mode="outlined"
              onPress={handleDiscard}
              style={styles.actionButton}
              disabled={isSaving}
            >
              Discard Changes
            </Button>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>

      {/* Save Button (Fixed at Bottom) */}
      {hasChanges && (
        <View style={styles.saveButtonContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
          >
            Save Preferences
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  masterCard: {
    marginBottom: theme.spacing.md,
    elevation: 2,
    backgroundColor: theme.colors.surface,
  },
  masterCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  masterIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  masterInfo: {
    flex: 1,
  },
  masterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  masterDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  warningCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.warning + '15',
    elevation: 0,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  categoryCard: {
    marginBottom: theme.spacing.md,
    elevation: 1,
    backgroundColor: theme.colors.surface,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  iconButton: {
    margin: 0,
  },
  categoryHeaderText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  categoryDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  divider: {
    marginHorizontal: theme.spacing.md,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  preferenceLabel: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  preferenceLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  preferenceLabelSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  disabledText: {
    color: theme.colors.disabled,
  },
  actionButtons: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
  saveButtonContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveButton: {
    borderRadius: theme.borderRadius.medium,
  },
  saveButtonContent: {
    paddingVertical: theme.spacing.sm,
  },
});

export default NotificationPreferencesScreen;
