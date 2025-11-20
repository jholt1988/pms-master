import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { createPayment, confirmPayment, clearError } from '../../store/paymentsSlice';
import { PaymentMethod } from '../../types/payment';
import { theme } from '../../theme';
import type { PaymentsStackParamList, PaymentsStackNavigationProp } from '../../navigation/types';
import { useStripe } from '@stripe/stripe-react-native';
import { getErrorMessage } from '../../utils/error';

type PaymentConfirmationScreenRouteProp = RouteProp<PaymentsStackParamList, 'PaymentConfirmation'>;

export default function PaymentConfirmationScreen() {
  const navigation = useNavigation<PaymentsStackNavigationProp>();
  const route = useRoute<PaymentConfirmationScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const { amount, paymentMethodId, paymentType } = route.params;

  // Redux state
  const { paymentMethods, currentLease, error } = useSelector(
    (state: RootState) => state.payments
  );

  // Local state
  const [processing, setProcessing] = useState(false);

  // Find selected payment method
  const selectedMethod = paymentMethods.find(
    (m: PaymentMethod) => m.id === paymentMethodId
  );

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
      setProcessing(false);
    }
  }, [dispatch, error]);

  const getPaymentMethodDisplay = () => {
    if (!selectedMethod) return 'Unknown';
    
    if (selectedMethod.cardBrand && selectedMethod.cardLast4) {
      return `${selectedMethod.cardBrand} •••• ${selectedMethod.cardLast4}`;
    }
    if (selectedMethod.bankName && selectedMethod.bankLast4) {
      return `${selectedMethod.bankName} •••• ${selectedMethod.bankLast4}`;
    }
    return selectedMethod.stripePaymentMethodId.substring(0, 12) + '...';
  };

  const handleConfirmPayment = async () => {
    if (processing) return;

    setProcessing(true);

    try {
      // Step 1: Create payment intent
      const result = await dispatch(
        createPayment({
          leaseId: currentLease?.id || 0,
          amount,
          paymentMethodId,
        })
      ).unwrap();

      // If payment requires 3D Secure or other authentication
      if (result.requiresAction && result.clientSecret) {
        // Initialize Stripe payment sheet
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: result.clientSecret,
          merchantDisplayName: 'Property Management Portal',
        });

        if (initError) {
          Alert.alert('Error', initError.message);
          setProcessing(false);
          return;
        }

        // Present payment sheet for authentication
        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          Alert.alert('Payment Cancelled', presentError.message);
          setProcessing(false);
          return;
        }

        // Step 2: Confirm payment after authentication
        await dispatch(confirmPayment(result.payment.id)).unwrap();
      }

      // Payment successful
      setProcessing(false);
      navigation.navigate('PaymentReceipt', { paymentId: result.payment.id });
    } catch (err) {
      setProcessing(false);
      Alert.alert(
        'Payment Failed',
        getErrorMessage(err, 'An error occurred while processing your payment. Please try again.')
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (!selectedMethod || !currentLease) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Confirm Payment</Text>
          <Text style={styles.subtitle}>Review your payment details</Text>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Payment Amount</Text>
          <Text style={styles.amountValue}>${amount.toFixed(2)}</Text>
          <Text style={styles.amountType}>
            {paymentType === 'full' ? 'Full Balance Payment' : 'Partial Payment'}
          </Text>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Property</Text>
            <Text style={styles.detailValue}>Unit {currentLease.unitId}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>{getPaymentMethodDisplay()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Date</Text>
            <Text style={styles.detailValue}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Monthly Rent</Text>
            <Text style={styles.detailValue}>
              ${currentLease.monthlyRent.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Processing Fee Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Processing Information</Text>
            <Text style={styles.noticeText}>
              Your payment will be processed securely through Stripe. You may be asked
              to verify your identity for added security.
            </Text>
          </View>
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We never store your full
            card or bank account details.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={processing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, processing && styles.confirmButtonDisabled]}
          onPress={handleConfirmPayment}
          disabled={processing}
        >
          {processing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.confirmButtonText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.confirmButtonText}>
              Confirm Payment
            </Text>
          )}
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
  amountCard: {
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.large,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  amountLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: theme.spacing.xs,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  amountType: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.info}15`,
    margin: theme.spacing.lg,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },
  noticeIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  noticeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  securityNotice: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.lg,
    marginTop: 0,
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
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.5,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
