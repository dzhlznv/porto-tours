import React from 'react';
import { defaultMapCategory, mapCategories, portoGuidePlaces } from '../data/portoGuide';

const TILE_SIZE = 256;
const MIN_ZOOM = 11;
const MAX_ZOOM = 17;
const DEFAULT_VIEW = { lat: 41.15, lng: -8.61, zoom: 12 };

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

function hasValidCoordinates(place) {
  return (
    Number.isFinite(place?.lat) &&
    Number.isFinite(place?.lng) &&
    place.lat >= -90 &&
    place.lat <= 90 &&
    place.lng >= -180 &&
    place.lng <= 180
  );
}

function computeBoundsFromPlaces(places) {
  const validPlaces = places.filter(hasValidCoordinates);
  if (!validPlaces.length) {
    return null;
  }

  return validPlaces.reduce(
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

function isCenterClose(current, target) {
  const threshold = 0.0002;
  return Math.abs(current.lat - target.lat) < threshold && Math.abs(current.lng - target.lng) < threshold;
}

function zoomFromBounds(bounds) {
  const latSpan = Math.abs(bounds.north - bounds.south);
  const lngSpan = Math.abs(bounds.east - bounds.west);
  const span = Math.max(latSpan, lngSpan);
  if (span > 0.09) return 12;
  if (span > 0.04) return 13;
  if (span > 0.015) return 14;
  return 15;
}

function MapPage() {
  const [activeCategory, setActiveCategory] = React.useState(defaultMapCategory);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState(() => {
    const featuredInCategory = portoGuidePlaces.find((place) => place.category === defaultMapCategory && place.featured);
    return featuredInCategory?.id ?? portoGuidePlaces[0]?.id;
  });
  const [viewport, setViewport] = React.useState(DEFAULT_VIEW);
  const [mapSize, setMapSize] = React.useState({ width: 0, height: 0 });
  const boundsAppliedCategoryRef = React.useRef(null);

  const mapViewportRef = React.useRef(null);
  const dragStateRef = React.useRef({ isDragging: false, startX: 0, startY: 0, centerPx: null });

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

  const setView = React.useCallback((target, zoom) => {
    if (!target || !Number.isFinite(target[0]) || !Number.isFinite(target[1])) {
      return;
    }
    const next = { lat: clamp(target[0], -85, 85), lng: target[1], zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
    if (isCenterClose(viewport, next) && viewport.zoom === next.zoom) {
      return;
    }
    setViewport(next);
  }, [viewport]);

  const fitBounds = React.useCallback((places, category) => {
    const bounds = computeBoundsFromPlaces(places);
    if (!bounds) {
      setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);
      boundsAppliedCategoryRef.current = category;
      return;
    }
    const target = [(bounds.north + bounds.south) / 2, (bounds.east + bounds.west) / 2];
    setView(target, zoomFromBounds(bounds));
    boundsAppliedCategoryRef.current = category;
  }, [setView]);

  React.useEffect(() => {
    if (!visiblePlaces.some((place) => place.id === selectedPlaceId)) {
      setSelectedPlaceId(visiblePlaces[0]?.id ?? portoGuidePlaces[0]?.id);
    }
  }, [activeCategory, selectedPlaceId, visiblePlaces]);

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
  const mapMarkers = visiblePlaces.filter(hasValidCoordinates).map((place) => {
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

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSelectedPlaceId(null);
    const nextPlaces = (category === 'Highlights'
      ? portoGuidePlaces.filter((place) => place.featured)
      : portoGuidePlaces.filter((place) => place.category === category)
    ).filter(hasValidCoordinates);
    fitBounds(nextPlaces, category);
  };

  const handlePlaceSelection = (placeId) => {
    const nextPlace = portoGuidePlaces.find((place) => place.id === placeId);
    if (!nextPlace || !hasValidCoordinates(nextPlace)) {
      return;
    }
    setSelectedPlaceId(placeId);
    setView([nextPlace.lat, nextPlace.lng], 15);
  };

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
                onClick={() => handleCategoryChange(category)}
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
              onClick={() => handlePlaceSelection(place.id)}
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
              onClick={() => handlePlaceSelection(marker.id)}
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
                  onClick={() => handlePlaceSelection(activeHighlight.id)}
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
