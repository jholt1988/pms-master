import React, { useEffect, useMemo, useState } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Switch,
  Divider,
} from '@nextui-org/react';
import { useAuth } from '../../../../AuthContext';
import { apiFetch } from '../../../../services/apiClient';
import { StatsCard, DataTable, PageHeader, DataTableColumn } from '../../../../components/ui';
import type { 
  Invoice, 
  Payment, 
  PaymentMethod, 
  AutopayStatus,
  PaymentMethodForm
} from './types';

const defaultMethodForm: PaymentMethodForm = {
  type: 'CARD',
  provider: 'STRIPE',
  last4: '',
  brand: '',
  expMonth: '',
  expYear: '',
  providerCustomerId: '',
  providerPaymentMethodId: '',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatCurrency = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  return currencyFormatter.format(value);
};

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString();
};



export default function PaymentsPage(): React.ReactElement {
  const { token } = useAuth();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [methodForm, setMethodForm] = useState(defaultMethodForm);
  const [autopay, setAutopay] = useState<AutopayStatus | null>(null);

  const [autopayMaxAmount, setAutopayMaxAmount] = useState<string>('');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);


  // Calculate derived values
  const openInvoices = invoices.filter((inv) => ['PENDING', 'DUE', 'OVERDUE'].includes(inv.status.toUpperCase()));
  const totalDue = openInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const nextInvoice = openInvoices
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const lastPayment = payments
    .filter((p) => ['COMPLETED', 'SETTLED'].includes(p.status.toUpperCase()))
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];

  // Table column definitions
  const invoiceColumns: DataTableColumn[] = [
    { key: 'invoiceId', label: 'INVOICE' },
    { key: 'dueDate', label: 'DUE DATE' },
    { key: 'amount', label: 'AMOUNT' },
    { key: 'status', label: 'STATUS' },
  ];

  const paymentColumns: DataTableColumn[] = [
    { key: 'paymentId', label: 'PAYMENT' },
    { key: 'paymentDate', label: 'DATE' },
    { key: 'amount', label: 'AMOUNT' },
    { key: 'status', label: 'STATUS' },
  ];

  useEffect(() => {
    const loadInvoicesAndPayments = async () => {
      if (!token) {
        return;
      }

      const [invoicesData, paymentsData] = await Promise.all([
        apiFetch('/payments/invoices', { token }),
        apiFetch('/payments', { token }),
      ]);

      setInvoices(invoicesData);
      setPayments(paymentsData);
    };

    const loadBillingExtras = async () => {
      if (!token) {
        return;
      }

      try {
        const methodsData = await apiFetch('/payment-methods', { token });
        setPaymentMethods(methodsData);
      } catch (err) {
        console.error('Failed to fetch payment methods:', err);
      }

      try {
        const autopayData = await apiFetch('/billing/autopay', { token });
        setAutopay(autopayData as AutopayStatus);
        if (autopayData.enrollment?.paymentMethodId) {
          setSelectedMethodId(String(autopayData.enrollment.paymentMethodId));
        }
        if (typeof autopayData.enrollment?.maxAmount === 'number') {
          setAutopayMaxAmount(String(autopayData.enrollment.maxAmount));
        }
      } catch (err: any) {
        if (err.message?.includes('404')) {
          setAutopay(null);
        } else {
          console.error('Failed to fetch autopay status:', err);
        }
      }
    };

    const fetchAll = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        await Promise.all([loadInvoicesAndPayments(), loadBillingExtras()]);
      } catch (err) {
        console.error('Error loading payment data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load payment information');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [token]);

  const handleAddPaymentMethod = async () => {
    if (!token || actionLoading) return;

    try {
      setActionLoading(true);
      setError(null);

      await apiFetch('/payment-methods', {
        token,
        method: 'POST',
        body: methodForm,
      });

      // Reload payment methods and autopay status
      try {
        const methodsData = await apiFetch('/payment-methods', { token });
        setPaymentMethods(methodsData);
      } catch (err) {
        console.error('Failed to fetch payment methods:', err);
      }

      try {
        const autopayData = await apiFetch('/billing/autopay', { token });
        setAutopay(autopayData as AutopayStatus);
        if (autopayData.enrollment?.paymentMethodId) {
          setSelectedMethodId(String(autopayData.enrollment.paymentMethodId));
        }
        if (typeof autopayData.enrollment?.maxAmount === 'number') {
          setAutopayMaxAmount(String(autopayData.enrollment.maxAmount));
        }
      } catch (err: any) {
        if (err.message?.includes('404')) {
          setAutopay(null);
        } else {
          console.error('Failed to fetch autopay status:', err);
        }
      }
      setMethodForm(defaultMethodForm);
      setNotice('Payment method added successfully!');
      onOpenChange();
    } catch (err) {
      console.error('Error adding payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardBody className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-medium text-foreground-600">Loading payment information...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <PageHeader
        title="Payments & billing"
        subtitle="Review open invoices, payment history, and manage autopay preferences for your lease."
      />

      {/* Error/Notice Messages */}
      {error && (
        <Card className="border-danger-200 bg-danger-50">
          <CardBody>
            <p className="text-small text-danger-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {notice && (
        <Card className="border-success-200 bg-success-50">
          <CardBody>
            <p className="text-small text-success-700">{notice}</p>
          </CardBody>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard
          title="Balance due"
          value={formatCurrency(totalDue)}
          subtitle={`${openInvoices.length} open invoice${openInvoices.length === 1 ? '' : 's'}`}
        />
        
        <StatsCard
          title="Next due date"
          value={nextInvoice ? formatDate(nextInvoice.dueDate) : '—'}
          subtitle={nextInvoice ? `Amount ${formatCurrency(nextInvoice.amount)}` : 'No upcoming invoices'}
          valueColor="warning"
        />
        
        <StatsCard
          title="Last payment"
          value={lastPayment ? formatCurrency(lastPayment.amount) : '—'}
          subtitle={lastPayment ? `Paid ${formatDate(lastPayment.paymentDate)}` : 'No payment history yet'}
          valueColor="success"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Invoices Table */}
          <DataTable
            title="Invoices"
            subtitle="Statements generated for your lease."
            columns={invoiceColumns}
            data={invoices.map(invoice => ({
              ...invoice,
              invoiceId: `#${invoice.id}`,
              dueDate: formatDate(invoice.dueDate),
              amount: formatCurrency(invoice.amount),
            }))}
            emptyContent="No invoices have been generated yet."
          />

          {/* Payments Table */}
          <DataTable
            title="Payment history"
            subtitle="Your recent payment transactions."
            columns={paymentColumns}
            data={payments.map(payment => ({
              ...payment,
              paymentId: `#${payment.id}`,
              paymentDate: formatDate(payment.paymentDate),
              amount: formatCurrency(payment.amount),
            }))}
            emptyContent="No payment history yet."
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Autopay Settings */}
          <Card className="shadow-medium">
            <CardHeader className="pb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Autopay settings</h3>
                <p className="text-small text-foreground-500">Automatically pay your rent.</p>
              </div>
            </CardHeader>
            <CardBody className="pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-small font-medium">Enable autopay</p>
                <Switch
                  isSelected={autopay?.enrollment?.active || false}
                  size="sm"
                />
              </div>
              
              {autopay?.enrollment?.active && (
                <>
                  <Divider />
                  <div className="space-y-3">
                    <Input
                      label="Maximum amount"
                      placeholder="Enter max amount"
                      value={autopayMaxAmount}
                      onChange={(e) => setAutopayMaxAmount(e.target.value)}
                      startContent="$"
                      size="sm"
                    />
                    
                    <Select
                      label="Payment method"
                      placeholder="Select payment method"
                      selectedKeys={selectedMethodId ? [selectedMethodId] : []}
                      size="sm"
                    >
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id.toString()}>
                          {method.brand} •••• {method.last4}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Payment Methods */}
          <Card className="shadow-medium">
            <CardHeader className="pb-4 flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Payment methods</h3>
                <p className="text-small text-foreground-500">Manage your saved cards.</p>
              </div>
              <Button
                color="primary"
                size="sm"
                onPress={onOpen}
              >
                Add method
              </Button>
            </CardHeader>
            <CardBody className="pt-0">
              {paymentMethods.length === 0 ? (
                <p className="text-small text-foreground-400 text-center py-4">
                  No payment methods saved yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <Card key={method.id} className="border border-divider">
                      <CardBody className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-small font-medium">{method.brand} •••• {method.last4}</p>
                            <p className="text-tiny text-foreground-400">
                              Expires {method.expMonth}/{method.expYear}
                            </p>
                          </div>
                          <Button
                            color="danger"
                            variant="light"
                            size="sm"
                            className="text-tiny"
                          >
                            Remove
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Add Payment Method</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Card Number"
                    placeholder="1234 5678 9012 3456"
                    value={methodForm.last4}
                    onChange={(e) => setMethodForm({ ...methodForm, last4: e.target.value.slice(-4) })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Expiry Month"
                      placeholder="MM"
                      value={methodForm.expMonth}
                      onChange={(e) => setMethodForm({ ...methodForm, expMonth: e.target.value })}
                    />
                    <Input
                      label="Expiry Year" 
                      placeholder="YYYY"
                      value={methodForm.expYear}
                      onChange={(e) => setMethodForm({ ...methodForm, expYear: e.target.value })}
                    />
                  </div>
                  <Select
                    label="Card Brand"
                    selectedKeys={methodForm.brand ? [methodForm.brand] : []}
                    onChange={(e) => setMethodForm({ ...methodForm, brand: e.target.value })}
                  >
                    <SelectItem key="visa" value="visa">Visa</SelectItem>
                    <SelectItem key="mastercard" value="mastercard">Mastercard</SelectItem>
                    <SelectItem key="amex" value="amex">American Express</SelectItem>
                  </Select>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleAddPaymentMethod}
                  isLoading={actionLoading}
                >
                  Add Method
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}