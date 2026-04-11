import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import './styles.css';

const MAP_SUBDOMAIN_HOSTS = new Set(['map.porto2you.com']);

function normalizePathname(pathname) {
  if (!pathname) {
    return '/';
  }

  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

function normalizeHostname(hostname) {
  if (!hostname) {
    return '';
  }

  return hostname.replace(/\.$/, '').toLowerCase();
}

function isMapSubdomain(hostname) {
  const normalizedHost = normalizeHostname(hostname);

  return MAP_SUBDOMAIN_HOSTS.has(normalizedHost) || normalizedHost.startsWith('map.localhost');
}

function resolveRoute({ pathname, hostname }) {
  const normalizedPath = normalizePathname(pathname);
  const onMapSubdomain = isMapSubdomain(hostname);

  if (normalizedPath === '/map') {
    return <MapPage />;
  }

  if (normalizedPath === '/' || normalizedPath === '/home') {
    return <LandingPage />;
  }

  if (onMapSubdomain) {
    return <LandingPage />;
  }

  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {resolveRoute({ pathname: window.location.pathname, hostname: window.location.hostname })}
  </React.StrictMode>
);
