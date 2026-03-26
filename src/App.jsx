import heroImg from './assets/hero.jpg';
import aboutImg from './assets/about.jpg';
import React, { useMemo, useState } from 'react';
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

function LegalPage({ title, intro, sections, closingLine }) {
  return (
    <div className="page-shell">
      <main className="page-content legal-page">
        <a className="back-home-link" href="/">
          Back to home
        </a>
        <article className="legal-content" aria-labelledby="legal-title">
          <header>
            <h1 id="legal-title">{title}</h1>
            <p>{intro}</p>
          </header>
          {sections.map((section) => (
            <section key={section.title} className="legal-section" aria-labelledby={`${title}-${section.title}`}>
              <h2 id={`${title}-${section.title}`}>{section.title}</h2>
              <p>{section.text}</p>
            </section>
          ))}
          <p className="legal-closing">{closingLine}</p>
        </article>
      </main>
    </div>
  );
}

function HomePage() {
  const INITIAL_GALLERY_COUNT = 12;
  const GALLERY_BATCH_SIZE = 9;
  const [isMobileGallery, setIsMobileGallery] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [visibleGalleryCount, setVisibleGalleryCount] = useState(INITIAL_GALLERY_COUNT);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(null);

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
            <FramedImage src={aboutImg} alt="Neighborhood view in Porto" className="about-image" />
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
          <p className="footer-primary">© Dmitrii Zheleznov</p>
          <p className="footer-secondary">
            All rights reserved · <a href="/privacy">Privacy</a> · <a href="/cookies">Cookies</a>
          </p>
          <p className="footer-tertiary">Photos and content © Dmitrii Zheleznov</p>
        </footer>
      </main>
    </div>
  );
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/privacy') {
    return (
      <LegalPage
        title="Privacy"
        intro="This website is designed to keep things simple and personal. If you share your details through the contact form, they are only used to reply to you and help arrange your Porto day."
        sections={[
          {
            title: 'Information you choose to share',
            text: 'When you fill in the contact form, you may share information such as your name, email address, preferred month, and anything else you choose to include in your message.',
          },
          {
            title: 'How your information is used',
            text: 'Your information is used only to read your message, reply personally, and, if relevant, help arrange a day in Porto. It is not sold or shared for unrelated marketing purposes.',
          },
          {
            title: 'Form handling',
            text: 'Messages submitted through the contact form are processed using Formspree, which helps deliver them securely. By submitting the form, your information may also be processed by Formspree for the purpose of handling your message.',
          },
          {
            title: 'Analytics and basic website data',
            text: 'This website may use simple analytics or technical logs to understand visits and improve the experience. This may include basic information such as browser type, device type, pages visited, and general usage patterns.',
          },
          {
            title: 'Data retention',
            text: 'Personal information is only kept for as long as it is reasonably useful for communication or planning. If you would like your message or details removed, you can get in touch.',
          },
          {
            title: 'Your choices',
            text: 'If you would like to ask about the information you shared, request its removal, or contact the site owner about privacy, you can do so by email.',
          },
          {
            title: 'Contact',
            text: 'For privacy-related questions, please contact: dmitrii@porto2you.com',
          },
        ]}
        closingLine="This page may be updated from time to time if the website changes."
      />
    );
  }

  if (path === '/cookies') {
    return (
      <LegalPage
        title="Cookies"
        intro="This website aims to use only what is necessary to make the experience work smoothly and understand basic visit patterns."
        sections={[
          {
            title: 'What cookies are',
            text: 'Cookies are small text files stored on your device that help websites function properly, remember settings, or understand how visitors use a site.',
          },
          {
            title: 'How this website may use cookies',
            text: 'This website may use basic cookies or similar technologies for simple functionality, form handling, performance, and analytics. The goal is to keep the site working well and understand how it is being used.',
          },
          {
            title: 'Analytics',
            text: 'If analytics tools are enabled, they may collect general usage information such as pages viewed, time on site, device type, browser type, and approximate location data. This information is used in aggregate to improve the site.',
          },
          {
            title: 'Third-party services',
            text: 'Some parts of the site may rely on third-party services, such as Formspree for contact form submissions. These services may use their own cookies or technical tools as part of providing their functionality.',
          },
          {
            title: 'Managing cookies',
            text: 'Most browsers allow you to control or disable cookies through their settings. If you prefer, you can remove stored cookies or block them entirely in your browser.',
          },
          {
            title: 'Contact',
            text: 'If you have questions about cookies on this website, please contact: dmitrii@porto2you.com',
          },
        ]}
        closingLine="This page may be updated if the tools or services used on the site change."
      />
    );
  }

  return <HomePage />;
}

export default App;
