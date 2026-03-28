import React from 'react';

export function NotFound() {
  return (
    <div className="page-shell not-found-shell">
      <main className="page-content not-found-content" role="main">
        <p className="eyebrow">Porto2You</p>
        <h1>Page not found</h1>
        <p className="hero-subtitle">This street is not on the tour map yet.</p>
        <a className="cta" href="/">
          Back to homepage
        </a>
      </main>
    </div>
  );
}
