import React from 'react'
import ReactDOM from 'react-dom/client'
import App from "./app/App"
import './styles/index.css'
import { installSameOriginFetch } from './app/utils/sameOriginFetch'

installSameOriginFetch()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Branded ORIRI loading screen (in index.html): keep it up for at least 1.8s (the O's rise animation plus a short hold)
// from page start, then fade it out once the app has rendered.
const SPLASH_MIN_MS = 1800
const splash = document.getElementById('oriri-splash')
if (splash) {
  const wait = Math.max(0, SPLASH_MIN_MS - performance.now())
  window.setTimeout(() => {
    requestAnimationFrame(() => {
      splash.classList.add('is-leaving')
      window.setTimeout(() => splash.remove(), 500)
    })
  }, wait)
}
