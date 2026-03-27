import React from 'react';

export function MapPage() {
  return (
    <main className="map-page" aria-label="Porto map page">
      <iframe
        className="map-page-frame"
        title="Porto map"
        src="https://www.google.com/maps?q=Porto%2C%20Portugal&output=embed"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </main>
  );
}
