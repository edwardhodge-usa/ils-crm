import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// Browser mock — shim electronAPI when running outside Electron (e.g. Chrome UX review)
// TEMPORARY: Remove this import after review is complete
if (!window.electronAPI) {
  await import('./mocks/browser-mock')
}

// Listen for system accent color from main process
window.electronAPI?.onAccentColor?.((color: string) => {
  document.documentElement.style.setProperty('--color-accent', color)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
