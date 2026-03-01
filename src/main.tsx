import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// Listen for system accent color from main process
window.electronAPI?.onAccentColor?.((color: string) => {
  document.documentElement.style.setProperty('--color-accent', color)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
