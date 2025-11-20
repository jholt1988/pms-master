import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import {
  fetchAutoPaySettings,
  updateAutoPaySettings,
  fetchPaymentMethods,
  fetchCurrentLease,
  clearError,
} from '../../store/paymentsSlice';
import { PaymentMethod, PaymentMethodType } from '../../types/payment';
import { theme } from '../../theme';
import type { PaymentsStackNavigationProp } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import PaymentMethodItem, { getPaymentMethodDisplay } from '../../components/payments/PaymentMethodItem';

const days = Array.from({ length: 31 }, (_, i) => i + 1);

export default function AutoPaySetupScreen() {
  const navigation = useNavigation<PaymentsStackNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { autoPaySettings, paymentMethods, currentLease, isLoading, error } = useAppSelector(
    (state) => state.payments
  );

  const [enabled, setEnabled] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [paymentDay, setPaymentDay] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);
  
  const isInitialized = useRef(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCurrentLease());
      dispatch(fetchPaymentMethods());
    }, [dispatch])
  );

  useEffect(() => {
    if (currentLease?.id) {
      dispatch(fetchAutoPaySettings(currentLease.id));
    }
  }, [dispatch, currentLease?.id]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch]);

  // This effect initializes the form state from redux store only once.
  useEffect(() => {
    if (autoPaySettings && !isInitialized.current) {
      setEnabled(autoPaySettings.enabled);
      setSelectedMethodId(autoPaySettings.paymentMethodId || null);
      setPaymentDay(autoPaySettings.dayOfMonth || currentLease?.paymentDueDay || 1);
      isInitialized.current = true;
    } else if (!autoPaySettings && currentLease && !isInitialized.current) {
      // Set default payment day from lease if no autopay settings exist
      setPaymentDay(currentLease.paymentDueDay || 1);
    }
  }, [autoPaySettings, currentLease]);

  const handleToggleEnabled = (value: boolean) => {
    setEnabled(value);
    setHasChanges(true);

    if (value && paymentMethods.length === 0) {
      Alert.alert(
        'No Payment Methods',
        'You need to add a payment method before enabling auto-pay.',
        [
          {
            text: 'Add Payment Method',
            onPress: () => navigation.navigate('PaymentMethods', { returnTo: 'AutoPaySetup' }),
          },
          { text: 'Cancel', onPress: () => setEnabled(false), style: 'cancel' },
        ]
      );
    }
  };

  const handleSelectPaymentMethod = useCallback((methodId: number) => {
    setSelectedMethodId(methodId);
    setHasChanges(true);
  }, []);

  const handleSelectPaymentDay = (day: number) => {
    setPaymentDay(day);
    setHasChanges(true);
  };

  const handleAddPaymentMethod = () => {
    navigation.navigate('PaymentMethods', { returnTo: 'AutoPaySetup', selectMode: true });
  };

  const saveSettings = async () => {
    if (!currentLease) {
      Alert.alert('Error', 'No active lease found.');
      return;
    }

    const payload = {
      leaseId: currentLease.id,
      enabled,
      paymentMethodId: enabled ? selectedMethodId || undefined : undefined,
      dayOfMonth: enabled ? paymentDay : undefined,
    };

    try {
      await dispatch(updateAutoPaySettings(payload)).unwrap();

      Alert.alert(
        'Success',
        `Auto-pay has been ${enabled ? 'enabled' : 'disabled'} successfully!`, 
        [{ text: 'OK', onPress: () => navigation.navigate('PaymentsList') }]
      );

      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update auto-pay settings:', error);
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      Alert.alert('Error', `Failed to update auto-pay settings. ${message}`);
    }
  };

  const handleSave = () => {
    if (enabled) {
      if (!selectedMethodId) {
        Alert.alert('Payment Method Required', 'Please select a payment method for auto-pay.');
        return;
      }
      if (!paymentDay || paymentDay < 1 || paymentDay > 31) {
        Alert.alert('Invalid Payment Day', 'Please select a valid day of the month (1-31).');
        return;
      }
    }

    const title = enabled ? 'Enable Auto-Pay?' : 'Disable Auto-Pay?';
    const message = enabled
      ? `Your rent will be automatically charged on day ${paymentDay} of each month.`
      : 'You will need to make manual payments each month.';

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: enabled ? 'Enable' : 'Disable',
        style: enabled ? 'default' : 'destructive',
        onPress: saveSettings,
      },
    ]);
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert('Discard Changes?', 'You have unsaved changes. Are you sure you want to go back?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const renderPaymentMethodItem = useCallback(({ item }: { item: PaymentMethod }) => (
    <PaymentMethodItem
      method={item}
      isSelected={selectedMethodId === item.id}
      onSelect={handleSelectPaymentMethod}
    />
  ), [selectedMethodId, handleSelectPaymentMethod]);

  const renderPaymentDaySelector = () => (
    <View style={styles.dayGrid}>
      {days.map((day) => (
        <TouchableOpacity
          key={day}
          style={[styles.dayButton, paymentDay === day && styles.dayButtonSelected]}
          onPress={() => handleSelectPaymentDay(day)}
          disabled={!enabled}
        >
          <Text
            style={[ 
              styles.dayButtonText,
              paymentDay === day && styles.dayButtonTextSelected,
              !enabled && styles.dayButtonTextDisabled,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const selectedMethodSummary = useMemo(() => {
    if (!selectedMethodId) return 'None selected';
    const method = paymentMethods.find((m) => m.id === selectedMethodId);
    if (!method) return 'None selected';
    const display = getPaymentMethodDisplay(PaymentMethodType[method.type]);
    const last4 = method.bankLast4 || method.cardLast4;
    return `${display.label} ${last4 ? `•••• ${last4}` : ''}`;
  }, [selectedMethodId, paymentMethods]);

  if (isLoading && !isInitialized.current) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading auto-pay settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Auto-Pay Setup</Text>
          <Text style={styles.subtitle}>
            Automatically pay your rent each month on a specified day.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Enable Auto-Pay</Text>
              <Text style={styles.toggleDescription}>
                Automatically charge rent each month.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor={enabled ? theme.colors.primary : theme.colors.disabled}
              ios_backgroundColor={theme.colors.disabled}
            />
          </View>
        </View>

        {enabled && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <TouchableOpacity onPress={handleAddPaymentMethod}>
                  <Text style={styles.addButton}>+ Add New</Text>
                </TouchableOpacity>
              </View>

              {paymentMethods.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💳</Text>
                  <Text style={styles.emptyText}>No payment methods found</Text>
                  <Text style={styles.emptySubtext}>Add a payment method to enable auto-pay.</Text>
                  <TouchableOpacity
                    style={styles.addMethodButton}
                    onPress={handleAddPaymentMethod}
                  >
                    <Text style={styles.addMethodButtonText}>Add Payment Method</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.paymentMethodsList}>
                  {paymentMethods.map((method, index) => (
                    <View
                      key={method.id}
                      style={index > 0 ? styles.paymentMethodSpacing : undefined}
                    >
                      {renderPaymentMethodItem({ item: method })}
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Day</Text>
              <Text style={styles.sectionDescription}>
                Select the day of the month for your automatic payment.
              </Text>
              {renderPaymentDaySelector()} 
              {currentLease?.paymentDueDay && paymentDay !== currentLease.paymentDueDay && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningText}>
                    Your lease due date is day {currentLease.paymentDueDay}. Selecting a
                    different day may result in late fees.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Auto-Pay Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Monthly Rent:</Text>
                <Text style={styles.summaryValue}>
                  ${currentLease?.monthlyRent?.toFixed(2) ?? 'N/A'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Day:</Text>
                <Text style={styles.summaryValue}>Day {paymentDay} of each month</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Method:</Text>
                <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="tail">
                  {selectedMethodSummary}
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How Auto-Pay Works</Text>
            <Text style={styles.infoText}>
              • Rent is automatically charged on your selected day.{'\n'}
              • You can update or disable auto-pay before the scheduled date.{'\n'}
              • Make sure your payment method has sufficient funds to prevent failed payments.
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasChanges || isLoading) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.small,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  toggleDescription: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addButton: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  paymentMethodsList: {
    width: '100%',
  },
  paymentMethodSpacing: {
    marginTop: theme.spacing.sm,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  addMethodButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  addMethodButtonText: {
    color: theme.colors.textOnPrimary,
    fontWeight: '600',
  },
  sectionDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  dayButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  dayButtonTextSelected: {
    color: theme.colors.textOnPrimary,
  },
  dayButtonTextDisabled: {
    color: theme.colors.disabled,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: `${theme.colors.warning}22`,
    marginTop: theme.spacing.md,
  },
  warningIcon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
  warningText: {
    flex: 1,
    color: theme.colors.warning,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.large,
    backgroundColor: `${theme.colors.info}15`,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
    marginBottom: theme.spacing.lg,
  },
  infoIcon: {
    fontSize: 22,
    marginRight: theme.spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  cancelButton: {
    flex: 1,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  saveButtonText: {
    color: theme.colors.textOnPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
});
