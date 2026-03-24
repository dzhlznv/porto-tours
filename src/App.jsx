import { pageContent } from './content';
import { Section } from './components/Section';
import { ExampleCard } from './components/ExampleCard';
import { FaqItem } from './components/FaqItem';
import { WaitlistForm } from './components/WaitlistForm';

function App() {
  return (
    <div className="page-shell">
      <main className="page-content">
        <section className="hero" id="top">
          <p className="eyebrow">Porto, Portugal</p>
          <h1>{pageContent.hero.title}</h1>
          <p className="hero-subtitle">{pageContent.hero.subtitle}</p>
          <p className="hero-supporting">{pageContent.hero.supportingLine}</p>
          <a className="cta" href="#join">
            {pageContent.hero.cta}
          </a>
          <p className="hero-note">{pageContent.hero.note}</p>
        </section>

        <Section title="What this is" id="what-this-is">
          <p>{pageContent.whatThisIs}</p>
        </Section>

        <Section title="Example days" id="example-days">
          <div className="example-grid">
            {pageContent.exampleDays.map((day) => (
              <ExampleCard key={day.title} title={day.title} description={day.description} />
            ))}
          </div>
        </Section>

        <Section title="Who this is for" id="who-its-for">
          <ul className="soft-list">
            {pageContent.whoItsFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="About" id="about">
          <p>{pageContent.about}</p>
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
