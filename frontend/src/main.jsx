import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
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
            // Defaul style for all toasts (premium, subdued look)
            style: {
              background: 'rgba(17, 24, 39, 0.96)', // very dark slate
              color: '#F8F5F1', // warm off-white
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: '0 10px 30px rgba(2,6,23,0.6)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontFamily: 'Georgia, Times New Roman, serif',
              fontWeight: 500,
              fontSize: '14px',
            },
            // Variants keep subtle color accents while preserving the premium base style
            success: {
              duration: 500,
              style: {
                background: 'linear-gradient(180deg, rgba(6,95,70,0.98), rgba(10,120,85,0.98))',
                color: '#F8FFF6',
                border: '1px solid rgba(10,120,85,0.15)'
              }
            },
            error: {
              duration: 500,
              style: {
                background: 'linear-gradient(180deg, rgba(95,6,6,0.98), rgba(120,10,10,0.98))',
                color: '#FFF6F6',
                border: '1px solid rgba(120,10,10,0.12)'
              }
            }
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);