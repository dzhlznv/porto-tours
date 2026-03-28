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

function NotFoundPage() {
  return (
    <main className="route-fallback" aria-label="Not found page">
      <h1>404</h1>
      <p>Page not found.</p>
    </main>
  );
}

function resolveRoute(pathname) {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === '/') {
    return <LandingPage />;
  }

  if (normalizedPath === '/map') {
    return <MapPage />;
  }

  return <NotFoundPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{resolveRoute(window.location.pathname)}</React.StrictMode>
);
