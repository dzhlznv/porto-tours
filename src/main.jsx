import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingPage from './App';
import { MapPage } from './MapPage';
import './styles.css';

const normalizedPathname = window.location.pathname.replace(/\/+$/, '') || '/';

const page = normalizedPathname === '/home' ? <LandingPage /> : <MapPage />;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{page}</React.StrictMode>
);
