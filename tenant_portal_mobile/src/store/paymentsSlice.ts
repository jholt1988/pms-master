import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { paymentsApi, Payment, PaymentMethod, AutoPaySettings, CreatePaymentResponse, CreatePaymentMethodRequest } from '../api/payments';
import type { Lease, PaymentSummary } from '../types/payment';
import { getErrorMessage } from '../utils/error';

interface PaymentsState {
  payments: Payment[];
  currentLease: Lease | null;
  paymentSummary: PaymentSummary | null;
  paymentMethods: PaymentMethod[];
  autoPaySettings: AutoPaySettings | null;
  selectedPayment: Payment | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PaymentsState = {
  payments: [],
  currentLease: null,
  paymentSummary: null,
  paymentMethods: [],
  autoPaySettings: null,
  selectedPayment: null,
  isLoading: false,
  error: null,
};

type ThunkConfig = {
  rejectValue: string;
};

interface CreatePaymentParams {
  leaseId: number;
  amount: number;
  paymentMethodId: number;
  description?: string;
}

// Async thunks
export const fetchCurrentLease = createAsyncThunk<Lease, void, ThunkConfig>(
  'payments/fetchCurrentLease',
  async (_, { rejectWithValue }) => {
    try {
      const lease = await paymentsApi.getCurrentLease();
      return lease;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch lease'));
    }
  }
);

export const fetchPaymentSummary = createAsyncThunk<PaymentSummary, void, ThunkConfig>(
  'payments/fetchPaymentSummary',
  async (_, { rejectWithValue }) => {
    try {
      const summary = await paymentsApi.getPaymentSummary();
      return summary;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch payment summary'));
    }
  }
);

export const fetchPayments = createAsyncThunk<Payment[], void, ThunkConfig>(
  'payments/fetchPayments',
  async (_, { rejectWithValue }) => {
    try {
      const payments = await paymentsApi.getPayments();
      return payments;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch payments'));
    }
  }
);

export const fetchPaymentById = createAsyncThunk<Payment, number, ThunkConfig>(
  'payments/fetchPaymentById',
  async (paymentId, { rejectWithValue }) => {
    try {
      const payment = await paymentsApi.getPayment(paymentId);
      return payment;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch payment'));
    }
  }
);

export const createPayment = createAsyncThunk<CreatePaymentResponse, CreatePaymentParams, ThunkConfig>(
  'payments/createPayment',
  async (data, { rejectWithValue }) => {
    try {
      const payment = await paymentsApi.createPayment(data);
      return payment;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create payment'));
    }
  }
);

export const confirmPayment = createAsyncThunk<Payment, number, ThunkConfig>(
  'payments/confirmPayment',
  async (paymentId, { rejectWithValue }) => {
    try {
      const payment = await paymentsApi.confirmPayment(paymentId);
      return payment;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to confirm payment'));
    }
  }
);

export const cancelPayment = createAsyncThunk<Payment, number, ThunkConfig>(
  'payments/cancelPayment',
  async (paymentId, { rejectWithValue }) => {
    try {
      const payment = await paymentsApi.cancelPayment(paymentId);
      return payment;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to cancel payment'));
    }
  }
);

export const fetchPaymentMethods = createAsyncThunk<PaymentMethod[], void, ThunkConfig>(
  'payments/fetchPaymentMethods',
  async (_, { rejectWithValue }) => {
    try {
      const methods = await paymentsApi.getPaymentMethods();
      return methods;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch payment methods'));
    }
  }
);

export const addPaymentMethod = createAsyncThunk<PaymentMethod, CreatePaymentMethodRequest, ThunkConfig>(
  'payments/addPaymentMethod',
  async (data, { rejectWithValue }) => {
    try {
      const method = await paymentsApi.addPaymentMethod(data);
      return method;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to add payment method'));
    }
  }
);

export const deletePaymentMethod = createAsyncThunk<number, number, ThunkConfig>(
  'payments/deletePaymentMethod',
  async (methodId, { rejectWithValue }) => {
    try {
      await paymentsApi.deletePaymentMethod(methodId);
      return methodId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete payment method'));
    }
  }
);

export const setDefaultPaymentMethod = createAsyncThunk<PaymentMethod, number, ThunkConfig>(
  'payments/setDefaultPaymentMethod',
  async (methodId, { rejectWithValue }) => {
    try {
      const method = await paymentsApi.setDefaultPaymentMethod(methodId);
      return method;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to set default payment method'));
    }
  }
);

export const fetchAutoPaySettings = createAsyncThunk<AutoPaySettings, number, ThunkConfig>(
  'payments/fetchAutoPaySettings',
  async (leaseId, { rejectWithValue }) => {
    try {
      const settings = await paymentsApi.getAutoPaySettings(leaseId);
      return settings;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch auto-pay settings'));
    }
  }
);

export const updateAutoPaySettings = createAsyncThunk<AutoPaySettings, AutoPaySettings, ThunkConfig>(
  'payments/updateAutoPaySettings',
  async (data, { rejectWithValue }) => {
    try {
      const settings = await paymentsApi.updateAutoPaySettings(data);
      return settings;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update auto-pay settings'));
    }
  }
);

// Slice
const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedPayment: (state) => {
      state.selectedPayment = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch current lease
    builder
      .addCase(fetchCurrentLease.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentLease.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentLease = action.payload;
      })
      .addCase(fetchCurrentLease.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch payment summary
    builder
      .addCase(fetchPaymentSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPaymentSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentSummary = action.payload;
      })
      .addCase(fetchPaymentSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch payments
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments = action.payload;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch payment by ID
    builder
      .addCase(fetchPaymentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPaymentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPayment = action.payload;
      })
      .addCase(fetchPaymentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create payment
    builder
      .addCase(createPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPayment = action.payload.payment;
      })
      .addCase(createPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Confirm payment
    builder
      .addCase(confirmPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.payments.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        state.selectedPayment = action.payload;
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel payment
    builder
      .addCase(cancelPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.payments.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        state.selectedPayment = action.payload;
      })
      .addCase(cancelPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch payment methods
    builder
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentMethods = action.payload;
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Add payment method
    builder
      .addCase(addPaymentMethod.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentMethods.push(action.payload);
      })
      .addCase(addPaymentMethod.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete payment method
    builder
      .addCase(deletePaymentMethod.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePaymentMethod.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentMethods = state.paymentMethods.filter(m => m.id !== action.payload);
      })
      .addCase(deletePaymentMethod.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Set default payment method
    builder
      .addCase(setDefaultPaymentMethod.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setDefaultPaymentMethod.fulfilled, (state, action) => {
        state.isLoading = false;
        // Clear all default flags
        state.paymentMethods = state.paymentMethods.map(m => ({ ...m, isDefault: false }));
        // Set new default
        const index = state.paymentMethods.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.paymentMethods[index] = action.payload;
        }
      })
      .addCase(setDefaultPaymentMethod.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch auto-pay settings
    builder
      .addCase(fetchAutoPaySettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAutoPaySettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.autoPaySettings = action.payload;
      })
      .addCase(fetchAutoPaySettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update auto-pay settings
    builder
      .addCase(updateAutoPaySettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAutoPaySettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.autoPaySettings = action.payload;
      })
      .addCase(updateAutoPaySettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedPayment } = paymentsSlice.actions;
export default paymentsSlice.reducer;
