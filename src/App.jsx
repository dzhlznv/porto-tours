import heroImg from './assets/hero.jpg';
import aboutImg from './assets/about.jpg';
import React, { useState } from 'react';
import { pageContent } from './content';
import { Section } from './components/Section';
import { FaqItem } from './components/FaqItem';
import { WaitlistForm } from './components/WaitlistForm';
import { ParallaxImageCard } from './components/ParallaxImageCard';

function FramedImage({ src, alt, className }) {
  const [hasImageError, setHasImageError] = useState(false);

  if (hasImageError) {
    return (
      <div className={`framed-image placeholder ${className || ''}`} role="img" aria-label={alt}>
        <span>Photo placeholder</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`framed-image ${className || ''}`}
      onError={() => setHasImageError(true)}
      loading="lazy"
    />
  );
}

function App() {
  return (
    <div className="page-shell">
      <main className="page-content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Porto, Portugal · Personal city day</p>
            <h1>{pageContent.hero.title}</h1>
            <p className="hero-subtitle">{pageContent.hero.subtitle}</p>
            <p className="hero-supporting">{pageContent.hero.supportingLine}</p>
            <a className="cta" href="#join">
              {pageContent.hero.cta}
            </a>
            <p className="hero-note">{pageContent.hero.note}</p>
          </div>
          <FramedImage src={heroImg} alt="A cinematic Porto city moment" className="hero-image" />
        </section>

        <Section title="What this is" id="what-this-is">
          <p>{pageContent.whatThisIs}</p>
        </Section>

        <Section title="A classic day, reimagined" id="classic-day">
          <p>{pageContent.classicDay}</p>
          <p className="section-follow-up">{pageContent.dayShapingLine}</p>
        </Section>

        <Section title="About" id="about">
          <div className="about-layout">
            <div>
              <p>{pageContent.about}</p>
              <p className="section-follow-up">{pageContent.personalStory}</p>
              <p className="section-follow-up">{pageContent.motivation}</p>
              <p className="pill-line">{pageContent.donation}</p>
              <p className="pill-line">{pageContent.scarcity}</p>
            </div>
            <FramedImage src={aboutImg} alt="Neighborhood view in Porto" className="about-image" />
          </div>
        </Section>

        <Section title="Who this is for" id="who-its-for">
          <ul className="soft-list">
            {pageContent.whoItsFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Porto gallery" id="gallery">
          <p className="gallery-intro">
            A quiet visual edit of Porto — calm frames, small details, and city texture.
          </p>
          <div className="gallery-grid">
            {pageContent.gallery.map((image) => (
              <ParallaxImageCard key={image.src} src={image.src} alt={image.alt} />
            ))}
          </div>
          <p className="gallery-swipe-hint">Swipe to explore →</p>
        </Section>

        <Section title="FAQ" id="faq">
          <div className="faq-list">
            {pageContent.faq.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </Section>

        <Section title="Join the waitlist" id="join">
          <WaitlistForm />
        </Section>
      </main>
    </div>
  );
}

export default App;
