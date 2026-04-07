import React from 'react';
import { defaultMapCategory, mapCategories, portoGuidePlaces, portoNeighborhoods } from '../data/portoGuide';

const TILE_SIZE = 256;
const TILE_PROVIDER_URL = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
const MIN_ZOOM = 11;
const MAX_ZOOM = 17;
const ZOOM_BUTTON_STEP = 0.5;
const DEFAULT_TRANSITION_MS = 420;
const MOBILE_BREAKPOINT_QUERY = '(max-width: 980px)';
const MOBILE_SELECTED_PLACE_ZOOM = 15;
const PAN_INTERACTION_RECENTER_COOLDOWN_MS = 700;
const PAN_SOFT_MARGIN_RATIO = 0.38;
const PAN_MIN_SOFT_MARGIN_LAT = 0.01;
const PAN_MIN_SOFT_MARGIN_LNG = 0.012;
const PAN_REFERENCE_BOUNDS = {
  north: 41.24,
  south: 41.08,
  west: -8.74,
  east: -8.5,
};

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
const NEIGHBORHOODS_CATEGORY = 'Neighborhoods';
const NEIGHBORHOOD_FILL_TONES = ['tone-moss', 'tone-sand', 'tone-clay', 'tone-sage', 'tone-lilac', 'tone-slate', 'tone-ocean', 'tone-olive'];

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

