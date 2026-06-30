import React, { useState } from 'react';

export function ParallaxImageCard({ src, alt, onClick }) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <button
      type="button"
      className="gallery-card gallery-card-button"
      onClick={onClick}
      aria-label={`Open image: ${alt}`}
    >
      <div className="gallery-media">
        {!hasImageError ? (
          <img
            src={src}
            alt={alt}
            className="gallery-image"
            loading="lazy"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="gallery-placeholder" role="img" aria-label={alt}>
            <span>Image placeholder</span>
          </div>
        )}
      </div>
    </button>
  );
}
