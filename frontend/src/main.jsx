import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import App from './App.jsx';
import store from './store';
import './index.css'; // Assumes Tailwind directives are here

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          reverseOrder={false}
          limit={1} /* Ensure only one toast is visible at a time */
          toastOptions={{
            duration: 1000, // 1 second globally
            // Clean, minimal style with neutral palette
            style: {
              background: '#FFFFFF',
              color: '#1F2937',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              borderRadius: '6px',
              padding: '14px 16px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              letterSpacing: '0.3px',
            },
            // Custom render for success with checkmark
            success: {
              duration: 1000,
              style: {
                background: '#FFFFFF',
                color: '#1F2937',
                border: '1px solid #E5E7EB',
              },
              icon: <Check size={18} strokeWidth={2.5} className="text-gray-900" />,
            },
            // Custom render for error with X mark
            error: {
              duration: 1000,
              style: {
                background: '#FFFFFF',
                color: '#1F2937',
                border: '1px solid #E5E7EB',
              },
              icon: <X size={18} strokeWidth={2.5} className="text-gray-900" />,
            }
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);