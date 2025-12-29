import React from 'react'
import ReactDOM from 'react-dom/client'
import './utils/timezone-init' // Must be first to override Date prototype
import App from './App.jsx'
import './index.css'
import './i18n' // Import cấu hình i18n
import { AuthProvider } from './layers/application/context/AuthContext'
import ErrorBoundary from './shared/components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
