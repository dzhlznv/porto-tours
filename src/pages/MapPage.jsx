import React from 'react';
import { defaultMapCategory, mapCategories, portoGuidePlaces } from '../data/portoGuide';

const TILE_SIZE = 256;
const MIN_ZOOM = 11;
const MAX_ZOOM = 17;
const DEFAULT_TRANSITION_MS = 420;
const PAN_COMFORT_ZONE = {
  left: 0.2,
  right: 0.8,
  top: 0.2,
  bottom: 0.82,
};

const CATEGORY_VIEWPORT_CONFIG = {
  Highlights: {
    bounds: {
      north: 41.168,
      south: 41.127,
      west: -8.648,
      east: -8.584,
    },
    targetZoom: 13,
  },
  'Classic Porto': {
    bounds: {
      north: 41.1538,
      south: 41.1368,
      west: -8.6205,
      east: -8.6002,
    },
    targetZoom: 14,
  },
  Gaia: {
    bounds: {
      north: 41.1495,
      south: 41.121,
      west: -8.671,
      east: -8.596,
    },
    targetZoom: 13,
  },
  'Beaches & Ocean': {
    bounds: {
      north: 41.193,
      south: 41.116,
      west: -8.709,
      east: -8.645,
    },
    targetZoom: 12,
  },
  Parks: {
    bounds: {
      north: 41.186,
      south: 41.132,
      west: -8.688,
      east: -8.567,
    },
    targetZoom: 12,
  },
};

const CATEGORY_MARKER_TONES = {
  Highlights: 'marker-sage',
  'Classic Porto': 'marker-clay',
  Gaia: 'marker-indigo',
  'Beaches & Ocean': 'marker-ocean',
  Parks: 'marker-green',
  'Breakfast & Brunch': 'marker-sand',
  Coffee: 'marker-umber',
  'Food & Wine': 'marker-wine',
  'Street Food': 'marker-apricot',
  Shopping: 'marker-slate',
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

function project(lat, lng, zoom) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const scale = 2 ** zoom * TILE_SIZE;
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x, y, zoom) {
  const scale = 2 ** zoom * TILE_SIZE;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function normalizeInstagramHandle(handle) {
  if (!handle) {
    return null;
  }

  return handle.replace('@', '').trim();
}

function computeBoundsFromPlaces(places) {
  if (!places.length) {
    return null;
  }

  return places.reduce(
    (accumulator, place) => ({
      north: Math.max(accumulator.north, place.lat),
      south: Math.min(accumulator.south, place.lat),
      east: Math.max(accumulator.east, place.lng),
      west: Math.min(accumulator.west, place.lng),
    }),
    {
      north: -90,
      south: 90,
      east: -180,
      west: 180,
    }
  );
}

function fitBoundsToViewport(bounds, mapSize, options = {}) {
  if (!bounds) {
    return { lat: 41.1458, lng: -8.6139, zoom: 13 };
  }

  const paddingX = options.paddingX ?? 72;
  const paddingY = options.paddingY ?? 72;
  const safeWidth = Math.max((mapSize.width || 1200) - paddingX * 2, 220);
  const safeHeight = Math.max((mapSize.height || 800) - paddingY * 2, 220);

  let bestZoom = MIN_ZOOM;
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const northWest = project(bounds.north, bounds.west, zoom);
    const southEast = project(bounds.south, bounds.east, zoom);
    const width = Math.abs(southEast.x - northWest.x);
    const height = Math.abs(southEast.y - northWest.y);

    if (width <= safeWidth && height <= safeHeight) {
      bestZoom = zoom;
      break;
    }
  }

  const lat = (bounds.north + bounds.south) / 2;
  const lng = (bounds.east + bounds.west) / 2;

  return {
    lat,
    lng,
    zoom: clamp(options.targetZoom ?? bestZoom, MIN_ZOOM, MAX_ZOOM),
  };
}

function shouldAnimateViewport(from, to) {
  if (!from || !to) {
    return false;
  }

  const latDiff = Math.abs(from.lat - to.lat);
  const lngDiff = Math.abs(from.lng - to.lng);
  const zoomDiff = Math.abs(from.zoom - to.zoom);

  return latDiff > 0.0008 || lngDiff > 0.0008 || zoomDiff >= 1;
}

