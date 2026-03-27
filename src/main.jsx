import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NotFound } from './NotFound';
import './styles.css';

const KNOWN_ROUTES = {
  '/': App,
};

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

function Router() {
  const [pathname, setPathname] = React.useState(() => normalizePathname(window.location.pathname));

  React.useEffect(() => {
    const handlePopState = () => setPathname(normalizePathname(window.location.pathname));
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const RouteComponent = KNOWN_ROUTES[pathname];

  if (RouteComponent) {
    return <RouteComponent />;
  }

  return <NotFound hasMapRoute={Boolean(KNOWN_ROUTES['/map'])} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
