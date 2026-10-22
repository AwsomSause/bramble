import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { applyStoredSettings } from './features/settings/useSettings';
import './styles/global.css';

// Apply theme/motion before the first paint so there's no flash of the wrong theme.
applyStoredSettings();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
