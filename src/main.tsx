import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import 'leaflet/dist/leaflet.css';

/**
 * Main entry point - fixed ErrorBoundary implementation
 * - Use a proper class-based ErrorBoundary (React.Component)
 * - Wrap App with ErrorBoundary inside StrictMode
 */

type ErrorBoundaryState = { hasError: boolean };

class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: any) {
    // keep console/logging for debugging
    console.error('Application Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 24 }}>
          <h2>Something went wrong</h2>
          <p>Try reloading the page.</p>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found. Make sure index.html contains <div id="root"></div>');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
