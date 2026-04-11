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

function isMapSubdomain(hostname) {
  if (!hostname) {
    return false;
  }

  return hostname === 'map.porto2you.com' || hostname.startsWith('map.');
}

function resolveRoute(pathname, hostname) {
  const normalizedPath = normalizePathname(pathname);
  const onMapSubdomain = isMapSubdomain(hostname);

  if (normalizedPath === '/map') {
    return <MapPage />;
  }

  if (normalizedPath === '/' && onMapSubdomain) {
    return <MapPage />;
  }

  if (normalizedPath === '/' || normalizedPath === '/home') {
    return <LandingPage />;
  }

  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {resolveRoute(window.location.pathname, window.location.hostname)}
  </React.StrictMode>
);
