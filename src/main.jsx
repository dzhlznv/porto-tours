import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import './styles.css';

const page = window.location.pathname === '/map' ? <MapPage /> : <LandingPage />;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{page}</React.StrictMode>
);
