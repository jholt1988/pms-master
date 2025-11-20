import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchPayments } from '../../store/paymentsSlice';
import { Payment } from '../../types/payment';
import { theme } from '../../theme';
import type { PaymentsStackParamList, PaymentsStackNavigationProp } from '../../navigation/types';

type PaymentReceiptScreenRouteProp = RouteProp<PaymentsStackParamList, 'PaymentReceipt'>;

export default function PaymentReceiptScreen() {
  const navigation = useNavigation<PaymentsStackNavigationProp>();
  const route = useRoute<PaymentReceiptScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { paymentId } = route.params;

  // Redux state
  const { payments, isLoading } = useSelector(
    (state: RootState) => state.payments
  );

  // Find the payment from the list
  const selectedPayment = payments.find((p: Payment) => p.id === paymentId);

  const loadPayment = useCallback(async () => {
    await dispatch(fetchPayments());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedPayment) {
      loadPayment();
    }
  }, [loadPayment, selectedPayment]);

  const handleDone = () => {
    // Navigate back to payments list
    navigation.navigate('PaymentsList');
  };

  const handleDownloadReceipt = async () => {
    if (!selectedPayment?.receiptUrl) {
      // Generate receipt or show message
      alert('Receipt generation coming soon!');
      return;
    }

    // TODO: Download receipt PDF
    alert('Download receipt: ' + selectedPayment.receiptUrl);
  };

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        message: `Payment Receipt\nAmount: $${selectedPayment?.amount.toFixed(2)}\nDate: ${
          selectedPayment?.paymentDate
            ? new Date(selectedPayment.paymentDate).toLocaleDateString()
            : ''
        }\nStatus: ${selectedPayment?.status}`,
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  if (isLoading || !selectedPayment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading receipt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSuccess = selectedPayment.status === 'COMPLETED';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Success/Failure Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.statusIcon,
              isSuccess ? styles.successIcon : styles.failureIcon,
            ]}
          >
            <Text style={styles.statusEmoji}>{isSuccess ? '✓' : '✗'}</Text>
          </View>
          <Text style={styles.title}>
            {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
          </Text>
          <Text style={styles.subtitle}>
            {isSuccess
              ? 'Your payment has been processed successfully'
              : 'There was a problem processing your payment'}
          </Text>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>
            ${selectedPayment.amount.toFixed(2)}
          </Text>
        </View>

        {/* Receipt Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>
              {selectedPayment.transactionId || selectedPayment.id}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Date</Text>
            <Text style={styles.detailValue}>
              {new Date(selectedPayment.paymentDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>{selectedPayment.paymentMethod}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                isSuccess ? styles.statusBadgeSuccess : styles.statusBadgeFailure,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isSuccess ? styles.statusTextSuccess : styles.statusTextFailure,
                ]}
              >
                {selectedPayment.status}
              </Text>
            </View>
          </View>

          {selectedPayment.lateFee && selectedPayment.lateFee > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Late Fee</Text>
              <Text style={[styles.detailValue, styles.lateFeeText]}>
                ${selectedPayment.lateFee.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {isSuccess && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadReceipt}
            >
              <Text style={styles.actionButtonIcon}>📄</Text>
              <Text style={styles.actionButtonText}>Download Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShareReceipt}
            >
              <Text style={styles.actionButtonIcon}>📤</Text>
              <Text style={styles.actionButtonText}>Share Receipt</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Support Notice */}
        {!isSuccess && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeIcon}>💡</Text>
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>Need Help?</Text>
              <Text style={styles.noticeText}>
                If you continue to experience issues, please contact support or try a
                different payment method.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Done Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
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
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  successIcon: {
    backgroundColor: `${theme.colors.success}20`,
  },
  failureIcon: {
    backgroundColor: `${theme.colors.error}20`,
  },
  statusEmoji: {
    fontSize: 40,
    color: theme.colors.success,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
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
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
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
  lateFeeText: {
    color: theme.colors.error,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
  },
  statusBadgeSuccess: {
    backgroundColor: `${theme.colors.success}20`,
  },
  statusBadgeFailure: {
    backgroundColor: `${theme.colors.error}20`,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: theme.colors.success,
  },
  statusTextFailure: {
    color: theme.colors.error,
  },
  actionsSection: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.warning}15`,
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
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
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
