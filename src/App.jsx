import heroImg from './assets/hero.jpg';
import aboutImg from './assets/about.jpg';
import aboutGalleryImg from './assets/gallery-29.jpg';
import React, { useMemo, useRef, useState } from 'react';
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
  const INITIAL_GALLERY_COUNT = 12;
  const GALLERY_BATCH_SIZE = 9;
  const [isMobileGallery, setIsMobileGallery] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [visibleGalleryCount, setVisibleGalleryCount] = useState(INITIAL_GALLERY_COUNT);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(null);
  const [activeAboutImageIndex, setActiveAboutImageIndex] = useState(0);
  const aboutCarouselRef = useRef(null);

  const aboutImages = [
    { src: aboutImg, alt: 'Neighborhood view in Porto' },
    { src: aboutGalleryImg, alt: 'Classic Porto street scene' },
  ];

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobileGallery(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const visibleGalleryItems = useMemo(
    () => (isMobileGallery ? pageContent.gallery : pageContent.gallery.slice(0, visibleGalleryCount)),
    [isMobileGallery, visibleGalleryCount]
  );
  const hasMoreGalleryItems = !isMobileGallery && visibleGalleryCount < pageContent.gallery.length;

  React.useEffect(() => {
    if (activeGalleryIndex === null) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveGalleryIndex(null);
      }
      if (event.key === 'ArrowRight') {
        setActiveGalleryIndex((index) => (index + 1) % visibleGalleryItems.length);
      }
      if (event.key === 'ArrowLeft') {
        setActiveGalleryIndex((index) => (index - 1 + visibleGalleryItems.length) % visibleGalleryItems.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGalleryIndex, visibleGalleryItems.length]);

  const handleViewMorePhotos = () => {
    setVisibleGalleryCount((count) => Math.min(count + GALLERY_BATCH_SIZE, pageContent.gallery.length));
  };

  const handleAboutCarouselScroll = (event) => {
    const { scrollLeft, clientWidth } = event.currentTarget;
    const nextIndex = Math.round(scrollLeft / clientWidth);
    setActiveAboutImageIndex(Math.max(0, Math.min(nextIndex, aboutImages.length - 1)));
  };

  const scrollAboutCarousel = (direction) => {
    const carouselNode = aboutCarouselRef.current;

    if (!carouselNode) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(activeAboutImageIndex + direction, aboutImages.length - 1));
    carouselNode.scrollTo({ left: nextIndex * carouselNode.clientWidth, behavior: 'smooth' });
    setActiveAboutImageIndex(nextIndex);
  };

  return (
    <div className="page-shell">
      <main className="page-content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Porto, Portugal · Personal city day</p>
            <h1>{pageContent.hero.title}</h1>
            <p className="hero-subtitle">{pageContent.hero.subtitle}</p>
            <div className="hero-clarity-block">
              <ul className="hero-clarity-list" aria-label="Experience format">
                {pageContent.hero.clarityPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <p className="hero-supporting">{pageContent.hero.supportingLine}</p>
            <a className="cta" href="#join">
              {pageContent.hero.cta}
            </a>
            <p className="hero-note">{pageContent.hero.note}</p>
          </div>
          <FramedImage src={heroImg} alt="A cinematic Porto city moment" className="hero-image" />
        </section>

        <Section title="About" id="about">
          <div className="about-layout">
            <div className="about-copy">
              {pageContent.aboutParagraphs.map((paragraph) => (
                <p key={paragraph} className="about-paragraph">
                  {paragraph}
                </p>
              ))}
              <div className="about-emphasis">
                <p>{pageContent.donation}</p>
                <p>{pageContent.scarcity}</p>
              </div>
            </div>
            <div className="about-gallery">
              <div className="about-carousel-shell">
                <div
                  className="about-carousel-track"
                  ref={aboutCarouselRef}
                  onScroll={handleAboutCarouselScroll}
                  aria-label="About photo gallery"
                >
                  {aboutImages.map((image) => (
                    <div className="about-carousel-slide" key={image.src}>
                      <div className="about-image-frame">
                        <FramedImage src={image.src} alt={image.alt} className="about-image" />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="about-carousel-arrow about-carousel-arrow-left"
                  onClick={() => scrollAboutCarousel(-1)}
                  disabled={activeAboutImageIndex === 0}
                  aria-label="Show previous about image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="about-carousel-arrow about-carousel-arrow-right"
                  onClick={() => scrollAboutCarousel(1)}
                  disabled={activeAboutImageIndex === aboutImages.length - 1}
                  aria-label="Show next about image"
                >
                  ›
                </button>
              </div>
              <div className="about-carousel-dots" aria-hidden="true">
                {aboutImages.map((image, index) => (
                  <span
                    key={image.src}
                    className={`about-carousel-dot ${index === activeAboutImageIndex ? 'is-active' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="What this day includes" id="what-day-includes">
          <div className="includes-grid">
            {pageContent.dayIncludes.map((item) => (
              <article key={item.title} className="includes-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section title="What this is" id="what-this-is">
          <p>{pageContent.whatThisIs}</p>
        </Section>

        <Section title="A classic day, reimagined" id="classic-day">
          <p>{pageContent.classicDay}</p>
          <p className="section-follow-up">{pageContent.dayShapingLine}</p>
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
            Porto through my eyes — calm details, quiet corners, and the atmosphere that makes this city feel like home.
          </p>
          <div className="gallery-grid">
            {visibleGalleryItems.map((image, index) => (
              <ParallaxImageCard
                key={image.src}
                src={image.src}
                alt={image.alt}
                onClick={() => setActiveGalleryIndex(index)}
              />
            ))}
          </div>
          {hasMoreGalleryItems ? (
            <div className="gallery-actions">
              <button
                type="button"
                className="gallery-more-button"
                onClick={handleViewMorePhotos}
                aria-label="View more photos"
              >
                View more photos
              </button>
            </div>
          ) : null}
          <p className="gallery-swipe-hint">Swipe to explore →</p>

          {activeGalleryIndex !== null ? (
            <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Enlarged gallery image">
              <button
                type="button"
                className="gallery-lightbox-close"
                onClick={() => setActiveGalleryIndex(null)}
                aria-label="Close enlarged photo view"
              >
                ×
              </button>
              <button
                type="button"
                className="gallery-lightbox-nav gallery-lightbox-prev"
                onClick={() =>
                  setActiveGalleryIndex((index) => (index - 1 + visibleGalleryItems.length) % visibleGalleryItems.length)
                }
                aria-label="View previous image"
              >
                ‹
              </button>
              <img
                src={visibleGalleryItems[activeGalleryIndex].src}
                alt={visibleGalleryItems[activeGalleryIndex].alt}
                className="gallery-lightbox-image"
              />
              <button
                type="button"
                className="gallery-lightbox-nav gallery-lightbox-next"
                onClick={() => setActiveGalleryIndex((index) => (index + 1) % visibleGalleryItems.length)}
                aria-label="View next image"
              >
                ›
              </button>
              <button
                type="button"
                className="gallery-lightbox-backdrop"
                onClick={() => setActiveGalleryIndex(null)}
                aria-label="Close lightbox background"
              />
            </div>
          ) : null}
        </Section>

        <Section title="FAQ" id="faq">
          <div className="faq-list">
            {pageContent.faq.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </Section>

        <Section title={pageContent.testimonial.title} id="what-people-say">
          <div className="testimonial-wrap">
            <p className="testimonial-quote">{pageContent.testimonial.quote}</p>
            <p className="testimonial-quote">{pageContent.testimonial.quoteSecond}</p>
            <p className="testimonial-quote">{pageContent.testimonial.quoteThird}</p>
            <p className="testimonial-author">{pageContent.testimonial.author}</p>
          </div>
        </Section>

        <Section title="Join the waitlist" id="join">
          <WaitlistForm />
        </Section>

        <footer className="site-footer" aria-label="Site footer">
          <p className="footer-tertiary">Photos and content © Dmitrii Zheleznov</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
