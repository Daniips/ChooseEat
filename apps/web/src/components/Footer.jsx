import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const [showLinks, setShowLinks] = useState(false);

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
        <nav 
          className="footer-nav-desktop"
          style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}
        >
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

        {/* Mobile: colapsable */}
        <div className="footer-nav-mobile" style={{ display: 'none' }}>
          <button
            onClick={() => setShowLinks(!showLinks)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 10,
              textDecoration: 'underline',
              padding: '4px 0'
            }}
          >
            {showLinks ? '▼ ' : '▶ '} {t('legal_information')}
          </button>
          
          {showLinks && (
            <nav style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 6,
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid var(--border)'
            }}>
              <Link to="/privacy" className="link" style={{ fontSize: 10 }}>
                {t('privacy_policy')}
              </Link>
              <Link to="/terms" className="link" style={{ fontSize: 10 }}>
                {t('terms_of_service')}
              </Link>
              <Link to="/cookies" className="link" style={{ fontSize: 10 }}>
                {t('cookie_policy')}
              </Link>
              <Link to="/legal" className="link" style={{ fontSize: 10 }}>
                {t('legal_notice')}
              </Link>
            </nav>
          )}
        </div>
        
        <p className="tiny muted" style={{ margin: 0, fontSize: 10 }}>
          © {year} ChooseEat. {t('all_rights_reserved')}
        </p>
      </div>
    </footer>
  );
}