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

function resolveRoute(pathname) {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === '/' || normalizedPath === '/home') {
    return <LandingPage />;
  }

  if (normalizedPath === '/map') {
    return <MapPage />;
  }

  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {resolveRoute(window.location.pathname)}
  </React.StrictMode>
);