function getInstagramUrl(instagramValue) {
  if (!instagramValue) {
    return null;
  }

  if (instagramValue.startsWith('http://') || instagramValue.startsWith('https://')) {
    return instagramValue;
  }

  return `https://instagram.com/${normalizeInstagramHandle(instagramValue)}`;
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

function computeBoundsFromPolygonAreas(areas) {
  if (!areas.length) {
    return null;
  }

  return areas.reduce(
    (accumulator, area) => {
      area.polygon.forEach(([lat, lng]) => {
        accumulator.north = Math.max(accumulator.north, lat);
        accumulator.south = Math.min(accumulator.south, lat);
        accumulator.east = Math.max(accumulator.east, lng);
        accumulator.west = Math.min(accumulator.west, lng);
      });
      return accumulator;
    },
    { north: -90, south: 90, east: -180, west: 180 }
  );
}

function getPolygonCentroid(points) {
  if (!points.length) {
    return { lat: 0, lng: 0 };
  }

  const totals = points.reduce(
    (accumulator, [lat, lng]) => ({ lat: accumulator.lat + lat, lng: accumulator.lng + lng }),
    { lat: 0, lng: 0 }
  );

  return { lat: totals.lat / points.length, lng: totals.lng / points.length };
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

function constrainViewportCenter(center, zoom, mapSize, bounds = PAN_REFERENCE_BOUNDS) {
  if (!center) {
    return center;
  }

  const lat = clamp(center.lat, -85, 85);
  const lng = center.lng;

  if (!mapSize.width || !mapSize.height) {
    return { lat, lng };
  }

  const centerWorld = project(lat, lng, zoom);
  const leftTop = unproject(centerWorld.x - mapSize.width / 2, centerWorld.y - mapSize.height / 2, zoom);
  const rightBottom = unproject(centerWorld.x + mapSize.width / 2, centerWorld.y + mapSize.height / 2, zoom);

  const viewportLatSpan = Math.max(Math.abs(leftTop.lat - rightBottom.lat), PAN_MIN_SOFT_MARGIN_LAT * 2);
  const viewportLngSpan = Math.max(Math.abs(rightBottom.lng - leftTop.lng), PAN_MIN_SOFT_MARGIN_LNG * 2);

  const minCenterLat = bounds.south + viewportLatSpan / 2;
  const maxCenterLat = bounds.north - viewportLatSpan / 2;
  const minCenterLng = bounds.west + viewportLngSpan / 2;
  const maxCenterLng = bounds.east - viewportLngSpan / 2;

  const softLatMargin = Math.max(viewportLatSpan * PAN_SOFT_MARGIN_RATIO, PAN_MIN_SOFT_MARGIN_LAT);
  const softLngMargin = Math.max(viewportLngSpan * PAN_SOFT_MARGIN_RATIO, PAN_MIN_SOFT_MARGIN_LNG);

  return {
    lat: clamp(lat, minCenterLat - softLatMargin, maxCenterLat + softLatMargin),
    lng: clamp(lng, minCenterLng - softLngMargin, maxCenterLng + softLngMargin),
  };
}

function MapPage() {
  const [activeCategory, setActiveCategory] = React.useState(defaultMapCategory);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState(() => {
    const featuredInCategory = portoGuidePlaces.find((place) => place.category === defaultMapCategory && place.featured);
    return featuredInCategory?.id ?? portoGuidePlaces[0]?.id;
  });
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(true);
  const [isDetailsExpanded, setIsDetailsExpanded] = React.useState(false);
  const [viewport, setViewport] = React.useState({ lat: 41.15, lng: -8.61, zoom: 13 });
  const [mapSize, setMapSize] = React.useState({ width: 0, height: 0 });
  const [hoveredNeighborhoodId, setHoveredNeighborhoodId] = React.useState(null);
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
  const viewportRef = React.useRef(viewport);
  const lastManualPanRef = React.useRef(0);

  const placesByCategory = React.useMemo(() => {
    return mapCategories.reduce((accumulator, category) => {
      accumulator[category] = portoGuidePlaces.filter((place) => place.category === category);
      return accumulator;
    }, {});
  }, []);

  const visiblePlaces = React.useMemo(() => {
    return placesByCategory[activeCategory] ?? [];
  }, [activeCategory, placesByCategory]);
  const isNeighborhoodsMode = activeCategory === NEIGHBORHOODS_CATEGORY;

  const selectedPlace = React.useMemo(() => {
    if (isNeighborhoodsMode) {
      return portoNeighborhoods.find((neighborhood) => neighborhood.id === selectedPlaceId) ?? portoNeighborhoods[0] ?? null;
    }
    return portoGuidePlaces.find((place) => place.id === selectedPlaceId) ?? visiblePlaces[0] ?? portoGuidePlaces[0];
  }, [isNeighborhoodsMode, selectedPlaceId, visiblePlaces]);

  React.useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const animateViewportTo = React.useCallback((target, duration = DEFAULT_TRANSITION_MS) => {
    if (!target) {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const start = performance.now();
    const from = viewportRef.current;
    const to = {
      lat: clamp(target.lat, -85, 85),
      lng: target.lng,
      zoom: clamp(target.zoom, MIN_ZOOM, MAX_ZOOM),
    };

    if (duration <= 0) {
      setViewport(to);
      return;
    }

    const tick = (now) => {
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = easeOutCubic(progress);

      setViewport({
        lat: from.lat + (to.lat - from.lat) * eased,
        lng: from.lng + (to.lng - from.lng) * eased,
        zoom: from.zoom + (to.zoom - from.zoom) * eased,
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
    if (isNeighborhoodsMode) {
      if (!portoNeighborhoods.some((neighborhood) => neighborhood.id === selectedPlaceId)) {
        setSelectedPlaceId(portoNeighborhoods[0]?.id ?? portoGuidePlaces[0]?.id);
        setIsDetailsOpen(true);
        setIsDetailsExpanded(false);
      }
      return;
    }

    if (!visiblePlaces.some((place) => place.id === selectedPlaceId)) {
      setSelectedPlaceId(visiblePlaces[0]?.id ?? portoGuidePlaces[0]?.id);
      setIsDetailsOpen(true);
      setIsDetailsExpanded(false);
    }
  }, [isNeighborhoodsMode, selectedPlaceId, visiblePlaces]);

  React.useEffect(() => {
    if (!mapSize.width || !mapSize.height) {
      return;
    }

    const categoryConfig = CATEGORY_VIEWPORT_CONFIG[activeCategory] ?? null;
    const neighborhoodBounds = isNeighborhoodsMode ? computeBoundsFromPolygonAreas(portoNeighborhoods) : null;
    const bounds = categoryConfig?.bounds ?? neighborhoodBounds ?? computeBoundsFromPlaces(visiblePlaces);
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
  }, [activeCategory, animateViewportTo, isMobileLayout, isNeighborhoodsMode, mapSize.height, mapSize.width, visiblePlaces]);

  React.useEffect(() => {
    if (!selectedPlace || !mapSize.width || !mapSize.height) {
      return;
    }
    if (suppressSelectionRecenteringRef.current) {
      return;
    }
    if (dragStateRef.current.mode) {
      return;
    }
    if (Date.now() - lastManualPanRef.current < PAN_INTERACTION_RECENTER_COOLDOWN_MS) {
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
      const constrainedCenter = constrainViewportCenter(nextCenter, viewport.zoom, mapSize);

      animateViewportTo(
        {
          lat: constrainedCenter.lat,
          lng: constrainedCenter.lng,
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

  const tileZoom = Math.floor(viewport.zoom);
  const tileScale = 2 ** (viewport.zoom - tileZoom);
  const scaledTileSize = TILE_SIZE * tileScale;
  const centerPixels = project(viewport.lat, viewport.lng, viewport.zoom);

  const centerTilePixels = project(viewport.lat, viewport.lng, tileZoom);
  const leftTileWorld = centerTilePixels.x - mapSize.width / (2 * tileScale);
  const topTileWorld = centerTilePixels.y - mapSize.height / (2 * tileScale);

  const minTileX = Math.floor(leftTileWorld / TILE_SIZE);
  const maxTileX = Math.floor((leftTileWorld + mapSize.width / tileScale) / TILE_SIZE);
  const minTileY = Math.floor(topTileWorld / TILE_SIZE);
  const maxTileY = Math.floor((topTileWorld + mapSize.height / tileScale) / TILE_SIZE);

  const maxTileIndex = 2 ** tileZoom;
  const tiles = [];

  for (let tx = minTileX; tx <= maxTileX; tx += 1) {
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      if (ty < 0 || ty >= maxTileIndex) {
        continue;
      }

      const wrappedX = ((tx % maxTileIndex) + maxTileIndex) % maxTileIndex;
      tiles.push({
        key: `${tileZoom}-${tx}-${ty}`,
        src: TILE_PROVIDER_URL.replace('{z}', tileZoom).replace('{x}', wrappedX).replace('{y}', ty),
        x: (tx * TILE_SIZE - leftTileWorld) * tileScale,
        y: (ty * TILE_SIZE - topTileWorld) * tileScale,
        size: scaledTileSize,
      });
    }
  }

  const markerTone = CATEGORY_MARKER_TONES[activeCategory] ?? 'marker-sage';
  const mapMarkers = React.useMemo(() => {
    if (isNeighborhoodsMode) {
      return [];
    }

    return visiblePlaces.map((place) => {
      const pixelPoint = project(place.lat, place.lng, tileZoom);
      return {
        ...place,
        markerTone: CATEGORY_MARKER_TONES[place.category] ?? markerTone,
        x: (pixelPoint.x - leftTileWorld) * tileScale,
        y: (pixelPoint.y - topTileWorld) * tileScale,
      };
    });
  }, [activeCategory, isNeighborhoodsMode, leftTileWorld, markerTone, tileScale, tileZoom, topTileWorld, visiblePlaces]);

  const mapNeighborhoods = React.useMemo(() => {
    if (!isNeighborhoodsMode) {
      return [];
    }

    return portoNeighborhoods.map((neighborhood, index) => {
      const points = neighborhood.polygon.map(([lat, lng]) => {
        const pixelPoint = project(lat, lng, tileZoom);
        return {
          x: (pixelPoint.x - leftTileWorld) * tileScale,
          y: (pixelPoint.y - topTileWorld) * tileScale,
        };
      });
      const centroid = getPolygonCentroid(neighborhood.polygon);
      const centroidPoint = project(centroid.lat, centroid.lng, tileZoom);

      return {
        ...neighborhood,
        tone: NEIGHBORHOOD_FILL_TONES[index % NEIGHBORHOOD_FILL_TONES.length],
        points: points.map((point) => `${point.x},${point.y}`).join(' '),
        labelX: (centroidPoint.x - leftTileWorld) * tileScale,
        labelY: (centroidPoint.y - topTileWorld) * tileScale,
      };
    });
  }, [isNeighborhoodsMode, leftTileWorld, tileScale, tileZoom, topTileWorld]);

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
    lastManualPanRef.current = Date.now();
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
      lastManualPanRef.current = Date.now();
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
    lastManualPanRef.current = Date.now();
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
      const constrainedCenter = constrainViewportCenter(nextCenter, viewport.zoom, mapSize);
      lastManualPanRef.current = Date.now();
      setViewport((current) => ({ ...current, lat: constrainedCenter.lat, lng: constrainedCenter.lng }));
    },
    [mapSize, viewport.zoom]
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
        lastManualPanRef.current = Date.now();
        setViewport((current) => ({ ...current, zoom: nextZoom }));
        event.preventDefault();
        return;
      }

      const [touch] = event.touches;
      const nextCenterX = dragState.centerPx.x - (touch.clientX - dragState.startX);
      const nextCenterY = dragState.centerPx.y - (touch.clientY - dragState.startY);
      const nextCenter = unproject(nextCenterX, nextCenterY, viewport.zoom);
      const constrainedCenter = constrainViewportCenter(nextCenter, viewport.zoom, mapSize);
      lastManualPanRef.current = Date.now();
      setViewport((current) => ({ ...current, lat: constrainedCenter.lat, lng: constrainedCenter.lng }));
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
  }, [mapSize, stopDrag, viewport.zoom]);

  const handleWheel = (event) => {
    event.preventDefault();
    const deltaByMode = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 160 : event.deltaY;
    const zoomDelta = -deltaByMode * 0.0025;
    lastManualPanRef.current = Date.now();
    setViewport((current) => ({ ...current, zoom: clamp(current.zoom + zoomDelta, MIN_ZOOM, MAX_ZOOM) }));
  };

  const adjustZoom = React.useCallback((delta) => {
    lastManualPanRef.current = Date.now();
    setViewport((current) => ({ ...current, zoom: clamp(current.zoom + delta, MIN_ZOOM, MAX_ZOOM) }));
  }, []);

  return (
    <main className="map-page" aria-label="Porto2You curated guide map">
      <aside className="map-sidebar">
        <header className="map-sidebar__header">
          <p className="eyebrow">Porto2You</p>
          <h1>Curated Porto Map</h1>
          <p>Discover Porto and Gaia through a local, premium list of places and neighborhood stories.</p>
        </header>

        <nav className="map-category-list" aria-label="Map categories">
          {mapCategories.map((category) => {
            const categoryCount = category === NEIGHBORHOODS_CATEGORY ? portoNeighborhoods.length : placesByCategory[category]?.length ?? 0;
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
          {(isNeighborhoodsMode ? portoNeighborhoods : visiblePlaces).map((place) => (
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
                setIsDetailsExpanded(false);
              }}
            >
              <strong>{place.name}</strong>
              <span>{place.subtitle ?? place.area}</span>
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
              style={{ width: `${tile.size}px`, height: `${tile.size}px`, transform: `translate3d(${tile.x}px, ${tile.y}px, 0)` }}
            />
          ))}

          <div className="map-surface-wash" aria-hidden="true" />

          {isNeighborhoodsMode ? (
            <svg className="map-neighborhood-overlay" aria-hidden="true">
              {mapNeighborhoods.map((area) => (
                <g key={area.id}>
                  <polygon
                    className={`map-neighborhood-shape ${area.tone} ${
                      selectedPlace?.id === area.id ? 'is-selected' : ''
                    } ${hoveredNeighborhoodId === area.id ? 'is-hovered' : ''}`}
                    points={area.points}
                    onMouseEnter={() => setHoveredNeighborhoodId(area.id)}
                    onMouseLeave={() => setHoveredNeighborhoodId(null)}
                    onClick={() => {
                      selectionSourceRef.current = 'marker';
                      setSelectedPlaceId(area.id);
                      setIsDetailsOpen(true);
                      setIsDetailsExpanded(false);
                    }}
                  />
                  <text x={area.labelX} y={area.labelY} className="map-neighborhood-label">
                    {area.name}
                  </text>
                </g>
              ))}
            </svg>
          ) : null}

          {mapMarkers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className={`map-marker ${marker.markerTone} ${marker.featured ? 'is-featured' : ''} ${
                selectedPlace?.id === marker.id ? 'is-selected' : ''
              }`}
              style={{ transform: `translate3d(${marker.x}px, ${marker.y}px, 0)` }}
              onClick={() => {
                selectionSourceRef.current = 'marker';
                setSelectedPlaceId(marker.id);
                setIsDetailsOpen(true);
                setIsDetailsExpanded(false);
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
              <article className={`map-details-panel ${isDetailsExpanded ? 'is-expanded' : 'is-collapsed'}`} aria-live="polite">
                <header className="map-details-panel__header">
                  <button
                    type="button"
                    className="map-details-panel__close"
                    onClick={() => {
                      setIsDetailsOpen(false);
                      setIsDetailsExpanded(false);
                    }}
                    aria-label="Close place details"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                  <p className="eyebrow">{isNeighborhoodsMode ? NEIGHBORHOODS_CATEGORY : selectedPlace.category}</p>
                  <h2>{selectedPlace.name}</h2>
                  <p className="map-details-panel__area">{selectedPlace.subtitle ?? selectedPlace.area}</p>
                </header>
                <div className="map-details-panel__content">
                  <p className={isDetailsExpanded ? '' : 'map-details-panel__description-preview'}>{selectedPlace.description}</p>
                  {!isDetailsExpanded ? (
                    <button type="button" className="map-details-panel__read-more" onClick={() => setIsDetailsExpanded(true)}>
                      Read more
                    </button>
                  ) : null}
                  {isDetailsExpanded && selectedPlace.notes ? <p className="map-details-panel__notes">{selectedPlace.notes}</p> : null}
                  {isDetailsExpanded && selectedPlace.googleMapsUrl ? (
                    <a
                      className="map-details-panel__instagram"
                      href={selectedPlace.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in Google Maps
                    </a>
                  ) : null}
                  {isDetailsExpanded && selectedPlace.instagram ? (
                    <a
                      className="map-details-panel__instagram"
                      href={getInstagramUrl(selectedPlace.instagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open Instagram"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                        <path
                          fill="currentColor"
                          d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2m0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25zm8.75 1.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 6.5A5.5 5.5 0 1 1 6.5 12 5.5 5.5 0 0 1 12 6.5m0 1.5A4 4 0 1 0 16 12a4 4 0 0 0-4-4"
                        />
                      </svg>
                    </a>
                  ) : null}
                </div>
              </article>
            </>
          ) : null}

          <div className="map-zoom-controls" role="group" aria-label="Map zoom controls">
            <button
              type="button"
              className="map-zoom-button"
              onClick={() => adjustZoom(ZOOM_BUTTON_STEP)}
              onMouseDown={(event) => event.stopPropagation()}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="map-zoom-button"
              onClick={() => adjustZoom(-ZOOM_BUTTON_STEP)}
              onMouseDown={(event) => event.stopPropagation()}
              aria-label="Zoom out"
            >
              −
            </button>
          </div>

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
