import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Register service worker — auto-updates silently in the background
registerSW({ immediate: true })

// Prevent number inputs from changing value on scroll globally
document.addEventListener('wheel', () => {
  if (document.activeElement?.type === 'number') document.activeElement.blur()
}, { passive: true })

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <App />
    </BrowserRouter>
  </React.StrictMode>
)