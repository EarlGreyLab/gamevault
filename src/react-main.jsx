import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeToggler } from '../components/ThemeToggler'

createRoot(document.getElementById('TT-root')).render(
  <StrictMode>
    <ThemeToggler />
  </StrictMode>
)
