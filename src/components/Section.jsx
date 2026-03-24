import React from 'react';
export function Section({ title, children, id }) {
  return (
    <section id={id} className="section">
      {title ? <h2 className="section-title">{title}</h2> : null}
      <div className="section-body">{children}</div>
    </section>
  );
}
