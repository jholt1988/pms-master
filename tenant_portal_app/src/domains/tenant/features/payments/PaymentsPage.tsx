import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Tabs,
  Tab,
  Switch,
  Divider,
  Select,
  SelectItem
} from '@nextui-org/react';
import {
  CreditCard,
  Plus,
  DollarSign,
  Calendar,
  Download,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { DegradedStateCard } from '../../../../components/ui/DegradedStateCard';
import { apiFetch } from '../../../../services/apiClient';
import { useAuth } from '../../../../AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

interface PaymentMethod {
  id: number;
  type: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  provider: string;
}

interface Invoice {
  id: number;
  amount: number;
  description: string;
  dueDate: string;
  status: 'PAID' | 'UNPAID' | 'OVERDUE' | 'PENDING';
  issuedAt: string;
  pdfUrl?: string;
}

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  status: string;
  method?: {
    brand: string;
    last4: string;
  };
}

interface AutopayEnrollment {
  active: boolean;
  paymentMethodId?: number;
  maxAmount?: number;
}

interface AutopayStatus {
  enrolled: boolean;
  enrollment?: AutopayEnrollment;
}

// Separate component for the form to use Stripe Hooks
const PaymentMethodForm = ({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !token) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      // 1) Ask backend for SetupIntent (off_session-ready flow)
      const setup = await apiFetch('/payments/payment-methods/setup-intent', {
        token,
        method: 'POST',
      }) as { clientSecret?: string };

      if (!setup?.clientSecret) {
        throw new Error('Unable to initialize card setup.');
      }

      // 2) Confirm card setup with Stripe
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(setup.clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      const paymentMethodId = (setupIntent?.payment_method as string | undefined);
      if (!paymentMethodId) {
        throw new Error('Card setup did not return a payment method.');
      }

      // 3) Persist payment method metadata in backend
      await apiFetch('/payments/payment-methods', {
        token,
        method: 'POST',
        body: {
          type: 'CARD',
          provider: 'STRIPE',
          providerPaymentMethodId: paymentMethodId,
        }
      });

      onSuccess();
    } catch (err: any) {
      console.error('Payment method creation failed', err);
      setError(err.message || 'Failed to add payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-danger-50 text-danger-700 p-3 rounded-md text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="border border-default-200 rounded-lg p-4 bg-white">
        <label className="block text-sm font-medium text-foreground-700 mb-2">
          Card Information
        </label>
        <div className="p-3 border rounded-md">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="light" onPress={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          color="primary"
          type="submit"
          isLoading={isProcessing}
          isDisabled={!stripe}
        >
          Add Card
        </Button>
      </div>
    </form>
  );
};

const PaymentsPage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('invoices');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [autopay, setAutopay] = useState<AutopayStatus | null>(null);

  // Autopay local state
  const [autopayMaxAmount, setAutopayMaxAmount] = useState<string>('');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setFetchError(null);
      const [invoicesData, methodsData, historyData] = await Promise.all([
        apiFetch('/payments/invoices', { token }).catch(() => []),
        apiFetch('/payments/payment-methods', { token }).catch(() => []),
        apiFetch('/payments/history', { token }).catch(() => [])
      ]);

      setInvoices(Array.isArray(invoicesData) ? invoicesData : (Array.isArray((invoicesData as any)?.invoices) ? (invoicesData as any).invoices : []));
      setPaymentMethods(Array.isArray(methodsData) ? methodsData : (Array.isArray((methodsData as any)?.paymentMethods) ? (methodsData as any).paymentMethods : []));
      setPaymentHistory(Array.isArray(historyData) ? historyData : (Array.isArray((historyData as any)?.payments) ? (historyData as any).payments : []));

      // Fetch Autopay separately as it might 404
      try {
        const autopayData = await apiFetch('/billing/autopay', { token });
        setAutopay(autopayData);
        if (autopayData.enrollment) {
          if (autopayData.enrollment.paymentMethodId) {
            setSelectedMethodId(String(autopayData.enrollment.paymentMethodId));
          }
          if (autopayData.enrollment.maxAmount) {
            setAutopayMaxAmount(String(autopayData.enrollment.maxAmount));
          }
        }
      } catch (e: any) {
        // If 404, it just means no autopay configured
        if (!e.message?.includes('404')) {
          console.error(e);
        }
        setAutopay(null);
      }

    } catch (err) {
      console.error('Failed to fetch payment data', err);
      setFetchError(err instanceof Error ? err.message : 'Unable to load payment data right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleMethodAdded = async () => {
    await fetchData();
    onClose();
  };

  const handleDeleteMethod = async (id: number) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to remove this payment method?')) return;

    try {
      await apiFetch(`/payments/payment-methods/${id}`, { token, method: 'DELETE' });
      setPaymentMethods(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete payment method', err);
      alert('Failed to remove payment method');
    }
  };

  const handleAutopayToggle = async (value: boolean) => {
    if (!token) return;
    try {
      if (!value) {
        // Disable autopay (assuming delete or update active=false)
        // Implementation depends on backend, assuming DELETE or PUT
        // For now, let's assume we can just calculate what needs to change
        // But usually toggling off means deleting the enrollment or setting active=false
        alert("To disable autopay, please contact support or clear settings (Not implemented fully in backend demo)");
        return;
      }
      // Logic to enable would typically require settings first
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutopayUpdate = async () => {
    if (!token || !selectedMethodId || !autopayMaxAmount) return;
    try {
      await apiFetch('/billing/autopay', {
        token,
        method: 'PUT',
        body: {
          paymentMethodId: parseInt(selectedMethodId),
          maxAmount: parseFloat(autopayMaxAmount),
          active: true
        }
      });
      alert('Autopay settings saved');
      fetchData();
    } catch (err) {
      console.error('Failed to update autopay', err);
      alert('Failed to update autopay settings');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'OVERDUE': return 'danger';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  // Derived state
  const openInvoices = invoices.filter(i => i.status !== 'PAID');
  const nextInvoice = openInvoices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const lastPayment = paymentHistory[0];
  const balanceDue = openInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  if (isLoading) {
    return (
      <div className="section flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="section space-y-6">
      <PageHeader
        title="Payments & Billing"
        subtitle="Manage your invoices, payment methods, and billing history"
      />

      {fetchError && (
        <DegradedStateCard
          title="Billing data is temporarily unavailable"
          message={fetchError}
          onRetry={fetchData}
          supportHint="You can still use saved payment methods and retry invoice/history refresh from this page."
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary-50 border-primary-100">
          <CardBody>
            <p className="text-sm text-primary-600 font-medium">Balance Due</p>
            <h3 className="text-2xl font-bold text-primary-700 mt-1">${balanceDue.toFixed(2)}</h3>
            <p className="text-sm text-primary-600 mt-2 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> {openInvoices.length} open invoice{openInvoices.length === 1 ? '' : 's'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm text-foreground-500 font-medium">Next Due Date</p>
            <h3 className="text-2xl font-bold text-foreground-700 mt-1">
              {nextInvoice ? format(new Date(nextInvoice.dueDate), 'MMM d, yyyy') : 'N/A'}
            </h3>
            <p className="text-sm text-foreground-500 mt-2">
              {nextInvoice ? `Amount $${nextInvoice.amount.toFixed(2)}` : 'No upcoming invoices'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm text-foreground-500 font-medium">Last Payment</p>
            <h3 className="text-2xl font-bold text-foreground-700 mt-1">
              {lastPayment ? `$${lastPayment.amount.toFixed(2)}` : 'N/A'}
            </h3>
            <p className="text-sm text-foreground-500 mt-2">
              {lastPayment ? `Paid ${format(new Date(lastPayment.paymentDate), 'MMM d, yyyy')}` : 'No payment history'}
            </p>
          </CardBody>
        </Card>
      </div>

      <Tabs
        aria-label="Payment Options"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        color="primary"
        variant="underlined"
      >
        <Tab key="invoices" title="Invoices">
          <div className="space-y-4 pt-4">
            {invoices.length === 0 ? (
              <p className="text-foreground-500 text-center py-8">No invoices found.</p>
            ) : (
              invoices.map(invoice => (
                <Card key={invoice.id} className="shadow-small">
                  <CardBody className="flex flex-row items-center justify-between p-4">
                    <div className="flex gap-4 items-center">
                      <div className="p-2 bg-default-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-foreground-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{invoice.description}</p>
                        <p className="text-sm text-foreground-500">
                          Due {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">${invoice.amount.toFixed(2)}</p>
                        <Chip size="sm" color={getStatusColor(invoice.status)} variant="flat">
                          {invoice.status}
                        </Chip>
                      </div>
                      {invoice.pdfUrl && (
                        <Button isIconOnly variant="light" aria-label="Download Invoice" as="a" href={invoice.pdfUrl} target="_blank">
                          <Download className="w-4 h-4 text-foreground-500" />
                        </Button>
                      )}
                      {invoice.status !== 'PAID' && (
                        <Button color="primary" size="sm">Pay Now</Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </Tab>

        <Tab key="methods" title="Payment Methods">
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Saved Cards</h3>
              <Button
                onPress={onOpen}
                startContent={<Plus className="w-4 h-4" />}
                color="primary"
                variant="flat"
              >
                Add Payment Method
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.length === 0 ? (
                <p className="text-foreground-500 text-center py-8 col-span-full">No payment methods saved yet.</p>
              ) : (
                paymentMethods.map(method => (
                  <Card key={method.id} className="border border-default-200">
                    <CardBody className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 text-primary rounded-md">
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {method.brand} •••• {method.last4}
                          </p>
                          <p className="text-xs text-foreground-500">
                            Expires {method.expMonth}/{method.expYear}
                          </p>
                        </div>
                      </div>
                      <Button
                        isIconOnly
                        color="danger"
                        variant="light"
                        onPress={() => handleDeleteMethod(method.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          </div>
        </Tab>

        <Tab key="autopay" title="Autopay Settings">
          <Card className="shadow-medium mt-4">
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
                  onValueChange={handleAutopayToggle}
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
                      type="number"
                    />

                    <Select
                      label="Payment method"
                      placeholder="Select payment method"
                      selectedKeys={selectedMethodId ? [selectedMethodId] : []}
                      onSelectionChange={(keys) => setSelectedMethodId(Array.from(keys).join(','))}
                      size="sm"
                    >
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id.toString()} textValue={`${method.brand} •••• ${method.last4}`}>
                          <div className="flex gap-2 items-center">
                            <CreditCard className="w-4 h-4" />
                            <span>{method.brand} •••• {method.last4}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </Select>
                    <Button color="primary" size="sm" onPress={handleAutopayUpdate}>
                      Save Autopay Settings
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Tab>

        <Tab key="history" title="History">
          <div className="pt-4">
            {paymentHistory.length === 0 ? (
              <p className="text-foreground-500 text-center py-8">No payment history found.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {paymentHistory.map(payment => (
                  <Card key={payment.id} className="shadow-small">
                    <CardBody className="flex flex-row justify-between items-center p-3">
                      <div>
                        <p className="font-medium">Payment</p>
                        <p className="text-xs text-foreground-500">
                          {format(new Date(payment.paymentDate), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">-${payment.amount.toFixed(2)}</p>
                        <p className="text-xs text-foreground-500 capitalize">{payment.status}</p>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tab>
      </Tabs>

      {/* Add Payment Method Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Add Payment Method</ModalHeader>
              <ModalBody>
                <Elements stripe={stripePromise}>
                  <PaymentMethodForm onSuccess={handleMethodAdded} onCancel={onClose} />
                </Elements>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default PaymentsPage;