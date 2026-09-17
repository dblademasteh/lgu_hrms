import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import App from './App.jsx';
import { applyToastStyle } from './toastStyle.js';
import { initSentry } from './lib/sentry.js';
import { useAuthStore } from './stores/authStore.js';

applyToastStyle();
initSentry();

// Hydrate auth from localStorage BEFORE any route/component renders.
// This prevents race conditions where child useEffect hooks (e.g.
// useNotifications, UserDashboard) fire API calls before the token is
// available in the store and interceptor.
useAuthStore.getState().hydrate();

createRoot(document.getElementById('root')).render(<App />);
