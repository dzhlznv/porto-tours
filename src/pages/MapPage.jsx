import React from 'react';
import { defaultMapCategory, mapCategories, portoGuidePlaces } from '../data/portoGuide';

const TILE_SIZE = 256;
const TILE_PROVIDER_URL = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
const MIN_ZOOM = 11;
const MAX_ZOOM = 17;
const DEFAULT_TRANSITION_MS = 420;
const MOBILE_BREAKPOINT_QUERY = '(max-width: 980px)';
const MOBILE_SELECTED_PLACE_ZOOM = 15;

const CATEGORY_VIEWPORT_CONFIG = {
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

function MapPage() {
  const [activeCategory, setActiveCategory] = React.useState(defaultMapCategory);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState(() => {
    const featuredInCategory = portoGuidePlaces.find((place) => place.category === defaultMapCategory && place.featured);
    return featuredInCategory?.id ?? portoGuidePlaces[0]?.id;
  });
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(true);
  const [viewport, setViewport] = React.useState({ lat: 41.15, lng: -8.61, zoom: 13 });
  const [mapSize, setMapSize] = React.useState({ width: 0, height: 0 });
  const [isMobileLayout, setIsMobileLayout] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches : false
  );

  const mapViewportRef = React.useRef(null);
  const mapPlaceListRef = React.useRef(null);
  const mapPlaceRowRefs = React.useRef(new Map());
  const dragStateRef = React.useRef({
    mode: null,
    startX: 0,
    startY: 0,
    centerPx: null,
    startDistance: 0,
    startZoom: 0,
  });
  const animationFrameRef = React.useRef(null);
  const suppressSelectionRecenteringRef = React.useRef(false);
  const selectionSourceRef = React.useRef('initial');

  const placesByCategory = React.useMemo(() => {
    return mapCategories.reduce((accumulator, category) => {
      accumulator[category] = portoGuidePlaces.filter((place) => place.category === category);
      return accumulator;
    }, {});
  }, []);

  const visiblePlaces = React.useMemo(() => {
    return placesByCategory[activeCategory] ?? [];
  }, [activeCategory, placesByCategory]);

  const selectedPlace = React.useMemo(() => {
    return portoGuidePlaces.find((place) => place.id === selectedPlaceId) ?? visiblePlaces[0] ?? portoGuidePlaces[0];
  }, [selectedPlaceId, visiblePlaces]);

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
      zoom: clamp(target.zoom, MIN_ZOOM, MAX_ZOOM),
    };

    if (duration <= 0) {
      setViewport(to);
      return;
    }

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
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const updateLayout = () => setIsMobileLayout(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener('change', updateLayout);

    return () => mediaQuery.removeEventListener('change', updateLayout);
  }, []);

  React.useEffect(() => {
    if (!visiblePlaces.some((place) => place.id === selectedPlaceId)) {
      setSelectedPlaceId(visiblePlaces[0]?.id ?? portoGuidePlaces[0]?.id);
      setIsDetailsOpen(true);
    }
  }, [activeCategory, selectedPlaceId, visiblePlaces]);

  React.useEffect(() => {
    if (!mapSize.width || !mapSize.height || !visiblePlaces.length) {
      return;
    }

    const categoryConfig = CATEGORY_VIEWPORT_CONFIG[activeCategory] ?? null;
    const relevantPlaces = visiblePlaces;

    const bounds = categoryConfig?.bounds ?? computeBoundsFromPlaces(relevantPlaces);
    const categoryTargetZoom = categoryConfig?.targetZoom ?? MIN_ZOOM;
    const nextViewport = fitBoundsToViewport(bounds, mapSize, {
      paddingX: isMobileLayout ? 44 : mapSize.width > 1200 ? 140 : 96,
      paddingY: isMobileLayout ? 52 : mapSize.height > 800 ? 120 : 90,
      targetZoom: isMobileLayout ? Math.min(categoryTargetZoom + 1, MAX_ZOOM - 1) : categoryConfig?.targetZoom,
    });

    suppressSelectionRecenteringRef.current = true;
    animateViewportTo(nextViewport, 0);

    const releaseSuppressTimer = window.setTimeout(() => {
      suppressSelectionRecenteringRef.current = false;
    }, 0);

    return () => {
      window.clearTimeout(releaseSuppressTimer);
      suppressSelectionRecenteringRef.current = false;
    };
  }, [activeCategory, animateViewportTo, isMobileLayout, mapSize.height, mapSize.width, visiblePlaces]);

  React.useEffect(() => {
    if (!selectedPlace || !mapSize.width || !mapSize.height) {
      return;
    }
    if (suppressSelectionRecenteringRef.current) {
      return;
    }

    const markerWorld = project(selectedPlace.lat, selectedPlace.lng, viewport.zoom);
    const centerWorld = project(viewport.lat, viewport.lng, viewport.zoom);
    const selectedScreenX = markerWorld.x - centerWorld.x + mapSize.width / 2;
    const selectedScreenY = markerWorld.y - centerWorld.y + mapSize.height / 2;

    const desiredX = mapSize.width * 0.58;
    const desiredY = mapSize.height * 0.52;

    const nearEdgeX = selectedScreenX < mapSize.width * 0.18 || selectedScreenX > mapSize.width * 0.88;
    const nearEdgeY = selectedScreenY < mapSize.height * 0.16 || selectedScreenY > mapSize.height * 0.86;

    if (nearEdgeX || nearEdgeY) {
      const nextCenterWorldX = markerWorld.x - (desiredX - mapSize.width / 2);
      const nextCenterWorldY = markerWorld.y - (desiredY - mapSize.height / 2);
      const nextCenter = unproject(nextCenterWorldX, nextCenterWorldY, viewport.zoom);

      animateViewportTo(
        {
          lat: nextCenter.lat,
          lng: nextCenter.lng,
          zoom: Math.max(viewport.zoom, isMobileLayout ? MOBILE_SELECTED_PLACE_ZOOM : 13),
        },
        320
      );
    }
  }, [animateViewportTo, isMobileLayout, mapSize.height, mapSize.width, selectedPlace, viewport.lat, viewport.lng, viewport.zoom]);

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

  React.useEffect(() => {
    if (!selectedPlaceId || !mapPlaceListRef.current) {
      return;
    }

    if (isMobileLayout && selectionSourceRef.current === 'marker') {
      selectionSourceRef.current = 'initial';
      return;
    }

    const selectedRow = mapPlaceRowRefs.current.get(selectedPlaceId);
    if (!selectedRow) {
      return;
    }

    selectedRow.scrollIntoView({
      behavior: 'smooth',
      block: isMobileLayout ? 'center' : 'nearest',
      inline: 'nearest',
    });

    selectionSourceRef.current = 'initial';
  }, [isMobileLayout, selectedPlaceId]);

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
        src: TILE_PROVIDER_URL.replace('{z}', zoomLevel).replace('{x}', wrappedX).replace('{y}', ty),
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
      mode: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      centerPx: centerPixels,
      startDistance: 0,
      startZoom: viewport.zoom,
    };
  };

  const beginTouchDrag = (event) => {
    if (!event.touches?.length) {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (event.touches.length >= 2) {
      const [touchA, touchB] = event.touches;
      const deltaX = touchB.clientX - touchA.clientX;
      const deltaY = touchB.clientY - touchA.clientY;
      const midpointX = (touchA.clientX + touchB.clientX) / 2;
      const midpointY = (touchA.clientY + touchB.clientY) / 2;

      dragStateRef.current = {
        mode: 'pinch',
        startX: midpointX,
        startY: midpointY,
        centerPx: centerPixels,
        startDistance: Math.hypot(deltaX, deltaY),
        startZoom: viewport.zoom,
      };
      return;
    }

    const [touch] = event.touches;
    dragStateRef.current = {
      mode: 'pan',
      startX: touch.clientX,
      startY: touch.clientY,
      centerPx: centerPixels,
      startDistance: 0,
      startZoom: viewport.zoom,
    };
  };

  const handleMouseMove = React.useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (dragState.mode !== 'pan' || !dragState.centerPx) {
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
    dragStateRef.current = {
      mode: null,
      startX: 0,
      startY: 0,
      centerPx: null,
      startDistance: 0,
      startZoom: viewport.zoom,
    };
  }, [viewport.zoom]);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [handleMouseMove, stopDrag]);

  React.useEffect(() => {
    const handleTouchMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState.mode || !dragState.centerPx || !event.touches?.length) {
        return;
      }

      if (dragState.mode === 'pinch' && event.touches.length >= 2) {
        const [touchA, touchB] = event.touches;
        const deltaX = touchB.clientX - touchA.clientX;
        const deltaY = touchB.clientY - touchA.clientY;
        const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
        const zoomChange = Math.log2(distance / Math.max(dragState.startDistance, 1));
        const nextZoom = clamp(dragState.startZoom + zoomChange, MIN_ZOOM, MAX_ZOOM);
        setViewport((current) => ({ ...current, zoom: nextZoom }));
        event.preventDefault();
        return;
      }

      const [touch] = event.touches;
      const nextCenterX = dragState.centerPx.x - (touch.clientX - dragState.startX);
      const nextCenterY = dragState.centerPx.y - (touch.clientY - dragState.startY);
      const nextCenter = unproject(nextCenterX, nextCenterY, viewport.zoom);
      setViewport((current) => ({ ...current, lat: clamp(nextCenter.lat, -85, 85), lng: nextCenter.lng }));
      event.preventDefault();
    };

    const handleTouchEnd = () => stopDrag();

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [stopDrag, viewport.zoom]);

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
          <p>Discover Porto and Gaia through a local, premium list of places across nine practical categories.</p>
        </header>

        <nav className="map-category-list" aria-label="Map categories">
          {mapCategories.map((category) => {
            const categoryCount = placesByCategory[category]?.length ?? 0;
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
        <section className="map-place-list" ref={mapPlaceListRef} aria-label={`${activeCategory} places`}>
          {visiblePlaces.map((place) => (
            <button
              key={place.id}
              type="button"
              ref={(node) => {
                if (node) {
                  mapPlaceRowRefs.current.set(place.id, node);
                } else {
                  mapPlaceRowRefs.current.delete(place.id);
                }
              }}
              className={`map-place-row ${selectedPlace?.id === place.id ? 'is-selected' : ''}`}
              onClick={() => {
                selectionSourceRef.current = 'list';
                setSelectedPlaceId(place.id);
                setIsDetailsOpen(true);
              }}
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
          onTouchStart={beginTouchDrag}
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
              onClick={() => {
                selectionSourceRef.current = 'marker';
                setSelectedPlaceId(marker.id);
                setIsDetailsOpen(true);
              }}
              title={marker.name}
              aria-label={marker.name}
            >
              <span className="map-marker__pulse" />
              <span className="map-marker__core" />
            </button>
          ))}

          {selectedPlace && isDetailsOpen ? (
            <>
              <div className="map-details-backdrop" aria-hidden="true" />
              <article className="map-details-panel" aria-live="polite">
                <button
                  type="button"
                  className="map-details-panel__close"
                  onClick={() => setIsDetailsOpen(false)}
                  aria-label="Close place details"
                >
                  <span aria-hidden="true">×</span>
                </button>
                <p className="eyebrow">{selectedPlace.category}</p>
                <h2>{selectedPlace.name}</h2>
                <p className="map-details-panel__area">{selectedPlace.area}</p>
                <p>{selectedPlace.description}</p>
                {selectedPlace.notes ? <p className="map-details-panel__notes">{selectedPlace.notes}</p> : null}
                {selectedPlace.instagram ? (
                  <a
                    className="map-details-panel__instagram"
                    href={`https://instagram.com/${normalizeInstagramHandle(selectedPlace.instagram)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    @{normalizeInstagramHandle(selectedPlace.instagram)}
                  </a>
                ) : null}
              </article>
            </>
          ) : null}

          <div className="map-attribution">
            <span className="map-attribution__hint">Use wheel to zoom and drag to pan.</span>
            <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">
              © OpenStreetMap contributors © CARTO
            </a>
          </div>
        </div>

      </section>
    </main>
  );
}

export default MapPage;
