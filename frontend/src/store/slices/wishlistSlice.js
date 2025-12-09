import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/axios';

// Async thunks
export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('wishlist/');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch wishlist');
    }
  }
);

export const toggleWishlist = createAsyncThunk(
  'wishlist/toggleWishlist',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.post('wishlist/toggle/', { product_id: productId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to toggle wishlist');
    }
  }
);

export const checkWishlistItems = createAsyncThunk(
  'wishlist/checkWishlistItems',
  async (productIds, { rejectWithValue }) => {
    try {
      const params = productIds.map(id => `product_id=${id}`).join('&');
      const response = await api.get(`wishlist/check/?${params}`);
      return response.data.wishlist_items;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to check wishlist items');
    }
  }
);

const initialState = {
  items: [],
  wishlistItemIds: new Set(),
  loading: false,
  checkingItems: false,
  error: null,
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    clearWishlist: (state) => {
      state.items = [];
      state.wishlistItemIds = new Set();
      state.error = null;
    },
    addToWishlistOptimistic: (state, action) => {
      state.wishlistItemIds.add(action.payload);
    },
    removeFromWishlistOptimistic: (state, action) => {
      state.wishlistItemIds.delete(action.payload);
    },
    // Remove item from items list (optimistic removal from UI)
    removeItemFromWishlist: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter(item => item.id !== id);
      state.wishlistItemIds.delete(id);
    },
  },
  extraReducers: (builder) => {
    // Fetch wishlist
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.wishlistItemIds = new Set(action.payload.map(item => item.id));
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Toggle wishlist
    builder
      .addCase(toggleWishlist.pending, (state) => {
        state.error = null;
      })
      .addCase(toggleWishlist.fulfilled, (state, action) => {
        // Sync state with server response
        if (action.payload.in_wishlist) {
          state.wishlistItemIds.add(action.meta.arg);
        } else {
          state.wishlistItemIds.delete(action.meta.arg);
        }
      })
      .addCase(toggleWishlist.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Check wishlist items
    builder
      .addCase(checkWishlistItems.pending, (state) => {
        state.checkingItems = true;
      })
      .addCase(checkWishlistItems.fulfilled, (state, action) => {
        state.checkingItems = false;
        state.wishlistItemIds = new Set(action.payload);
      })
      .addCase(checkWishlistItems.rejected, (state, action) => {
        state.checkingItems = false;
        state.error = action.payload;
      });
  },
});

export const { clearWishlist, addToWishlistOptimistic, removeFromWishlistOptimistic, removeItemFromWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
