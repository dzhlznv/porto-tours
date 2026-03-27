import React from 'react';

const MAP_EMBED_URL =
  'https://www.google.com/maps?q=Porto%2C%20Portugal&z=13&output=embed';

function MapPage() {
  return (
    <main
      aria-label="Porto map"
      style={{
        width: '100vw',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        backgroundColor: '#f4f3ef',
      }}
    >
      <iframe
        title="Porto map"
        src={MAP_EMBED_URL}
        width="100%"
        height="100%"
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 0, minHeight: '100vh', display: 'block' }}
      />
    </main>
  );
}

export default MapPage;
