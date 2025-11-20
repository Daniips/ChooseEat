import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        marginTop: 'auto',
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        textAlign: 'center',
        fontSize: 11,
        flexShrink: 0
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <nav style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/privacy" className="link" style={{ fontSize: 11 }}>
            {t('privacy_policy')}
          </Link>
          <span style={{ color: 'var(--muted)' }}>•</span>
          <Link to="/terms" className="link" style={{ fontSize: 11 }}>
            {t('terms_of_service')}
          </Link>
          <span style={{ color: 'var(--muted)' }}>•</span>
          <Link to="/cookies" className="link" style={{ fontSize: 11 }}>
            {t('cookie_policy')}
          </Link>
          <span style={{ color: 'var(--muted)' }}>•</span>
          <Link to="/legal" className="link" style={{ fontSize: 11 }}>
            {t('legal_notice')}
          </Link>
        </nav>
        
        <p className="tiny muted" style={{ margin: 0 }}>
          © {year} ChooseEat. {t('all_rights_reserved')}
        </p>
      </div>
    </footer>
  );
}