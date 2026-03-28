import React from 'react';
import { mapCategories, mapPlaces } from '../data/mapPlaces';

const PORTO_CENTER = { lng: -8.611, lat: 41.1496 };
const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

function MapPage() {
  const mapRef = React.useRef(null);
  const mapContainerRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const [activeCategory, setActiveCategory] = React.useState(mapCategories[0]);
  const [activePlace, setActivePlace] = React.useState(null);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  React.useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let isCancelled = false;

    const ensureStyleSheet = () => {
      if (document.querySelector('link[data-mapbox-style="true"]')) {
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css';
      link.dataset.mapboxStyle = 'true';
      document.head.appendChild(link);
    };

    const loadScript = () => {
      const existingScript = document.querySelector('script[data-mapbox-script="true"]');
      if (existingScript) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.js';
        script.async = true;
        script.dataset.mapboxScript = 'true';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Mapbox script'));
        document.body.appendChild(script);
      });
    };

    const initializeMap = async () => {
      ensureStyleSheet();
      await loadScript();

      if (isCancelled || !window.mapboxgl) {
        return;
      }

      window.mapboxgl.accessToken = mapboxToken;

      const map = new window.mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAPBOX_STYLE,
        center: [PORTO_CENTER.lng, PORTO_CENTER.lat],
        zoom: 12,
      });

      mapRef.current = map;
    };

    initializeMap();

    return () => {
      isCancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapboxToken]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const visiblePlaces = mapPlaces.filter((place) => place.category === activeCategory);

    visiblePlaces.forEach((place) => {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = 'map-marker';
      markerElement.setAttribute('aria-label', place.name);
      markerElement.textContent = '•';
      markerElement.addEventListener('click', () => setActivePlace(place));

      const marker = new window.mapboxgl.Marker({ element: markerElement })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (visiblePlaces.length > 0) {
      map.flyTo({
        center: [visiblePlaces[0].lng, visiblePlaces[0].lat],
        zoom: 12.3,
        speed: 0.8,
      });
    } else {
      map.flyTo({ center: [PORTO_CENTER.lng, PORTO_CENTER.lat], zoom: 12, speed: 0.8 });
    }
  }, [activeCategory]);

  return (
    <main className="map-page" aria-label="Porto2You map">
      <aside className="map-sidebar" aria-label="Map categories">
        <h1 className="map-title">Porto2You Map</h1>
        <p className="map-subtitle">MVP categories</p>
        <div className="map-categories" role="list">
          {mapCategories.map((category) => (
            <button
              key={category}
              type="button"
              role="listitem"
              className={`map-category-item ${activeCategory === category ? 'is-active' : ''}`}
              onClick={() => {
                setActiveCategory(category);
                setActivePlace(null);
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {activePlace ? (
          <article className="map-place-card" aria-live="polite">
            <strong>{activePlace.name}</strong>
            <p>{activePlace.category}</p>
          </article>
        ) : (
          <p className="map-helper">Click a marker to preview a place.</p>
        )}
      </aside>

      <section className="map-canvas-wrap" aria-label="Porto map view">
        {mapboxToken ? null : (
          <div className="map-token-warning">
            Add <code>VITE_MAPBOX_TOKEN</code> to your <code>.env</code> file to enable the map.
          </div>
        )}
        <div className="map-canvas" ref={mapContainerRef} />
      </section>
    </main>
  );
}

export default MapPage;
