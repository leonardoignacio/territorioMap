import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import 'bootstrap/dist/css/bootstrap.min.css'; // Removed Bootstrap CSS import to rely on Tailwind/shadcn
import './index.css' // Import Tailwind CSS (includes base, components, utilities)
import App from './App.jsx' // Ensure this points to the correct App component file

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

