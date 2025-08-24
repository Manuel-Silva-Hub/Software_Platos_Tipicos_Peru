import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import "leaflet/dist/leaflet.css";
import { AuthProvider } from "./services/AuthContext"; // asegúrate de que está en context y no en services

// ErrorBoundary para manejar errores en la UI
type ErrorBoundaryState = { hasError: boolean };

class ErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("Application Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-6 text-center">
          <h2 className="text-lg font-bold text-red-600">
            Algo salió mal 😢
          </h2>
          <p>Intenta recargar la página.</p>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}

// Render principal
const rootElement = document.getElementById("root");
if (!rootElement)
  throw new Error(
    'Root element not found. Asegúrate de tener <div id="root"></div> en index.html'
  );

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AuthProvider>
  </StrictMode>
);
