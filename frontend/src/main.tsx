import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="color: white; padding: 20px; background: #0a0a0f; min-height: 100vh;">Error: Root element not found</div>';
} else {
  // Set basic styles on root to ensure visibility
  rootElement.style.minHeight = '100vh';
  rootElement.style.backgroundColor = '#0a0a0f';
  rootElement.style.color = '#e5e5e5';
  
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Error rendering React app:', error);
    rootElement.innerHTML = `<div style="color: white; padding: 20px; background: #0a0a0f; min-height: 100vh;">Error: ${error}</div>`;
  }
}

