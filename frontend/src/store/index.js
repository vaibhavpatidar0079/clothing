import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';

/**
 * Industry Standard Store Setup
 * - Includes devTools enabled only in development
 * - Scalable slice architecture
 */

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
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