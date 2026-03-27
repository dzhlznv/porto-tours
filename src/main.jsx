import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MapPage from './pages/MapPage';
import './styles.css';

function Router() {
  if (window.location.pathname === '/map') {
    return <MapPage />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
