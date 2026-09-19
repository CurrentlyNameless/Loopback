import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import { App } from './app/App.tsx';
import { initThemeEngine } from './lib/themeEngine.ts';

// Initialize global theme, glassmorphism, card borders & FX from user settings
initThemeEngine();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
