import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { initializeFirebaseSync } from './services/firebaseSync';

// Register Service Worker Safely
try {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.warn('ServiceWorker registration failed: ', err);
        }
      ).catch((err) => {
        console.warn('ServiceWorker registration promise rejected: ', err);
      });
    });
  }
} catch (e) {
  console.warn('Service worker not supported or blocked in this environment:', e);
}

// Request Notification Permission Safely
try {
  let permission = 'default';
  try {
    if ('Notification' in window) {
      permission = Notification.permission;
    }
  } catch (e) {
    console.warn('Could not read Notification permission safely:', e);
  }
  if ('Notification' in window && permission !== 'granted' && permission !== 'denied') {
    const promise = Notification.requestPermission();
    if (promise && typeof promise.catch === 'function') {
      promise.catch((err) => {
        console.warn('Notification permission request rejected: ', err);
      });
    }
  }
} catch (e) {
  console.warn('Notification permission request failed or blocked:', e);
}

import { initializeFirebase } from './lib/firebase';

initializeFirebase().then(() => {
  initializeFirebaseSync();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
});
