import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, UserProfile } from '../api/auth';
import { getErrorMessage } from '../utils/error';

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

// Async thunks
type UserThunkConfig = {
  rejectValue: string;
};

export const fetchProfile = createAsyncThunk<UserProfile, void, UserThunkConfig>(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const profile = await authApi.getProfile();
      return profile;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch profile'));
    }
  }
);

export const updateProfile = createAsyncThunk<Partial<UserProfile>, Partial<UserProfile>, UserThunkConfig>(
  'user/updateProfile',
  async (data, { rejectWithValue }) => {
    try {
      // TODO: Implement update profile API
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update profile'));
    }
  }
);

export const changePassword = createAsyncThunk<
  { message: string },
  { currentPassword: string; newPassword: string },
  UserThunkConfig
>(
  'user/changePassword',
  async (data, { rejectWithValue }) => {
    try {
      await authApi.changePassword(data);
      return { message: 'Password changed successfully' };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to change password'));
    }
  }
);

// Slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
    clearProfile: (state) => {
      state.profile = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.isLoading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Failed to fetch profile';
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<Partial<UserProfile>>) => {
        state.isLoading = false;
        state.profile = state.profile ? { ...state.profile, ...action.payload } : (action.payload as UserProfile);
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Failed to update profile';
      });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Failed to change password';
      });
  },
});

export const { clearUserError, clearProfile } = userSlice.actions;
export default userSlice.reducer;
