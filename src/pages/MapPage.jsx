import React from 'react';
import { defaultMapCategory, mapCategories, portoGuidePlaces } from '../data/portoGuide';

const TILE_SIZE = 256;
const MIN_ZOOM = 11;
const MAX_ZOOM = 17;
const CLUSTER_MAX_DISTANCE_KM = 1.2;
const CLUSTER_MIN_SIZE = 3;
const CLUSTER_MAX_SIZE = 6;
const CLUSTER_REVEAL_ZOOM = 15;

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

function getDistanceKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function buildFeaturedClusters(featuredPlaces) {
  const usedPlaceIds = new Set();
  const clusters = [];

  for (const seed of featuredPlaces) {
    if (usedPlaceIds.has(seed.id)) {
      continue;
    }

    const nearby = featuredPlaces
      .filter((candidate) => !usedPlaceIds.has(candidate.id) && candidate.id !== seed.id)
      .map((candidate) => ({
        place: candidate,
        distance: getDistanceKm(seed, candidate),
      }))
      .filter((entry) => entry.distance <= CLUSTER_MAX_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance)
      .map((entry) => entry.place);

    const nextClusterPlaces = [seed, ...nearby].slice(0, CLUSTER_MAX_SIZE);
    if (nextClusterPlaces.length < CLUSTER_MIN_SIZE) {
      continue;
    }

    nextClusterPlaces.forEach((place) => usedPlaceIds.add(place.id));
    const clusterLat = nextClusterPlaces.reduce((sum, place) => sum + place.lat, 0) / nextClusterPlaces.length;
    const clusterLng = nextClusterPlaces.reduce((sum, place) => sum + place.lng, 0) / nextClusterPlaces.length;

    clusters.push({
      id: `cluster-${clusters.length + 1}`,
      placeIds: nextClusterPlaces.map((place) => place.id),
      places: nextClusterPlaces,
      lat: clusterLat,
      lng: clusterLng,
    });
  }

  return {
    clusters,
    clusteredPlaceIds: usedPlaceIds,
  };
}

function createPlaceholderImage(placeName) {
  const label = encodeURIComponent((placeName ?? 'Porto').slice(0, 26));
  return `https://placehold.co/260x170/e9e5dc/495451?text=${label}`;
}

function resolvePlaceImage(place) {
  return place.image || createPlaceholderImage(place.name);
}

