import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/axios';

// ----------------------------------------------------------------------
// ASYNC ACTIONS
// ----------------------------------------------------------------------

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('cart/');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

export const addToCart = createAsyncThunk('cart/add', async (itemData, { rejectWithValue }) => {
  try {
    // itemData: { product_id, variant_id, quantity }
    const response = await api.post('cart/add/', itemData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

export const updateCartItem = createAsyncThunk('cart/update', async ({ item_id, quantity }, { rejectWithValue }) => {
  try {
    const response = await api.post('cart/update_item/', { item_id, quantity });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

export const removeFromCart = createAsyncThunk('cart/remove', async (itemId, { rejectWithValue }) => {
  try {
    const response = await api.post('cart/remove_item/', { item_id: itemId });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

// ----------------------------------------------------------------------
// SLICE
// ----------------------------------------------------------------------

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    totalPrice: 0,
    loading: false,
    error: null,
    operationLoading: false, // For adding/removing specific items to avoid full page spinner
  },
  reducers: {
    clearCart: (state) => {
      state.items = [];
      state.totalPrice = 0;
    },
    resetCartError: (state) => {
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // FETCH
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.totalPrice = action.payload.total_price;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ADD
      .addCase(addToCart.pending, (state) => {
        state.operationLoading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.operationLoading = false;
        // Server returns the FULL updated cart, so we just replace state
        state.items = action.payload.items;
        state.totalPrice = action.payload.total_price;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.operationLoading = false;
        // Handle specific error messages from backend (e.g., "Out of Stock")
        state.error = action.payload?.error || 'Failed to add to cart';
      })

      // UPDATE
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.totalPrice = action.payload.total_price;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.error = action.payload?.error || 'Failed to update cart';
      })

      // REMOVE
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.totalPrice = action.payload.total_price;
      });
  },
});

export const { clearCart, resetCartError } = cartSlice.actions;
export default cartSlice.reducer;