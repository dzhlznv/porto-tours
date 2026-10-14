import React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

// Render only the basemap. MapPage remains the owner of every interaction
// and camera update, including selection and user-location centering.
export default function PositronBasemap({ viewport, mapSize }) {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const cameraRef = React.useRef(viewport);
  cameraRef.current = viewport;

  React.useEffect(() => {
    let disposed = false;

    import('maplibre-gl').then(({ default: maplibre }) => {
      if (disposed) return;
      const camera = cameraRef.current;
      mapRef.current = new maplibre.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [camera.lng, camera.lat],
        // MapPage projects a 256px world; MapLibre uses a 512px world.
        // Subtracting one preserves the exact geographic scale and bounds.
        zoom: camera.zoom - 1,
        interactive: false,
        attributionControl: false,
        // Use MapLibre's devicePixelRatio default, including on normal screens.
        // Vector geometry and glyphs are rendered at native canvas resolution.
        fadeDuration: 0,
        renderWorldCopies: true,
      });
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  React.useLayoutEffect(() => {
    mapRef.current?.resize();
  }, [mapSize.width, mapSize.height]);

  React.useLayoutEffect(() => {
    mapRef.current?.jumpTo({
      center: [viewport.lng, viewport.lat],
      zoom: viewport.zoom - 1,
    });
  }, [viewport.lat, viewport.lng, viewport.zoom, mapSize.width, mapSize.height]);

  return <div className="map-basemap" ref={containerRef} aria-hidden="true" />;
}
