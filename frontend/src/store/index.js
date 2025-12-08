import { configureStore } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';

// Enable Immer MapSet support for Set data structures
enableMapSet();

/**
 * Industry Standard Store Setup
 * - Includes devTools enabled only in development
 * - Scalable slice architecture
 */

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    // future slices:
    // products: productReducer,
    // ui: uiReducer (for global modals/drawers)
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Useful if we store non-serializable data accidentally, though avoided
    }),
  devTools: import.meta.env.MODE !== 'production',
});

export default store;