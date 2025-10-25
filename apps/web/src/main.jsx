import React from 'react'
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
        <App />
      </BrowserRouter>
    </UiProvider>
  </React.StrictMode>,
)
