import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PaymentMethod, PaymentMethodType } from '../../types/payment';
import { theme } from '../../theme';

const paymentMethodDetails: { [key in PaymentMethodType]?: { icon: string; label: string } } = {
  [PaymentMethodType.CREDIT_CARD]: { icon: '💳', label: 'Credit Card' },
  [PaymentMethodType.DEBIT_CARD]: { icon: '💳', label: 'Debit Card' },
  [PaymentMethodType.BANK_ACCOUNT]: { icon: '🏦', label: 'Bank Account' },
  [PaymentMethodType.ACH]: { icon: '🏦', label: 'ACH' },
  [PaymentMethodType.PAYPAL]: { icon: '🅿️', label: 'PayPal' },
};

export const getPaymentMethodDisplay = (type: PaymentMethodType) => {
  const details = paymentMethodDetails[type];
  if (!details) {
    console.warn(`No display details for payment method type: ${type}`);
    return { icon: '💰', label: type };
  }
  return details;
};

interface PaymentMethodItemProps {
  method: PaymentMethod;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

const PaymentMethodItem: React.FC<PaymentMethodItemProps> = ({ method, isSelected, onSelect }) => {
  return (
    <TouchableOpacity
      style={[
        styles.paymentMethod,
        isSelected && styles.paymentMethodSelected,
      ]}
      onPress={() => onSelect(method.id)}
    >
      <View style={styles.paymentMethodContent}>
        <Text style={styles.paymentMethodIcon}>
          {getPaymentMethodDisplay(method.type).icon}
        </Text>
        <View style={styles.paymentMethodDetails}>
          <Text style={styles.paymentMethodLabel}>
            {getPaymentMethodDisplay(method.type).label}
          </Text>
          <Text style={styles.paymentMethodInfo} numberOfLines={1}>
            {method.cardLast4
              ? `Card ending in ${method.cardLast4}`
              : method.bankLast4
              ? `Account ending in ${method.bankLast4}`
              : method.nickname || 'Payment Method'}
          </Text>
        </View>
        {method.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
        <View style={styles.radioButton}>
          {isSelected && (
            <View style={styles.radioButtonInner} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  paymentMethod: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.large,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  paymentMethodSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}1A`,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    fontSize: 28,
    marginRight: theme.spacing.md,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  paymentMethodInfo: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    marginRight: theme.spacing.sm,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: theme.colors.textOnPrimary,
    fontWeight: 'bold',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
});

export default PaymentMethodItem;
