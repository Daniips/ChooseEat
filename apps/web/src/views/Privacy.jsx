import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Privacy() {
  const { t } = useTranslation('legal');
  const currentDate = new Date().toLocaleDateString();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="wrap wrap--scrollable"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
    >
      <Header />
      
      <main className="legal-page" style={{ flex: 1, maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ 
          background: 'var(--card)', 
          padding: 0, 
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--border)'
        }}>
        <div style={{ padding: '24px 48px 40px 48px' }}>
        <h1 className="legal-title" style={{ marginTop: 0 }}>{t('privacy.title')}</h1>
        <p className="legal-date">{t('privacy.lastUpdated', { date: currentDate })}</p>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section1.title')}</h2>
          <p>{t('privacy.section1.content')}</p>
          <div className="legal-contact">
            <p><strong>{t('privacy.section1.responsible')}</strong></p>
            <ul>
              <li>{t('privacy.section1.company')}</li>
              <li>{t('privacy.section1.nif')}</li>
              <li>{t('privacy.section1.address')}</li>
              <li>{t('privacy.section1.email')}</li>
              <li>{t('privacy.section1.website')}</li>
            </ul>
            <p>{t('privacy.section1.app')}</p>
          </div>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section2.title')}</h2>
          <p>{t('privacy.section2.intro')}</p>
          <ul>
            <li>{t('privacy.section2.registration')}</li>
            <li>{t('privacy.section2.preferences')}</li>
            <li>{t('privacy.section2.location')}</li>
            <li>{t('privacy.section2.technical')}</li>
            <li>{t('privacy.section2.usage')}</li>
          </ul>
          <p>{t('privacy.section2.sensitive')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section3.title')}</h2>
          <p>{t('privacy.section3.intro')}</p>
          
          <h3>{t('privacy.section3.service.title')}</h3>
          <p>{t('privacy.section3.service.content')}</p>
          
          <h3>{t('privacy.section3.improvement.title')}</h3>
          <p>{t('privacy.section3.improvement.content')}</p>
          
          <h3>{t('privacy.section3.security.title')}</h3>
          <p>{t('privacy.section3.security.content')}</p>
          
          <h3>{t('privacy.section3.communications.title')}</h3>
          <p>{t('privacy.section3.communications.content')}</p>
          
          <p>{t('privacy.section3.automated')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section4.title')}</h2>
          <p>{t('privacy.section4.intro')}</p>
          
          <h3>{t('privacy.section4.contract.title')}</h3>
          <p>{t('privacy.section4.contract.content')}</p>
          
          <h3>{t('privacy.section4.consent.title')}</h3>
          <p>{t('privacy.section4.consent.content')}</p>
          
          <h3>{t('privacy.section4.legitimate.title')}</h3>
          <p>{t('privacy.section4.legitimate.content')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section5.title')}</h2>
          <p>{t('privacy.section5.intro')}</p>
          <ul>
            <li>{t('privacy.section5.account')}</li>
            <li>{t('privacy.section5.sessions')}</li>
            <li>{t('privacy.section5.technical')}</li>
          </ul>
          <p>{t('privacy.section5.anonymization')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section6.title')}</h2>
          <p>{t('privacy.section6.intro')}</p>
          <ul>
            <li>{t('privacy.section6.hosting')}</li>
            <li>{t('privacy.section6.analytics')}</li>
          </ul>
          <p>{t('privacy.section6.contracts')}</p>
          <p>{t('privacy.section6.google')}</p>
          <p>{t('privacy.section6.noSale')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section7.title')}</h2>
          <p>{t('privacy.section7.intro')}</p>
          <p>{t('privacy.section7.guarantees')}</p>
          <ul>
            <li>{t('privacy.section7.clauses')}</li>
            <li>{t('privacy.section7.frameworks')}</li>
          </ul>
          <p>{t('privacy.section7.info')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section8.title')}</h2>
          <p>{t('privacy.section8.intro')}</p>
          <ul>
            <li>{t('privacy.section8.access')}</li>
            <li>{t('privacy.section8.rectification')}</li>
            <li>{t('privacy.section8.deletion')}</li>
            <li>{t('privacy.section8.limitation')}</li>
            <li>{t('privacy.section8.opposition')}</li>
            <li>{t('privacy.section8.portability')}</li>
            <li>{t('privacy.section8.withdraw')}</li>
          </ul>
          <p>{t('privacy.section8.exercise')}</p>
          <p>{t('privacy.section8.complaint')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section9.title')}</h2>
          <p>{t('privacy.section9.content')}</p>
          <ul>
            <li>{t('privacy.section9.encryption')}</li>
            <li>{t('privacy.section9.access')}</li>
            <li>{t('privacy.section9.monitoring')}</li>
            <li>{t('privacy.section9.updates')}</li>
          </ul>
          <p>{t('privacy.section9.note')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section10.title')}</h2>
          <p>{t('privacy.section10.content')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('privacy.section11.title')}</h2>
          <p>{t('privacy.section11.content')}</p>
        </section>
        </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
