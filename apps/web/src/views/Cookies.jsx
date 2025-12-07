import React from "react";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Cookies() {
  const { t } = useTranslation('legal');
  const currentDate = new Date().toLocaleDateString();

  return (
    <div
      className="wrap wrap--scrollable"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
    >
      <Header />
      
      <main className="legal-page" style={{ flex: 1, maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <h1 className="legal-title">{t('cookies.title')}</h1>
        <p className="legal-date">{t('cookies.lastUpdated', { date: currentDate })}</p>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('cookies.section1.title')}</h2>
          <p>{t('cookies.section1.content')}</p>
          <p>{t('cookies.section1.similar')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('cookies.section2.title')}</h2>
          <p>{t('cookies.section2.intro')}</p>
          
          <h3>{t('cookies.section2.technical.title')}</h3>
          <p>{t('cookies.section2.technical.content')}</p>
          
          <h3>{t('cookies.section2.preferences.title')}</h3>
          <p>{t('cookies.section2.preferences.content')}</p>
          
          <h3>{t('cookies.section2.analytics.title')}</h3>
          <p>{t('cookies.section2.analytics.content')}</p>
          
          <h3>{t('cookies.section2.advertising.title')}</h3>
          <p>{t('cookies.section2.advertising.content')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('cookies.section3.title')}</h2>
          <p>{t('cookies.section3.intro')}</p>
          
          <table className="legal-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: 8, textAlign: 'left' }}>{t('cookies.section3.table.name')}</th>
                <th style={{ padding: 8, textAlign: 'left' }}>{t('cookies.section3.table.type')}</th>
                <th style={{ padding: 8, textAlign: 'left' }}>{t('cookies.section3.table.purpose')}</th>
                <th style={{ padding: 8, textAlign: 'left' }}>{t('cookies.section3.table.duration')}</th>
                <th style={{ padding: 8, textAlign: 'left' }}>{t('cookies.section3.table.owner')}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.session.name')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.session.type')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.session.purpose')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.session.duration')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.session.owner')}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.theme.name')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.theme.type')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.theme.purpose')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.theme.duration')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.theme.owner')}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.language.name')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.language.type')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.language.purpose')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.language.duration')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.language.owner')}</td>
              </tr>
              <tr>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.analytics.name')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.analytics.type')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.analytics.purpose')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.analytics.duration')}</td>
                <td style={{ padding: 8 }}>{t('cookies.section3.cookies.analytics.owner')}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('cookies.section4.title')}</h2>
          <p>{t('cookies.section4.technical')}</p>
          <p>{t('cookies.section4.optional')}</p>
          <p>{t('cookies.section4.management')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('cookies.section5.title')}</h2>
          <p>{t('cookies.section5.intro')}</p>
          <ul>
            <li>{t('cookies.section5.panel')}</li>
            <li>{t('cookies.section5.browser')}
              <ul style={{ marginTop: 8 }}>
                <li>{t('cookies.section5.chrome')}</li>
                <li>{t('cookies.section5.firefox')}</li>
                <li>{t('cookies.section5.safari')}</li>
                <li>{t('cookies.section5.edge')}</li>
              </ul>
            </li>
          </ul>
          <p><strong>{t('cookies.section5.warning')}</strong></p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('cookies.section6.title')}</h2>
          <p>{t('cookies.section6.content')}</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-subtitle">{t('cookies.section7.title')}</h2>
          <p>{t('cookies.section7.content')}</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
