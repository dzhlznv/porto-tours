import React from 'react';
import { MAP_CATEGORIES, MAP_POINTS } from '../mapData';

const PORTO_CENTER = [41.1579, -8.6291];
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function ensureLeafletStylesheet() {
  const existing = document.querySelector(`link[data-leaflet="true"]`);
  if (existing) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = LEAFLET_CSS_URL;
  link.crossOrigin = '';
  link.dataset.leaflet = 'true';
  document.head.appendChild(link);
}

function loadLeafletScript() {
  if (window.L) {
    return Promise.resolve(window.L);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[data-leaflet="true"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.L), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Leaflet.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.dataset.leaflet = 'true';
    script.crossOrigin = '';
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Unable to load Leaflet.'));
    document.body.appendChild(script);
  });
}

export default function MapPage() {
  const mapElementRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const markerLayerRef = React.useRef(null);
  const [activeCategory, setActiveCategory] = React.useState('All');
  const [mapError, setMapError] = React.useState('');

  const filteredPoints = React.useMemo(() => {
    if (activeCategory === 'All') {
      return MAP_POINTS;
    }

    return MAP_POINTS.filter((point) => point.category === activeCategory);
  }, [activeCategory]);

  React.useEffect(() => {
    let isMounted = true;

    ensureLeafletStylesheet();

    loadLeafletScript()
      .then((leaflet) => {
        if (!isMounted || mapRef.current || !mapElementRef.current) {
          return;
        }

        const map = leaflet.map(mapElementRef.current, {
          center: PORTO_CENTER,
          zoom: 13,
          zoomControl: false,
        });

        leaflet
          .tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          })
          .addTo(map);

        leaflet.control.zoom({ position: 'bottomright' }).addTo(map);
        mapRef.current = map;
        markerLayerRef.current = leaflet.layerGroup().addTo(map);
      })
      .catch(() => {
        if (isMounted) {
          setMapError('Map is temporarily unavailable. Please refresh and try again.');
        }
      });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerLayerRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current || !window.L) {
      return;
    }

    const leaflet = window.L;
    markerLayerRef.current.clearLayers();

    filteredPoints.forEach((point) => {
      const marker = leaflet.circleMarker(point.coordinates, {
        radius: 7,
        color: '#364340',
        fillColor: '#4b5d58',
        fillOpacity: 0.78,
        weight: 1,
      });

      marker.bindPopup(
        `<div class="map-popup"><strong>${point.title}</strong><br/><span>${point.description}</span></div>`,
        { closeButton: false, offset: [0, -2] }
      );
      marker.addTo(markerLayerRef.current);
    });

    if (filteredPoints.length > 0) {
      const bounds = leaflet.latLngBounds(filteredPoints.map((point) => point.coordinates));
      mapRef.current.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 15,
      });
    }
  }, [filteredPoints]);

  return (
    <section className="map-page" aria-label="Porto curated map">
      <div className="map-layout">
        <aside className="map-sidebar">
          <p className="eyebrow">Porto curation</p>
          <h1 className="map-title">Curated Map</h1>
          <p className="map-subtitle">A quiet shortlist of places worth pausing for.</p>
          <nav className="map-category-list" aria-label="Map categories">
            <button
              type="button"
              className={`map-category-button ${activeCategory === 'All' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              All
            </button>
            {MAP_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`map-category-button ${activeCategory === category ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </nav>
        </aside>

        <div className="map-canvas-shell" role="presentation">
          <div ref={mapElementRef} className="map-canvas" />
          {mapError ? <p className="map-error">{mapError}</p> : null}
        </div>
      </div>
    </section>
  );
}
