import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/axios';

// ----------------------------------------------------------------------
// ASYNC ACTIONS
// ----------------------------------------------------------------------

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    // We use the custom AuthViewSet endpoint or SimpleJWT default
    // Using the custom one created in views.py that returns user object + tokens
    const response = await api.post('auth/login/', credentials);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return rejectWithValue(error.response.data);
    }
    return rejectWithValue({ error: 'Network Error' });
  }
});

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post('auth/register/', userData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return rejectWithValue(error.response.data);
    }
    return rejectWithValue({ error: 'Registration failed' });
  }
});

export const fetchUserProfile = createAsyncThunk('auth/profile', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('auth/me/');
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

// Password Reset Thunks
export const requestPasswordReset = createAsyncThunk('auth/requestPasswordReset', async (email, { rejectWithValue }) => {
  try {
    const response = await api.post('auth/password/request-otp/', { email });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return rejectWithValue(error.response.data);
    }
    return rejectWithValue({ error: 'Failed to request OTP' });
  }
});

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async ({ email, otp }, { rejectWithValue }) => {
  try {
    const response = await api.post('auth/password/verify-otp/', { email, otp });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return rejectWithValue(error.response.data);
    }
    return rejectWithValue({ error: 'Invalid OTP' });
  }
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async ({ email, otp, new_password }, { rejectWithValue }) => {
  try {
    const response = await api.post('auth/password/reset/', { email, otp, new_password });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return rejectWithValue(error.response.data);
    }
    return rejectWithValue({ error: 'Failed to reset password' });
  }
});

// ----------------------------------------------------------------------
// SLICE
// ----------------------------------------------------------------------

// Safely hydration from localStorage
const getUserFromStorage = () => {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
};

const initialState = {
  user: getUserFromStorage(),
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,
  error: null,
  resetPasswordState: {
    step: 1, // 1: Request, 2: Verify, 3: Reset
    email: '',
    otpVerified: false,
    message: null,
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
        state.error = null;
    },
    setResetStep: (state, action) => {
      state.resetPasswordState.step = action.payload;
    },
    clearResetState: (state) => {
      state.resetPasswordState = {
        step: 1,
        email: '',
        otpVerified: false,
        message: null,
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access;
        // Persist
        localStorage.setItem('access_token', action.payload.access);
        localStorage.setItem('refresh_token', action.payload.refresh);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.detail || action.payload?.error || 'Login failed';
      })

      // REGISTER
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access;
        localStorage.setItem('access_token', action.payload.access);
        localStorage.setItem('refresh_token', action.payload.refresh);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? JSON.stringify(action.payload) : 'Registration failed';
      })
      
      // PROFILE FETCH (Syncs local user state with server)
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
          state.user = action.payload;
          localStorage.setItem('user', JSON.stringify(action.payload));
      })

      // REQUEST PASSWORD RESET
      .addCase(requestPasswordReset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state, action) => {
        state.loading = false;
        state.resetPasswordState.step = 2; // Move to Verify OTP
        state.resetPasswordState.email = action.meta.arg;
        state.resetPasswordState.message = action.payload.message;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to request OTP';
      })

      // VERIFY OTP
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.loading = false;
        state.resetPasswordState.otpVerified = true;
        state.resetPasswordState.step = 3; // Move to Reset Password
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Invalid OTP';
      })

      // RESET PASSWORD
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.resetPasswordState.message = 'Password reset successfully. Please login.';
        // Don't auto-login, redirect user to login page manually in component
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to reset password';
      });
  },
});

export const { logout, clearError, setResetStep, clearResetState } = authSlice.actions;
export default authSlice.reducer;