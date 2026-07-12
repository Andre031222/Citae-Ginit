import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/App.css';
import './i18n';
import App from './App';
import { BrandingProvider } from './context/BrandingContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrandingProvider>
      <App />
    </BrandingProvider>
  </React.StrictMode>
);