import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './theme.css'
import { registerServiceWorker } from './utils/registerServiceWorker'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Service worker sirf production build mein register hoga — aur sirf tab jab
// app http(s) ke through serve ho rahi ho (normal web/PWA). Electron desktop
// build file:// protocol se load hoti hai, jahan service workers support hi
// nahi hote, isliye wahan skip kar dete hain.
// Dev mode mein register karna Vite ke HMR/live-reload ko
// break karta hai aur purana cached JS/CSS serve karta rehta hai.
if (import.meta.env.PROD && window.location.protocol !== 'file:') {
  registerServiceWorker();
}
