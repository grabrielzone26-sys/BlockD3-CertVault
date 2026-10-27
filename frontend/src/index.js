import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import axios from 'axios';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { API_BASE_URL } from './config/api';
import './styles/index.css';
import 'react-toastify/dist/ReactToastify.css';

// Prevent third-party browser extensions (e.g. Urban VPN proxy chrome-extension://...)
// from triggering the React development error overlay
if (typeof window !== 'undefined') {
  const isExtensionError = (filename, message, stack) => {
    const fn = String(filename || '');
    const msg = String(message || '');
    const stk = String(stack || '');
    return (
      fn.includes('chrome-extension://') ||
      fn.includes('moz-extension://') ||
      fn.includes('safari-extension://') ||
      stk.includes('chrome-extension://') ||
      msg.includes("reading 'M_ID'") ||
      msg.includes('M_ID')
    );
  };

  window.addEventListener(
    'error',
    (event) => {
      if (isExtensionError(event.filename, event.message, event.error?.stack)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      if (isExtensionError(reason?.filename, reason?.message, reason?.stack)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

axios.defaults.baseURL = API_BASE_URL;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <ThemeProvider>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={4500}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
