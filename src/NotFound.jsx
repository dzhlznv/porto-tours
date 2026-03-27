import React from 'react';

export function NotFound({ hasMapRoute = false }) {
  return (
    <main className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-card">
        <p className="eyebrow">Porto to you</p>
        <h1 id="not-found-title" className="not-found-title">
          Not found
        </h1>
        <p className="not-found-subtitle">This place doesn’t exist on the map</p>
        <p className="not-found-body">
          Maybe the route changed. Or maybe it’s time to explore something else in Porto.
        </p>

        <div className="not-found-actions">
          <a className="cta" href="/">
            Back to home
          </a>
          {hasMapRoute ? (
            <a className="not-found-link" href="/map">
              Open the map
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}
