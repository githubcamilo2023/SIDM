import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'        // ← QUITA el "App from" — solo la ruta

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)