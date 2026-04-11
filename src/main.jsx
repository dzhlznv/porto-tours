import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import { getRouteKey } from './routing';
import './styles.css';

function resolveRoute() {
  const routeKey = getRouteKey({
    pathname: window.location.pathname,
    hostname: window.location.hostname,
  });

  return routeKey === 'map' ? <MapPage /> : <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{resolveRoute()}</React.StrictMode>
);
