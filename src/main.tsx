import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistrations().then((items) => items.forEach((item) => void item.unregister()))
if ('caches' in window) void caches.keys().then((keys) => keys.forEach((key) => void caches.delete(key)))
