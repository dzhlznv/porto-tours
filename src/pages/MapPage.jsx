import React from 'react';
import { defaultMapCategory, mapCategories, portoGuidePlaces } from '../data/portoGuide';

const TILE_SIZE = 256;
const MIN_ZOOM = 11;
const MAX_ZOOM = 17;
const DEFAULT_TRANSITION_MS = 420;

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

function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function isViewportClose(current, next) {
  if (!current || !next) {
    return false;
  }

  const latClose = Math.abs(current.lat - next.lat) < 0.0001;
  const lngClose = Math.abs(current.lng - next.lng) < 0.0001;
  const zoomClose = Math.abs(current.zoom - next.zoom) < 0.01;

  return latClose && lngClose && zoomClose;
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
  const viewportRef = React.useRef(viewport);
  const lastSelectionMoveRef = React.useRef(null);

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

  const highlightCardPlaces = React.useMemo(() => featuredPlaces.slice(0, 3), [featuredPlaces]);
  const [highlightCardIndex, setHighlightCardIndex] = React.useState(0);

  const selectedPlace = React.useMemo(() => {
    return portoGuidePlaces.find((place) => place.id === selectedPlaceId) ?? visiblePlaces[0] ?? portoGuidePlaces[0];
  }, [selectedPlaceId, visiblePlaces]);

  React.useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const animateViewportTo = React.useCallback((target, duration = DEFAULT_TRANSITION_MS) => {
    if (!target) {
      return;
    }

    const from = viewportRef.current;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const to = {
      lat: clamp(target.lat, -85, 85),
      lng: target.lng,
      zoom: clamp(Math.round(target.zoom), MIN_ZOOM, MAX_ZOOM),
    };

    if (isViewportClose(from, to)) {
      return;
    }

    const start = performance.now();

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
  }, []);

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
      activeCategory === 'Highlights'
        ? visiblePlaces.filter((place) => place.featured && isValidCoordinate(place.lat, place.lng)).slice(0, 8)
        : visiblePlaces.filter((place) => isValidCoordinate(place.lat, place.lng));

    const bounds = categoryConfig?.bounds ?? computeBoundsFromPlaces(relevantPlaces);
    const nextViewport = fitBoundsToViewport(bounds, mapSize, {
      paddingX: mapSize.width > 1200 ? 140 : 96,
      paddingY: mapSize.height > 800 ? 120 : 90,
      targetZoom: categoryConfig?.targetZoom,
    });

    animateViewportTo(nextViewport, 460);
    lastSelectionMoveRef.current = null;
  }, [activeCategory, animateViewportTo, mapSize.height, mapSize.width, visiblePlaces]);

  React.useEffect(() => {
    if (!selectedPlace || !mapSize.width || !mapSize.height) {
      return;
    }

    if (!isValidCoordinate(selectedPlace.lat, selectedPlace.lng)) {
      return;
    }

    const moveKey = `${selectedPlace.id}:${selectedPlace.lat}:${selectedPlace.lng}`;
    if (lastSelectionMoveRef.current === moveKey) {
      return;
    }

    const current = viewportRef.current;
    const nextViewport = {
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      zoom: Math.max(current.zoom, 13),
    };

    animateViewportTo(nextViewport, 320);
    lastSelectionMoveRef.current = moveKey;
  }, [animateViewportTo, mapSize.height, mapSize.width, selectedPlace]);

  React.useEffect(() => {
    if (!highlightCardPlaces.length) {
      return;
    }

    const clampedIndex = clamp(highlightCardIndex, 0, highlightCardPlaces.length - 1);
    if (clampedIndex !== highlightCardIndex) {
      setHighlightCardIndex(clampedIndex);
    }
  }, [highlightCardIndex, highlightCardPlaces]);

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
  const mapMarkers = visiblePlaces.filter((place) => isValidCoordinate(place.lat, place.lng)).map((place) => {
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

  const activeHighlight = highlightCardPlaces[highlightCardIndex] ?? null;

  const showPreviousHighlight = () => {
    setHighlightCardIndex((current) => (current - 1 + highlightCardPlaces.length) % highlightCardPlaces.length);
  };

  const showNextHighlight = () => {
    setHighlightCardIndex((current) => (current + 1) % highlightCardPlaces.length);
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

          {activeHighlight ? (
            <article className="map-highlights-card" aria-live="polite">
              <div>
                <p className="eyebrow">Featured · {highlightCardIndex + 1}/{highlightCardPlaces.length}</p>
                <h3>{activeHighlight.name}</h3>
                <p>{activeHighlight.description}</p>
                <p className="map-highlights-card__category">{activeHighlight.category}</p>
              </div>
              <div className="map-highlights-card__actions">
                <button type="button" onClick={showPreviousHighlight} aria-label="Show previous featured place">
                  ←
                </button>
                <button
                  type="button"
                  className="map-highlights-card__focus"
                  onClick={() => setSelectedPlaceId(activeHighlight.id)}
                >
                  View on map
                </button>
                <button type="button" onClick={showNextHighlight} aria-label="Show next featured place">
                  →
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
          <article className="map-place-card" aria-live="polite">
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
