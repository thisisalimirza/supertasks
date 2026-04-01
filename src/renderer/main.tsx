import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import QuickAddWindow from './components/QuickAddWindow'
import './styles/global.css'

const isQuickAdd = window.location.hash === '#quickadd'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isQuickAdd ? <QuickAddWindow /> : <App />}
  </React.StrictMode>
)
