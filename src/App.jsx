import heroImg from './assets/hero.jpg';
import aboutImg from './assets/about.jpg';
import aboutGalleryImg from './assets/gallery-29.jpg';
import logoImg from './assets/p2u-logo.png';
import mapImg from './assets/map.png';
import React, { useMemo, useRef, useState } from 'react';
import { pageContent } from './content';
import { Section } from './components/Section';
import { FaqItem } from './components/FaqItem';
import { WaitlistForm } from './components/WaitlistForm';
import { ParallaxImageCard } from './components/ParallaxImageCard';
import { NotFound } from './components/NotFound';
import MapPage from './pages/MapPage';

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

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="instagram-icon">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.1" cy="6.9" r="1.1" fill="currentColor" />
    </svg>
  );
}


function shuffleGalleryItems(items) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[randomIndex]] = [shuffledItems[randomIndex], shuffledItems[index]];
  }

  return shuffledItems;
}

function normalizePathname(pathname) {
  if (!pathname) {
    return '/';
  }

  const trimmedPathname = pathname.replace(/\/+$/, '');
  return trimmedPathname || '/';
}

function LandingPage() {
  const isBrowser = typeof window !== 'undefined';
  const instagramUrl = 'https://www.instagram.com/porto2u/';
  const INITIAL_GALLERY_COUNT = 5;
  const [isMobileGallery, setIsMobileGallery] = useState(false);
  const [visibleGalleryCount, setVisibleGalleryCount] = useState(INITIAL_GALLERY_COUNT);
  const [activeGalleryPhoto, setActiveGalleryPhoto] = useState(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeAboutImageIndex, setActiveAboutImageIndex] = useState(0);
  const [isAboutDragging, setIsAboutDragging] = useState(false);
  const [aboutHoverZone, setAboutHoverZone] = useState('center');
  const aboutCarouselRef = useRef(null);
  const aboutDragRef = useRef({
    isMouseDown: false,
    startX: 0,
    startScrollLeft: 0,
    hasDragged: false,
    suppressClick: false,
  });

  const [displayGallery, setDisplayGallery] = useState(pageContent.gallery);

  const aboutImages = [
    { src: aboutImg, alt: 'Neighborhood view in Porto' },
    { src: aboutGalleryImg, alt: 'Classic Porto street scene' },
  ];

  React.useEffect(() => {
    if (!isBrowser) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobileGallery(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isBrowser]);

  React.useEffect(() => {
    if (!isBrowser) {
      return undefined;
    }

    const handleScroll = () => {
      setHasScrolled(window.scrollY > 18);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isBrowser]);

  const visibleGalleryItems = useMemo(
    () => (isMobileGallery ? displayGallery : displayGallery.slice(0, visibleGalleryCount)),
    [displayGallery, isMobileGallery, visibleGalleryCount]
  );
  const hasMoreGalleryItems = !isMobileGallery && visibleGalleryCount < displayGallery.length;
  const activeGalleryPhotoIndex = displayGallery.findIndex((photo) => photo.src === activeGalleryPhoto?.src);

  React.useEffect(() => {
    if (!isBrowser || activeGalleryPhotoIndex === -1) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveGalleryPhoto(null);
      }
      if (event.key === 'ArrowRight') {
        setActiveGalleryPhoto(displayGallery[(activeGalleryPhotoIndex + 1) % displayGallery.length]);
      }
      if (event.key === 'ArrowLeft') {
        setActiveGalleryPhoto(
          displayGallery[(activeGalleryPhotoIndex - 1 + displayGallery.length) % displayGallery.length]
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGalleryPhotoIndex, displayGallery, isBrowser]);

  const getContactScrollTop = React.useCallback(() => {
    if (!isBrowser) {
      return 0;
    }

    const contactSection = document.getElementById('contact');
    if (!contactSection) {
      return 0;
    }

    const header = document.querySelector('.site-header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const headerMargin = 12;

    return Math.max(0, contactSection.getBoundingClientRect().top + window.scrollY - headerHeight - headerMargin);
  }, [isBrowser]);

  const scrollToContact = React.useCallback(
    (event) => {
      if (event) {
        event.preventDefault();
      }

      if (!isBrowser) {
        return;
      }

      const scrollToCurrentContactPosition = (behavior = 'smooth') => {
        window.scrollTo({
          top: getContactScrollTop(),
          behavior,
        });
      };

      scrollToCurrentContactPosition();

      if (window.location.hash !== '#contact') {
        window.history.pushState(null, '', '#contact');
      }

      const correctScrollAfterLayoutSettles = () => scrollToCurrentContactPosition('auto');
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(correctScrollAfterLayoutSettles);
      });
      window.setTimeout(correctScrollAfterLayoutSettles, 350);
      if (document.fonts?.ready) {
        document.fonts.ready.then(correctScrollAfterLayoutSettles).catch(() => {});
      }
    },
    [getContactScrollTop, isBrowser]
  );

  const handleViewMorePhotos = () => {
    setVisibleGalleryCount((count) => Math.min(count + 6, displayGallery.length));
  };

  const handleShufflePhotos = () => {
    setDisplayGallery(shuffleGalleryItems(pageContent.gallery));
    setVisibleGalleryCount(INITIAL_GALLERY_COUNT);
    setActiveGalleryPhoto(null);
  };

  const openGalleryLightbox = (photo) => {
    setActiveGalleryPhoto(photo);
  };

  const handleAboutCarouselScroll = (event) => {
    const { scrollLeft, clientWidth } = event.currentTarget;
    const nextIndex = Math.round(scrollLeft / clientWidth);
    setActiveAboutImageIndex(Math.max(0, Math.min(nextIndex, aboutImages.length - 1)));
  };

  const scrollToAboutSlide = React.useCallback(
    (index) => {
      const carouselNode = aboutCarouselRef.current;
      if (!carouselNode) {
        return;
      }

      const boundedIndex = Math.max(0, Math.min(index, aboutImages.length - 1));
      carouselNode.scrollTo({
        left: boundedIndex * carouselNode.clientWidth,
        behavior: 'smooth',
      });
    },
    [aboutImages.length]
  );

  const stopAboutDragging = () => {
    if (!aboutDragRef.current.isMouseDown) {
      return;
    }

    const carouselNode = aboutCarouselRef.current;
    aboutDragRef.current.suppressClick = aboutDragRef.current.hasDragged;
    aboutDragRef.current.isMouseDown = false;
    setIsAboutDragging(false);

    if (!carouselNode) {
      return;
    }

    carouselNode.classList.remove('is-dragging');

    if (aboutDragRef.current.hasDragged) {
      const nextIndex = Math.round(carouselNode.scrollLeft / carouselNode.clientWidth);
      scrollToAboutSlide(nextIndex);
    }
  };

  const handleAboutMouseDown = (event) => {
    const isDesktopPointer = isBrowser && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isDesktopPointer || event.button !== 0) {
      return;
    }

    const carouselNode = aboutCarouselRef.current;
    if (!carouselNode) {
      return;
    }

    aboutDragRef.current = {
      isMouseDown: true,
      startX: event.clientX,
      startScrollLeft: carouselNode.scrollLeft,
      hasDragged: false,
      suppressClick: false,
    };

    setIsAboutDragging(true);
    carouselNode.classList.add('is-dragging');
    event.preventDefault();
  };

  React.useEffect(() => {
    if (!isBrowser) {
      return undefined;
    }

    const handleAboutMouseMove = (event) => {
      if (!aboutDragRef.current.isMouseDown) {
        return;
      }

      const carouselNode = aboutCarouselRef.current;
      if (!carouselNode) {
        return;
      }

      const dragDistance = event.clientX - aboutDragRef.current.startX;
      if (Math.abs(dragDistance) > 3) {
        aboutDragRef.current.hasDragged = true;
      }
      carouselNode.scrollLeft = aboutDragRef.current.startScrollLeft - dragDistance;
      event.preventDefault();
    };

    const handleWindowMouseUp = () => stopAboutDragging();

    window.addEventListener('mousemove', handleAboutMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleAboutMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isBrowser, scrollToAboutSlide]);

  const handleAboutMouseMove = (event) => {
    const isDesktopPointer = isBrowser && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isDesktopPointer) {
      return;
    }

    if (!aboutDragRef.current.isMouseDown) {
      const carouselNode = aboutCarouselRef.current;
      if (!carouselNode) {
        return;
      }

      const rect = carouselNode.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const edgeThreshold = rect.width * 0.2;
      if (relativeX <= edgeThreshold) {
        setAboutHoverZone('left');
      } else if (relativeX >= rect.width - edgeThreshold) {
        setAboutHoverZone('right');
      } else {
        setAboutHoverZone('center');
      }
      return;
    }

    const carouselNode = aboutCarouselRef.current;
    if (!carouselNode) {
      return;
    }

    const dragDistance = event.clientX - aboutDragRef.current.startX;
    carouselNode.scrollLeft = aboutDragRef.current.startScrollLeft - dragDistance;
    event.preventDefault();
  };

  const handleAboutMouseEnter = () => {
    setAboutHoverZone('center');
  };

  const handleAboutMouseLeave = () => {
    setAboutHoverZone('center');
    stopAboutDragging();
  };

  const handleAboutTrackClick = (event) => {
    const isDesktopPointer = isBrowser && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isDesktopPointer) {
      return;
    }

    if (aboutDragRef.current.suppressClick) {
      aboutDragRef.current.suppressClick = false;
      return;
    }

    const carouselNode = aboutCarouselRef.current;
    if (!carouselNode) {
      return;
    }

    const rect = carouselNode.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const edgeThreshold = rect.width * 0.2;

    if (relativeX <= edgeThreshold) {
      scrollToAboutSlide(activeAboutImageIndex - 1);
    } else if (relativeX >= rect.width - edgeThreshold) {
      scrollToAboutSlide(activeAboutImageIndex + 1);
    }
  };

  return (
    <div className="page-shell">
      <header className={`site-header ${hasScrolled ? 'is-scrolled' : ''}`} aria-label="Primary navigation">
        <div className="site-header-inner">
          <a className="site-logo" href="#top" aria-label="Go to top">
            <img className="site-logo-image" src={logoImg} alt="Porto2You" />
          </a>
          <nav className="site-nav" aria-label="Section links">
            <a className="desktop-nav-item" href="#about">
              About
            </a>
            <a className="desktop-nav-item" href="#experience">
              Experience
            </a>
            <a className="mobile-map-nav-item" href="https://porto2you.com/map" target="_blank" rel="noopener noreferrer">
              Map
            </a>
          </nav>
          <a className="site-header-cta" href="#contact" onClick={scrollToContact}>
            Plan a day
          </a>
        </div>
      </header>
      <main className="page-content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Porto, Portugal · Personal city day</p>
            <h1>{pageContent.hero.title}</h1>
            <p className="hero-subtitle">{pageContent.hero.subtitle}</p>
            <div className="quick-facts" aria-label="Quick facts">
              {pageContent.hero.quickFacts.map((fact) => (
                <div className="quick-fact" key={fact.label}>
                  <span className="quick-fact-label">{fact.label}</span>
                  <span className="quick-fact-value">{fact.value}</span>
                </div>
              ))}
            </div>
            <p className="hero-supporting">{pageContent.hero.supportingLine}</p>
            <a className="cta" href="#contact" onClick={scrollToContact}>
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
              <a
                className="about-instagram-link"
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow everyday Porto on Instagram"
              >
                <span>Follow everyday Porto</span>
                <InstagramIcon />
              </a>
            </div>
            <div className="about-gallery">
              <div className="about-carousel-shell">
                <div
                  className={`about-carousel-track ${isAboutDragging ? 'is-dragging' : ''} ${
                    aboutHoverZone === 'left' ? 'is-edge-left' : ''
                  } ${aboutHoverZone === 'right' ? 'is-edge-right' : ''}`}
                  ref={aboutCarouselRef}
                  onScroll={handleAboutCarouselScroll}
                  onMouseDown={handleAboutMouseDown}
                  onMouseMove={handleAboutMouseMove}
                  onMouseEnter={handleAboutMouseEnter}
                  onMouseUp={stopAboutDragging}
                  onMouseLeave={handleAboutMouseLeave}
                  onClick={handleAboutTrackClick}
                  aria-label="About photo gallery"
                >
                  {aboutImages.map((image) => (
                    <div className="about-carousel-slide" key={image.src}>
                      <div className="about-image-frame">
                        <FramedImage src={image.src} alt={image.alt} className="hero-image" />
                      </div>
                    </div>
                  ))}
                </div>
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

        <Section title="What this day includes" id="experience">
          <div className="includes-grid">
            {pageContent.dayIncludes.map((item) => (
              <article key={item.title} className="includes-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section id="map">
          <div className="map-layout">
            <div className="map-entry">
              <p className="eyebrow map-entry-eyebrow">PORTO, AS I SEE IT</p>
              <h2 className="map-entry-headline">A map of places I keep coming back to.</h2>
              <p className="map-entry-description">
                Coffee, food, walks, views, and everyday spots — the corners of the city that feel like home.
              </p>
              <a
                className="map-entry-button"
                href="https://porto2you.com/map"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open the map
              </a>
            </div>
            <FramedImage src={mapImg} alt="A curated Porto map preview" className="hero-image map-entry-image" />
          </div>
        </Section>

        <section className="section what-this-section" id="what-this-is">
          <p className="eyebrow what-this-eyebrow">ABOUT THE DAY</p>
          <h2 className="section-title what-this-title">What this is</h2>
          <div className="section-body what-this-body">
            <p>{pageContent.whatThisIs}</p>
          </div>
        </section>

        <Section title="A classic day, reimagined" id="classic-day">
          {pageContent.classicDayParagraphs.map((paragraph) => (
            <p key={paragraph} className="classic-day-paragraph">
              {paragraph}
            </p>
          ))}
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
          <div className="gallery-intro-row">
            <p className="gallery-intro">
              Porto through my eyes — calm details, quiet corners, and the atmosphere that makes this city feel like
              home.
            </p>
            <button
              type="button"
              className="gallery-shuffle-button"
              onClick={handleShufflePhotos}
              aria-label="Shuffle gallery photos"
            >
              Surprise me ↻
            </button>
          </div>
          <div className="gallery-grid">
            {visibleGalleryItems.map((image) => (
              <ParallaxImageCard
                key={image.id || image.src}
                src={image.src}
                alt={image.alt}
                onClick={() => openGalleryLightbox(image)}
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

          {activeGalleryPhotoIndex !== -1 ? (
            <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Enlarged gallery image">
              <button
                type="button"
                className="gallery-lightbox-close"
                onClick={() => setActiveGalleryPhoto(null)}
                aria-label="Close enlarged photo view"
              >
                ×
              </button>
              <button
                type="button"
                className="gallery-lightbox-nav gallery-lightbox-prev"
                onClick={() =>
                  setActiveGalleryPhoto(
                    displayGallery[(activeGalleryPhotoIndex - 1 + displayGallery.length) % displayGallery.length]
                  )
                }
                aria-label="View previous image"
              >
                ‹
              </button>
              <img
                src={activeGalleryPhoto.src}
                alt={activeGalleryPhoto.alt}
                className="gallery-lightbox-image"
              />
              <button
                type="button"
                className="gallery-lightbox-nav gallery-lightbox-next"
                onClick={() =>
                  setActiveGalleryPhoto(displayGallery[(activeGalleryPhotoIndex + 1) % displayGallery.length])
                }
                aria-label="View next image"
              >
                ›
              </button>
              <button
                type="button"
                className="gallery-lightbox-backdrop"
                onClick={() => setActiveGalleryPhoto(null)}
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

        <Section title="Join the waitlist" id="contact">
          <p className="waitlist-trust-note">No spam. I’ll only reach out when new dates open.</p>
          <WaitlistForm />
        </Section>

        <footer className="site-footer" aria-label="Site footer">
          <div className="site-footer-inner">
            <p className="footer-tertiary">Photos and content © Dmitrii Zheleznov</p>
            <a
              className="instagram-link footer-instagram-link"
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

function App({ initialPathname = '/' }) {
  const isBrowser = typeof window !== 'undefined';
  const pathname = isBrowser ? window.location.pathname : initialPathname;
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === '/') {
    return <LandingPage />;
  }

  if (normalizedPathname === '/map') {
    return <MapPage />;
  }

  return <NotFound />;
}

export default App;
