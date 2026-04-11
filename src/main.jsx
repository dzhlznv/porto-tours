import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import './styles.css';

const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

const resolvePageForPath = (path) => {
  if (path === '/map') {
    return MapPage;
  }

  if (path === '/') {
    return LandingPage;
  }

  return LandingPage;
};

const Page = resolvePageForPath(pathname);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
);
