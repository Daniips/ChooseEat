import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { applyTheme } from "./lib/theme";
import './lib/i18n'; 
import { UiProvider } from './context/UIContext.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

const App = lazy(() => import('./App.jsx'));

applyTheme("system");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UiProvider persist={false}>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <App />
        </Suspense>
      </BrowserRouter>
    </UiProvider>
  </React.StrictMode>,
)