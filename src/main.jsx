import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import './styles.css';

function normalizePathname(pathname) {
  if (!pathname) {
    return '/';
  }

  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

function isMapHostname(hostname) {
  if (!hostname) {
    return false;
  }

  const normalizedHost = hostname.toLowerCase();

  if (normalizedHost.includes('map.porto2you.com')) {
    return true;
  }

  return normalizedHost.includes('map') && normalizedHost.includes('vercel.app');
}

function getRouteKey(hostname, pathname) {
  const normalizedPath = normalizePathname(pathname);
  const mapHost = isMapHostname(hostname);

  if (mapHost && (normalizedPath === '/' || normalizedPath === '/map')) {
    return 'map';
  }

  if (normalizedPath === '/' || normalizedPath === '/home') {
    return 'landing';
  }

  if (normalizedPath === '/map') {
    return 'map';
  }

  return 'landing';
}

function resolveRoute(hostname, pathname) {
  const routeKey = getRouteKey(hostname, pathname);

  if (routeKey === 'map') {
    return <MapPage />;
  }

  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {resolveRoute(window.location.hostname, window.location.pathname)}
  </React.StrictMode>
);
