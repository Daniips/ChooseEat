import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Legal() {
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
        <h1 className="legal-title" style={{ marginTop: 0 }}>{t('legal.title')}</h1>
        <p className="legal-date">{t('legal.lastUpdated', { date: currentDate })}</p>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('legal.section1.title')}</h2>
          <p>{t('legal.section1.intro')}</p>
          <ul>
            <li>{t('legal.section1.company')}</li>
            <li>{t('legal.section1.nif')}</li>
            <li>{t('legal.section1.address')}</li>
            <li>{t('legal.section1.email')}</li>
            <li>{t('legal.section1.website')}</li>
            <li>{t('legal.section1.registry')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('legal.section2.title')}</h2>
          <p>{t('legal.section2.content')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('legal.section3.title')}</h2>
          <p>{t('legal.section3.intro')}</p>
          <p>{t('legal.section3.correct')}</p>
          <p>{t('legal.section3.prohibited')}</p>
          <ul>
            <li>{t('legal.section3.illegal')}</li>
            <li>{t('legal.section3.damage')}</li>
            <li>{t('legal.section3.unauthorized')}</li>
            <li>{t('legal.section3.disruptive')}</li>
          </ul>
          <p>{t('legal.section3.consequences')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('legal.section4.title')}</h2>
          <p>{t('legal.section4.intro')}</p>
          <p>{t('legal.section4.elements')}</p>
          <p>{t('legal.section4.ownership')}</p>
          <p>{t('legal.section4.prohibition')}</p>
          <p>{t('legal.section4.license')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('legal.section5.title')}</h2>
          <p>{t('legal.section5.intro')}</p>
          <ul>
            <li>{t('legal.section5.availability')}</li>
            <li>{t('legal.section5.errors')}</li>
            <li>{t('legal.section5.decisions')}</li>
            <li>{t('legal.section5.security')}</li>
            <li>{t('legal.section5.misuse')}</li>
          </ul>
          <p>{t('legal.section5.guarantee')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('legal.section6.title')}</h2>
          <p>{t('legal.section6.content')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('legal.section7.title')}</h2>
          <p>{t('legal.section7.content')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('legal.section8.title')}</h2>
          <p>{t('legal.section8.content')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('legal.section9.title')}</h2>
          <p>{t('legal.section9.content')}</p>
        </section>
        </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
