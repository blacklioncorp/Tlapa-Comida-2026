import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Data migration: clear stale localStorage data that uses old format
const SEED_VERSION = 'v2';
if (localStorage.getItem('tlapa_seed_version') !== SEED_VERSION) {
  localStorage.removeItem('tlapa_merchants');
  localStorage.removeItem('tlapa_categories');
  localStorage.setItem('tlapa_seed_version', SEED_VERSION);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
