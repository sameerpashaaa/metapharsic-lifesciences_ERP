
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';



console.log('index.tsx: START');

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log('index.tsx: Root created, rendering App...');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('index.tsx: Render called successfully');
  } catch (err) {
    console.error('index.tsx: CRITICAL RENDER ERROR:', err);
  }
} else {
  console.error('index.tsx: Root element not found!');
}