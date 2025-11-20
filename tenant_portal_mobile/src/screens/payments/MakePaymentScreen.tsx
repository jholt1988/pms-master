import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchPaymentMethods,
  fetchPaymentSummary,
  clearError,
} from '../../store/paymentsSlice';
import { PaymentMethodType, PaymentMethod } from '../../types/payment';
import { theme } from '../../theme';
import type { PaymentsStackNavigationProp } from '../../navigation/types';

export default function MakePaymentScreen() {
  const navigation = useNavigation<PaymentsStackNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const { paymentMethods, paymentSummary, isLoading, error } = useSelector(
    (state: RootState) => state.payments
  );

  // Local state
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const defaultPaymentMethod = paymentMethods.find((m: PaymentMethod) => m.isDefault);

  // Load data on mount
  const loadData = useCallback(async () => {
    await Promise.all([
      dispatch(fetchPaymentMethods()).unwrap(),
      dispatch(fetchPaymentSummary()).unwrap(),
    ]);
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [dispatch, error]);

  // Auto-select default payment method
  useEffect(() => {
    if (defaultPaymentMethod && !selectedMethodId) {
      setSelectedMethodId(defaultPaymentMethod.id);
    }
  }, [defaultPaymentMethod, selectedMethodId]);

  const handlePaymentMethodPress = (methodId: number) => {
    setSelectedMethodId(methodId);
  };

  const handleAddPaymentMethod = () => {
    navigation.navigate('PaymentMethods', { 
      returnTo: 'MakePayment',
      selectMode: true 
    });
  };

  const handleContinue = async () => {
    // Validation
    if (!selectedMethodId) {
      Alert.alert('Payment Method Required', 'Please select a payment method to continue.');
      return;
    }

    const amount = paymentType === 'full' 
      ? paymentSummary?.currentBalance || 0
      : parseFloat(customAmount);

    if (paymentType === 'partial' && (!customAmount || amount <= 0)) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    if (amount > (paymentSummary?.currentBalance || 0)) {
      Alert.alert('Amount Too High', 'Payment amount cannot exceed your current balance.');
      return;
    }

    // Navigate to confirmation screen
    navigation.navigate('PaymentConfirmation', {
      amount,
      paymentMethodId: selectedMethodId,
      paymentType,
    });
  };

  const getPaymentMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case 'CREDIT_CARD':
        return '💳';
      case 'DEBIT_CARD':
        return '💳';
      case 'BANK_ACCOUNT':
        return '🏦';
      case 'PAYPAL':
        return '🅿️';
      default:
        return '💰';
    }
  };

  const getPaymentMethodLabel = (type: PaymentMethodType) => {
    switch (type) {
      case 'CREDIT_CARD':
        return 'Credit Card';
      case 'DEBIT_CARD':
        return 'Debit Card';
      case 'BANK_ACCOUNT':
        return 'Bank Account';
      case 'PAYPAL':
        return 'PayPal';
      default:
        return type;
    }
  };

  if (isLoading && !paymentSummary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading payment information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentBalance = paymentSummary?.currentBalance || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Make a Payment</Text>
          <Text style={styles.subtitle}>Choose amount and payment method</Text>
        </View>

        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>${currentBalance.toFixed(2)}</Text>
          {paymentSummary?.nextPaymentDue && (
            <Text style={styles.dueDate}>
              Due: {new Date(paymentSummary.nextPaymentDue).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Payment Amount Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Amount</Text>
          
          <TouchableOpacity
            style={[
              styles.amountOption,
              paymentType === 'full' && styles.amountOptionSelected,
            ]}
            onPress={() => setPaymentType('full')}
          >
            <View style={styles.amountOptionHeader}>
              <View style={styles.radioButton}>
                {paymentType === 'full' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.amountOptionTitle}>Pay Full Balance</Text>
            </View>
            <Text style={styles.amountOptionAmount}>
              ${currentBalance.toFixed(2)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.amountOption,
              paymentType === 'partial' && styles.amountOptionSelected,
            ]}
            onPress={() => setPaymentType('partial')}
          >
            <View style={styles.amountOptionHeader}>
              <View style={styles.radioButton}>
                {paymentType === 'partial' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.amountOptionTitle}>Pay Custom Amount</Text>
            </View>
            {paymentType === 'partial' && (
              <View style={styles.customAmountInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={styles.customAmountTextInput}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Payment Method Selection */}
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
              <Text style={styles.emptyText}>No payment methods</Text>
              <Text style={styles.emptySubtext}>
                Add a payment method to continue
              </Text>
              <TouchableOpacity
                style={styles.addMethodButton}
                onPress={handleAddPaymentMethod}
              >
                <Text style={styles.addMethodButtonText}>Add Payment Method</Text>
              </TouchableOpacity>
            </View>
          ) : (
            paymentMethods.map((method: PaymentMethod) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedMethodId === method.id && styles.paymentMethodSelected,
                ]}
                onPress={() => handlePaymentMethodPress(method.id)}
              >
                <View style={styles.paymentMethodContent}>
                  <Text style={styles.paymentMethodIcon}>
                    {getPaymentMethodIcon(method.type)}
                  </Text>
                  <View style={styles.paymentMethodDetails}>
                    <Text style={styles.paymentMethodLabel}>
                      {getPaymentMethodLabel(method.type)}
                    </Text>
                    <Text style={styles.paymentMethodInfo}>
                      {method.cardLast4 
                        ? `•••• ${method.cardLast4}`
                        : method.bankLast4
                        ? `•••• ${method.bankLast4}`
                        : method.stripePaymentMethodId.substring(0, 12) + '...'}
                    </Text>
                  </View>
                  {method.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                  <View style={styles.radioButton}>
                    {selectedMethodId === method.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Your payment is secure and encrypted. You may be asked to verify your
            identity during payment processing.
          </Text>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedMethodId || paymentMethods.length === 0) &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedMethodId || paymentMethods.length === 0}
        >
          <Text style={styles.continueButtonText}>Continue to Confirmation</Text>
        </TouchableOpacity>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.large,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: theme.spacing.xs,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  dueDate: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  section: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  addButton: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  amountOption: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amountOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  amountOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  amountOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  amountOptionAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: 32,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  customAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.small,
    marginLeft: 32,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customAmountTextInput: {
    flex: 1,
    fontSize: 18,
    padding: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    paddingLeft: 12,
  },
  paymentMethod: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  paymentMethodInfo: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
    marginRight: theme.spacing.sm,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  addMethodButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.medium,
  },
  addMethodButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },
  securityIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
