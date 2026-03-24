import React, { useEffect, useRef, useState } from 'react';

const MAX_SHIFT = 16;

export function ParallaxImageCard({ src, alt }) {
  const cardRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isMobile = window.matchMedia('(max-width: 900px)');

    if (mediaQuery.matches || isMobile.matches) {
      setOffset(0);
      return undefined;
    }

    let rafId = null;

    const updateOffset = () => {
      const node = cardRef.current;

      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const cardCenter = rect.top + rect.height / 2;
      const distance = cardCenter - viewportCenter;
      const normalized = Math.max(-1, Math.min(1, distance / viewportCenter));

      setOffset(-normalized * MAX_SHIFT);
      rafId = null;
    };

    const requestUpdate = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(updateOffset);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    requestUpdate();

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <figure className="gallery-card" ref={cardRef}>
      {!hasImageError ? (
        <img
          src={src}
          alt={alt}
          className="gallery-image"
          loading="lazy"
          onError={() => setHasImageError(true)}
          style={{ transform: `translateY(${offset}px)` }}
        />
      ) : (
        <div className="gallery-placeholder" role="img" aria-label={alt}>
          <span>Image placeholder</span>
        </div>
      )}
    </figure>
  );
}