function MapPage() {
  const [activeCategory, setActiveCategory] = React.useState(defaultMapCategory);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState(() => {
    const featuredInCategory = portoGuidePlaces.find((place) => place.category === defaultMapCategory && place.featured);
    return featuredInCategory?.id ?? portoGuidePlaces[0]?.id;
  });
  const [viewport, setViewport] = React.useState({ lat: 41.1463, lng: -8.6138, zoom: 13 });
  const [mapSize, setMapSize] = React.useState({ width: 0, height: 0 });

  const mapViewportRef = React.useRef(null);
  const dragStateRef = React.useRef({ isDragging: false, startX: 0, startY: 0, centerPx: null });
  const animationFrameRef = React.useRef(null);

  const placesByCategory = React.useMemo(() => {
    return mapCategories.reduce((accumulator, category) => {
      accumulator[category] = portoGuidePlaces.filter((place) => place.category === category);
      return accumulator;
    }, {});
  }, []);

  const featuredPlaces = React.useMemo(() => portoGuidePlaces.filter((place) => place.featured), []);

  const visiblePlaces = React.useMemo(() => {
    if (activeCategory === 'Highlights') {
      return featuredPlaces;
    }

    return placesByCategory[activeCategory] ?? [];
  }, [activeCategory, featuredPlaces, placesByCategory]);

  const selectedPlace = React.useMemo(() => {
    return portoGuidePlaces.find((place) => place.id === selectedPlaceId) ?? visiblePlaces[0] ?? portoGuidePlaces[0];
  }, [selectedPlaceId, visiblePlaces]);

  const contextualPlace = React.useMemo(() => {
    if (selectedPlace && visiblePlaces.some((place) => place.id === selectedPlace.id)) {
      return selectedPlace;
    }

    const featuredInCategory = visiblePlaces.find((place) => place.featured);
    return featuredInCategory ?? visiblePlaces[0] ?? null;
  }, [selectedPlace, visiblePlaces]);

  const animateViewportTo = React.useCallback((target, duration = DEFAULT_TRANSITION_MS) => {
    if (!target) {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const start = performance.now();
    const from = viewport;
    const to = {
      lat: clamp(target.lat, -85, 85),
      lng: target.lng,
      zoom: clamp(Math.round(target.zoom), MIN_ZOOM, MAX_ZOOM),
    };

    if (from.zoom !== to.zoom) {
      setViewport((current) => ({ ...current, zoom: to.zoom }));
    }

    const tick = (now) => {
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = easeOutCubic(progress);

      setViewport({
        lat: from.lat + (to.lat - from.lat) * eased,
        lng: from.lng + (to.lng - from.lng) * eased,
        zoom: to.zoom,
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [viewport]);

  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!visiblePlaces.some((place) => place.id === selectedPlaceId)) {
      setSelectedPlaceId(visiblePlaces[0]?.id ?? portoGuidePlaces[0]?.id);
    }
  }, [activeCategory, selectedPlaceId, visiblePlaces]);

  React.useEffect(() => {
    if (!mapSize.width || !mapSize.height || !visiblePlaces.length) {
      return;
    }

    const categoryConfig = CATEGORY_VIEWPORT_CONFIG[activeCategory] ?? null;
    const relevantPlaces =
      activeCategory === 'Highlights' ? visiblePlaces.filter((place) => place.featured).slice(0, 8) : visiblePlaces;

    const bounds = categoryConfig?.bounds ?? computeBoundsFromPlaces(relevantPlaces);
    const nextViewport = fitBoundsToViewport(bounds, mapSize, {
      paddingX: mapSize.width > 1200 ? 140 : 96,
      paddingY: mapSize.height > 800 ? 120 : 90,
      targetZoom: categoryConfig?.targetZoom,
    });

    if (shouldAnimateViewport(viewport, nextViewport)) {
      animateViewportTo(nextViewport, 460);
    }
  }, [activeCategory, animateViewportTo, mapSize.height, mapSize.width, viewport, visiblePlaces]);

  React.useEffect(() => {
    if (!selectedPlace || !mapSize.width || !mapSize.height) {
      return;
    }

    const markerWorld = project(selectedPlace.lat, selectedPlace.lng, viewport.zoom);
    const centerWorld = project(viewport.lat, viewport.lng, viewport.zoom);
    const selectedScreenX = markerWorld.x - centerWorld.x + mapSize.width / 2;
    const selectedScreenY = markerWorld.y - centerWorld.y + mapSize.height / 2;

    const desiredX = mapSize.width * 0.56;
    const desiredY = mapSize.height * 0.54;

    const nearEdgeX =
      selectedScreenX < mapSize.width * PAN_COMFORT_ZONE.left ||
      selectedScreenX > mapSize.width * PAN_COMFORT_ZONE.right;
    const nearEdgeY =
      selectedScreenY < mapSize.height * PAN_COMFORT_ZONE.top ||
      selectedScreenY > mapSize.height * PAN_COMFORT_ZONE.bottom;

    if (nearEdgeX || nearEdgeY) {
      const nextCenterWorldX = markerWorld.x - (desiredX - mapSize.width / 2);
      const nextCenterWorldY = markerWorld.y - (desiredY - mapSize.height / 2);
      const nextCenter = unproject(nextCenterWorldX, nextCenterWorldY, viewport.zoom);

      const nextViewport = {
        lat: nextCenter.lat,
        lng: nextCenter.lng,
        zoom: Math.max(viewport.zoom, 13),
      };

      if (shouldAnimateViewport(viewport, nextViewport)) {
        animateViewportTo(nextViewport, 320);
      }
    }
  }, [animateViewportTo, mapSize.height, mapSize.width, selectedPlace, viewport.lat, viewport.lng, viewport.zoom]);

  React.useEffect(() => {
    const node = mapViewportRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      setMapSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const centerPixels = project(viewport.lat, viewport.lng, viewport.zoom);

  const leftWorld = centerPixels.x - mapSize.width / 2;
  const topWorld = centerPixels.y - mapSize.height / 2;

  const minTileX = Math.floor(leftWorld / TILE_SIZE);
  const maxTileX = Math.floor((leftWorld + mapSize.width) / TILE_SIZE);
  const minTileY = Math.floor(topWorld / TILE_SIZE);
  const maxTileY = Math.floor((topWorld + mapSize.height) / TILE_SIZE);

  const zoomLevel = Math.round(viewport.zoom);
  const maxTileIndex = 2 ** zoomLevel;
  const tiles = [];

  for (let tx = minTileX; tx <= maxTileX; tx += 1) {
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      if (ty < 0 || ty >= maxTileIndex) {
        continue;
      }

      const wrappedX = ((tx % maxTileIndex) + maxTileIndex) % maxTileIndex;
      tiles.push({
        key: `${zoomLevel}-${tx}-${ty}`,
        src: `https://tile.openstreetmap.org/${zoomLevel}/${wrappedX}/${ty}.png`,
        x: tx * TILE_SIZE - leftWorld,
        y: ty * TILE_SIZE - topWorld,
      });
    }
  }

  const markerTone = CATEGORY_MARKER_TONES[activeCategory] ?? 'marker-sage';
  const mapMarkers = visiblePlaces.map((place) => {
    const pixelPoint = project(place.lat, place.lng, viewport.zoom);
    return {
      ...place,
      markerTone: CATEGORY_MARKER_TONES[place.category] ?? markerTone,
      x: pixelPoint.x - leftWorld,
      y: pixelPoint.y - topWorld,
    };
  });

  const beginDrag = (event) => {
    if (event.button !== 0) {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    event.preventDefault();
    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      startY: event.clientY,
      centerPx: centerPixels,
    };
  };

  const handleMouseMove = React.useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState.isDragging || !dragState.centerPx) {
        return;
      }

      const nextCenterX = dragState.centerPx.x - (event.clientX - dragState.startX);
      const nextCenterY = dragState.centerPx.y - (event.clientY - dragState.startY);
      const nextCenter = unproject(nextCenterX, nextCenterY, viewport.zoom);
      setViewport((current) => ({ ...current, lat: clamp(nextCenter.lat, -85, 85), lng: nextCenter.lng }));
    },
    [viewport.zoom]
  );

  const stopDrag = React.useCallback(() => {
    dragStateRef.current = { isDragging: false, startX: 0, startY: 0, centerPx: null };
  }, []);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [handleMouseMove, stopDrag]);

  const handleWheel = (event) => {
    event.preventDefault();
    const zoomDelta = event.deltaY < 0 ? 1 : -1;
    setViewport((current) => ({ ...current, zoom: clamp(current.zoom + zoomDelta, MIN_ZOOM, MAX_ZOOM) }));
  };

  return (
    <main className="map-page" aria-label="Porto2You curated guide map">
      <aside className="map-sidebar">
        <header className="map-sidebar__header">
          <p className="eyebrow">Porto2You</p>
          <h1>Curated Porto Map</h1>
          <p>Discover Porto and Gaia through a local, premium list of places across ten practical categories.</p>
        </header>

        <nav className="map-category-list" aria-label="Map categories">
          {mapCategories.map((category) => {
            const categoryCount = category === 'Highlights' ? featuredPlaces.length : placesByCategory[category]?.length ?? 0;
            return (
              <button
                key={category}
                type="button"
                className={`map-category-chip ${activeCategory === category ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                <span>{category}</span>
                <small>{categoryCount}</small>
              </button>
            );
          })}
        </nav>
        {activeCategory === 'Highlights' ? <p className="map-start-hint">Start here</p> : null}

        <section className="map-place-list" aria-label={`${activeCategory} places`}>
          {visiblePlaces.map((place) => (
            <button
              key={place.id}
              type="button"
              className={`map-place-row ${selectedPlace?.id === place.id ? 'is-selected' : ''}`}
              onClick={() => setSelectedPlaceId(place.id)}
            >
              <strong>{place.name}</strong>
              <span>{place.area}</span>
            </button>
          ))}
        </section>
      </aside>

      <section className="map-canvas-panel">
        <div
          className="map-viewport"
          ref={mapViewportRef}
          onMouseDown={beginDrag}
          onWheel={handleWheel}
          role="application"
          aria-label="Interactive Porto map"
        >
          {tiles.map((tile) => (
            <img
              key={tile.key}
              className="map-tile"
              src={tile.src}
              alt=""
              draggable="false"
              style={{ transform: `translate(${tile.x}px, ${tile.y}px)` }}
            />
          ))}

          <div className="map-surface-wash" aria-hidden="true" />

          {mapMarkers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className={`map-marker ${marker.markerTone} ${marker.featured ? 'is-featured' : ''} ${
                selectedPlace?.id === marker.id ? 'is-selected' : ''
              }`}
              style={{ transform: `translate(${marker.x}px, ${marker.y}px)` }}
              onClick={() => setSelectedPlaceId(marker.id)}
              title={marker.name}
              aria-label={marker.name}
            >
              <span className="map-marker__pulse" />
              <span className="map-marker__core" />
            </button>
          ))}

          {contextualPlace ? (
            <article className="map-highlights-card" aria-live="polite">
              <div>
                <p className="eyebrow">{selectedPlace?.id === contextualPlace.id ? 'Selected place' : 'Category focus'}</p>
                <h3>{contextualPlace.name}</h3>
                <p>{contextualPlace.description}</p>
                <p className="map-highlights-card__category">
                  {contextualPlace.category} · {contextualPlace.area}
                </p>
              </div>
              <div className="map-highlights-card__actions">
                <button type="button" className="map-highlights-card__focus" onClick={() => setSelectedPlaceId(contextualPlace.id)}>
                  View on map
                </button>
              </div>
            </article>
          ) : null}

          <div className="map-attribution">
            <span>Use wheel to zoom and drag to pan.</span>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              © OpenStreetMap contributors
            </a>
          </div>
        </div>

        {selectedPlace ? (
          <article key={selectedPlace.id} className="map-place-card" aria-live="polite">
            <p className="eyebrow">{selectedPlace.category}</p>
            <h2>{selectedPlace.name}</h2>
            <p className="map-place-card__area">{selectedPlace.area}</p>
            <p>{selectedPlace.description}</p>
            <p className="map-place-card__notes">{selectedPlace.notes}</p>
            <div className="map-place-card__meta">
              <span>
                {selectedPlace.lat.toFixed(4)}, {selectedPlace.lng.toFixed(4)}
              </span>
              {selectedPlace.instagram ? (
                <a
                  href={`https://instagram.com/${normalizeInstagramHandle(selectedPlace.instagram)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{normalizeInstagramHandle(selectedPlace.instagram)}
                </a>
              ) : null}
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}

export default MapPage;
