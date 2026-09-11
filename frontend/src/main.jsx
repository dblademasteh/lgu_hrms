import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import App from './App.jsx';
import { applyToastStyle } from './toastStyle.js';

applyToastStyle();

createRoot(document.getElementById('root')).render(<App />);
