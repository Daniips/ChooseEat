import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { applyTheme } from "./lib/theme";
import './lib/i18n'; 
import { UiProvider } from './context/UIContext.jsx';

applyTheme("system");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UiProvider persist={false}>
      <BrowserRouter>
        <Suspense fallback={<div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '1.5rem'
        }}>Cargando...</div>}>
          <App />
        </Suspense>
      </BrowserRouter>
    </UiProvider>
  </React.StrictMode>,
)
