import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
This file is the entry point for the React application.
- Imports the root `App` component.
- Applies the global styles from `index.css`.
- Uses `createRoot` (React 18) to render the application inside the div with id "root".
- Wraps the application in `StrictMode` to enable additional checks during development.
*/

// Get the main app container from the HTML (index.html) and render the React app in the DOM
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
