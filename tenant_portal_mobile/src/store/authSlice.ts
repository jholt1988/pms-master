import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, LoginRequest, LoginResponse, RegisterRequest, UserProfile } from '../api/auth';
import { getErrorMessage } from '../utils/error';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: LoginResponse['user'] | null;
  rememberMe: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  user: null,
  rememberMe: false,
};

type AuthThunkConfig = {
  rejectValue: string;
};

type LoginThunkResponse = LoginResponse & { rememberMe: boolean };

const normalizeRole = (role: string): LoginResponse['user']['role'] => {
  if (role === 'PROPERTY_MANAGER' || role === 'ADMIN' || role === 'TENANT') {
    return role;
  }
  return 'TENANT';
};

const mapProfileToUser = (profile: UserProfile): LoginResponse['user'] => ({
  id: profile.id,
  username: profile.username,
  email: profile.email,
  role: normalizeRole(profile.role),
  firstName: profile.firstName,
  lastName: profile.lastName,
});

// Async thunks
export const login = createAsyncThunk<LoginThunkResponse, LoginRequest & { rememberMe?: boolean }, AuthThunkConfig>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login({
        username: credentials.username,
        password: credentials.password,
      });
      return { ...response, rememberMe: credentials.rememberMe || false };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Login failed'));
    }
  }
);

export const register = createAsyncThunk<LoginResponse, RegisterRequest, AuthThunkConfig>(
  'auth/register',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authApi.register(data);
      return response;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Registration failed'));
    }
  }
);

export const logout = createAsyncThunk<void, void, AuthThunkConfig>('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authApi.logout();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to logout'));
  }
});

export const checkAuth = createAsyncThunk<UserProfile, void, AuthThunkConfig>(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const isAuthenticated = await authApi.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated');
      }
      const profile = await authApi.getProfile();
      return profile;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Not authenticated'));
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setRememberMe: (state, action: PayloadAction<boolean>) => {
      state.rememberMe = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<LoginThunkResponse>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.rememberMe = action.payload.rememberMe;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = (action.payload as string) ?? 'Login failed';
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Registration failed';
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Failed to logout';
      });

    // Check Auth
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = mapProfileToUser(action.payload);
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = (action.payload as string) ?? 'Not authenticated';
      });
  },
});

export const { clearError, setRememberMe } = authSlice.actions;
export default authSlice.reducer;
