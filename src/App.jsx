import React from 'react';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';

const normalizePathname = (pathname) => {
  if (!pathname) {
    return '/';
  }

  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
};

function App() {
  const pathname = normalizePathname(window.location.pathname);

  if (pathname === '/home') {
    return <LandingPage />;
  }

  if (pathname === '/' || pathname === '/map') {
    return <MapPage />;
  }

  return <MapPage />;
}

export default App;
