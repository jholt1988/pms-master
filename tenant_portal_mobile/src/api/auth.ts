import { apiService } from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: 'TENANT' | 'PROPERTY_MANAGER' | 'ADMIN';
    firstName?: string;
    lastName?: string;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export const authApi = {
  /**
   * Login with username and password
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiService.post<LoginResponse>('/auth/login', credentials);
    
    // Save token to secure storage
    if (response.accessToken) {
      await apiService.setAuthToken(response.accessToken);
    }
    
    return response;
  },

  /**
   * Register new tenant account
   */
  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await apiService.post<LoginResponse>('/auth/register', data);
    
    // Save token to secure storage
    if (response.accessToken) {
      await apiService.setAuthToken(response.accessToken);
    }
    
    return response;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    return apiService.get<UserProfile>('/auth/profile');
  },

  /**
   * Logout - clear token
   */
  logout: async (): Promise<void> => {
    await apiService.clearAuthToken();
  },

  /**
   * Change password
   */
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    return apiService.post('/auth/change-password', data);
  },

  /**
   * Request password reset
   */
  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
    return apiService.post('/auth/forgot-password', data);
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    return apiService.post('/auth/reset-password', data);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async (): Promise<boolean> => {
    const token = await apiService.getAuthToken();
    return !!token;
  },
};
