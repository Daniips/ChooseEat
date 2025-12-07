import React from "react";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Terms() {
  const { t } = useTranslation('legal');
  const currentDate = new Date().toLocaleDateString();

  return (
    <div
      className="wrap wrap--scrollable"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
    >
      <Header />
      
      <main className="legal-page" style={{ flex: 1, maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <h1 className="legal-title">{t('terms.title')}</h1>
        <p className="legal-date">{t('terms.lastUpdated', { date: currentDate })}</p>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section1.title')}</h2>
          <p>{t('terms.section1.content')}</p>
          <p>{t('terms.section1.acceptance')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section2.title')}</h2>
          <p>{t('terms.section2.intro')}</p>
          <ul>
            <li>{t('terms.section2.create')}</li>
            <li>{t('terms.section2.join')}</li>
            <li>{t('terms.section2.vote')}</li>
            <li>{t('terms.section2.results')}</li>
          </ul>
          <p>{t('terms.section2.api')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section3.title')}</h2>
          <p>{t('terms.section3.intro')}</p>
          <ul>
            <li>{t('terms.section3.accuracy')}</li>
            <li>{t('terms.section3.confidentiality')}</li>
            <li>{t('terms.section3.notification')}</li>
          </ul>
          <p>{t('terms.section3.responsibility')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section4.title')}</h2>
          <p>{t('terms.section4.intro')}</p>
          <ul>
            <li>{t('terms.section4.legal')}</li>
            <li>{t('terms.section4.respectful')}</li>
            <li>{t('terms.section4.integrity')}</li>
            <li>{t('terms.section4.misuse')}</li>
            <li>{t('terms.section4.bots')}</li>
          </ul>
          <p>{t('terms.section4.consequences')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section5.title')}</h2>
          <p>{t('terms.section5.intro')}</p>
          <ul>
            <li>{t('terms.section5.software')}</li>
            <li>{t('terms.section5.brand')}</li>
            <li>{t('terms.section5.content')}</li>
          </ul>
          <p>{t('terms.section5.ownership')}</p>
          <p>{t('terms.section5.license')}</p>
          <p>{t('terms.section5.prohibition')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section6.title')}</h2>
          <p>{t('terms.section6.intro')}</p>
          <p>{t('terms.section6.accuracy')}</p>
          <p>{t('terms.section6.responsibility')}</p>
          <ul>
            <li>{t('terms.section6.errors')}</li>
            <li>{t('terms.section6.availability')}</li>
            <li>{t('terms.section6.changes')}</li>
          </ul>
          <p>{t('terms.section6.verification')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section7.title')}</h2>
          <p>{t('terms.section7.intro')}</p>
          <ul>
            <li>{t('terms.section7.availability')}</li>
            <li>{t('terms.section7.errors')}</li>
            <li>{t('terms.section7.security')}</li>
          </ul>
          <p>{t('terms.section7.limitation')}</p>
          <ul>
            <li>{t('terms.section7.indirect')}</li>
            <li>{t('terms.section7.decisions')}</li>
            <li>{t('terms.section7.thirdParty')}</li>
          </ul>
          <p>{t('terms.section7.own')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section8.title')}</h2>
          <p>{t('terms.section8.intro')}</p>
          <ul>
            <li>{t('terms.section8.breach')}</li>
            <li>{t('terms.section8.fraud')}</li>
            <li>{t('terms.section8.inactivity')}</li>
          </ul>
          <p>{t('terms.section8.notice')}</p>
          <p>{t('terms.section8.deletion')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section9.title')}</h2>
          <p>{t('terms.section9.content')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('terms.section10.title')}</h2>
          <p>{t('terms.section10.content')}</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