function MapPage() {
  const [activeCategory, setActiveCategory] = React.useState(defaultMapCategory);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState(() => {
    const featuredInCategory = portoGuidePlaces.find((place) => place.category === defaultMapCategory && place.featured);
    return featuredInCategory?.id ?? portoGuidePlaces[0]?.id;
  });
  const [viewport, setViewport] = React.useState({ lat: 41.1496, lng: -8.6109, zoom: 13 });
  const [mapSize, setMapSize] = React.useState({ width: 0, height: 0 });
  const [expandedClusterIds, setExpandedClusterIds] = React.useState([]);

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

  const featuredClusterData = React.useMemo(() => {
    const visibleFeaturedPlaces = visiblePlaces.filter((place) => place.featured);
    return buildFeaturedClusters(visibleFeaturedPlaces);
  }, [visiblePlaces]);

  const clusterCards = React.useMemo(() => {
    return featuredClusterData.clusters
      .filter((cluster) => viewport.zoom < CLUSTER_REVEAL_ZOOM && !expandedClusterIds.includes(cluster.id))
      .map((cluster) => {
        const pixelPoint = project(cluster.lat, cluster.lng, viewport.zoom);
        const images = cluster.places.map((place) => resolvePlaceImage(place));
        const hasRealImage = cluster.places.some((place) => Boolean(place.image));
        return {
          ...cluster,
          x: pixelPoint.x,
          y: pixelPoint.y,
          images,
          hasRealImage,
        };
      });
  }, [expandedClusterIds, featuredClusterData.clusters, viewport.zoom]);

  const hiddenClusteredPlaceIds = React.useMemo(() => {
    if (viewport.zoom >= CLUSTER_REVEAL_ZOOM) {
      return new Set();
    }

    const hiddenIds = new Set();
    featuredClusterData.clusters.forEach((cluster) => {
      if (!expandedClusterIds.includes(cluster.id)) {
        cluster.placeIds.forEach((placeId) => hiddenIds.add(placeId));
      }
    });
    return hiddenIds;
  }, [expandedClusterIds, featuredClusterData.clusters, viewport.zoom]);

  const highlightCardPlaces = React.useMemo(() => featuredPlaces.slice(0, 3), [featuredPlaces]);
  const [highlightCardIndex, setHighlightCardIndex] = React.useState(0);

  const selectedPlace = React.useMemo(() => {
    return portoGuidePlaces.find((place) => place.id === selectedPlaceId) ?? visiblePlaces[0] ?? portoGuidePlaces[0];
  }, [selectedPlaceId, visiblePlaces]);

  React.useEffect(() => {
    if (!visiblePlaces.some((place) => place.id === selectedPlaceId)) {
      setSelectedPlaceId(visiblePlaces[0]?.id ?? portoGuidePlaces[0]?.id);
    }
  }, [activeCategory, selectedPlaceId, visiblePlaces]);

  React.useEffect(() => {
    setExpandedClusterIds([]);
  }, [activeCategory]);

  React.useEffect(() => {
    if (viewport.zoom >= CLUSTER_REVEAL_ZOOM && expandedClusterIds.length) {
      setExpandedClusterIds([]);
    }
  }, [expandedClusterIds.length, viewport.zoom]);

  React.useEffect(() => {
    if (!selectedPlace) {
      return;
    }

    setViewport((current) => ({ ...current, lat: selectedPlace.lat, lng: selectedPlace.lng }));
  }, [selectedPlace?.id]);

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

  const tiles = [];
  for (let tx = minTileX; tx <= maxTileX; tx += 1) {
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      if (ty < 0 || ty >= 2 ** viewport.zoom) {
        continue;
      }

      const wrappedX = ((tx % (2 ** viewport.zoom)) + 2 ** viewport.zoom) % (2 ** viewport.zoom);
      tiles.push({
        key: `${viewport.zoom}-${tx}-${ty}`,
        src: `https://tile.openstreetmap.org/${viewport.zoom}/${wrappedX}/${ty}.png`,
        x: tx * TILE_SIZE - leftWorld,
        y: ty * TILE_SIZE - topWorld,
      });
    }
  }

  const mapMarkers = visiblePlaces
    .filter((place) => !hiddenClusteredPlaceIds.has(place.id))
    .map((place) => {
      const pixelPoint = project(place.lat, place.lng, viewport.zoom);
      return {
        ...place,
        x: pixelPoint.x - leftWorld,
        y: pixelPoint.y - topWorld,
      };
    });

  const positionedClusterCards = clusterCards.map((cluster) => ({
    ...cluster,
    x: cluster.x - leftWorld,
    y: cluster.y - topWorld,
  }));

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

  const showPreviousHighlight = () => {
    setHighlightCardIndex((current) => (current - 1 + highlightCardPlaces.length) % highlightCardPlaces.length);
  };

  const showNextHighlight = () => {
    setHighlightCardIndex((current) => (current + 1) % highlightCardPlaces.length);
  };

  const handleClusterClick = (cluster) => {
    setExpandedClusterIds((current) => {
      if (current.includes(cluster.id)) {
        return current;
      }
      return [...current, cluster.id];
    });

    setViewport((current) => ({
      ...current,
      lat: cluster.lat,
      lng: cluster.lng,
      zoom: clamp(Math.max(current.zoom + 2, CLUSTER_REVEAL_ZOOM), MIN_ZOOM, MAX_ZOOM),
    }));

    setSelectedPlaceId(cluster.placeIds[0] ?? selectedPlaceId);
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

          {mapMarkers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className={`map-marker ${marker.featured ? 'is-featured' : ''} ${
                selectedPlace?.id === marker.id ? 'is-selected' : ''
              }`}
              style={{ transform: `translate(${marker.x}px, ${marker.y}px)` }}
              onClick={() => setSelectedPlaceId(marker.id)}
              title={marker.name}
              aria-label={marker.name}
            />
          ))}

          {positionedClusterCards.map((cluster) => (
            <button
              key={cluster.id}
              type="button"
              className={`map-cluster-card ${cluster.hasRealImage ? '' : 'is-fallback'}`}
              style={{ transform: `translate(${cluster.x}px, ${cluster.y}px)` }}
              onClick={() => handleClusterClick(cluster)}
              title={`${cluster.places.length} featured places`}
              aria-label={`${cluster.places.length} featured places in this area. Click to zoom in.`}
            >
              {cluster.hasRealImage ? (
                <>
                  <span className="map-cluster-card__count">{cluster.places.length}</span>
                  <div className="map-cluster-card__images" aria-hidden="true">
                    <img src={cluster.images[1] ?? cluster.images[0]} alt="" loading="lazy" className="is-secondary-left" />
                    <img src={cluster.images[0]} alt="" loading="lazy" className="is-primary" />
                    <img src={cluster.images[2] ?? cluster.images[0]} alt="" loading="lazy" className="is-secondary-right" />
                  </div>
                </>
              ) : (
                <span className="map-cluster-card__fallback-dot" aria-hidden="true" />
              )}
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
