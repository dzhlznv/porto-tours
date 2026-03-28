import React from 'react';

export function NotFound() {
  return (
    <div className="page-shell not-found-shell">
      <main className="page-content not-found-content" role="main">
        <p className="eyebrow">Porto2You</p>
        <h1>Page not found</h1>
        <p className="hero-subtitle">Looks like you took a wrong turn.</p>
        <p className="hero-supporting">Let’s get you back to Porto.</p>
        <a className="cta" href="/">
          Back to Porto
        </a>
      </main>
    </div>
  );
}
