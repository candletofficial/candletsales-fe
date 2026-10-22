import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'

const canonicalHost = 'candlet.shop';

if (window.location.hostname === `www.${canonicalHost}`) {
  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.hostname = canonicalHost;
  window.location.replace(canonicalUrl.toString());
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
