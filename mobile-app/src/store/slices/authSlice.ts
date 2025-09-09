import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, LoginRequest, VerifyOTPRequest } from '../../types';
import * as authService from '../../services/authService';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const loginWithPhoneNumber = createAsyncThunk(
  'auth/loginWithPhoneNumber',
  async (data: LoginRequest) => {
    return await authService.loginWithPhoneNumber(data.phoneNumber);
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (data: VerifyOTPRequest) => {
    return await authService.verifyOTP(data.phoneNumber, data.otp);
  }
);

export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async () => {
    return await authService.loginWithGoogle();
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    return await authService.logout();
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: Partial<User>) => {
    return await authService.updateProfile(profileData);
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login with phone number
      .addCase(loginWithPhoneNumber.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithPhoneNumber.fulfilled, (state) => {
        state.isLoading = false;
        // OTP sent successfully, user needs to verify
      })
      .addCase(loginWithPhoneNumber.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to send OTP';
      })
      
      // Verify OTP
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Invalid OTP';
      })
      
      // Google login
      .addCase(loginWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Google login failed';
      })
      
      // Logout
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(logout.rejected, (state) => {
        state.isLoading = false;
      })
      
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update profile';
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
