import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/Button";

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="wrap" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ maxWidth: 500 }}>
          <h1 style={{ fontSize: '6rem', margin: '0 0 16px', color: 'var(--accent)' }}>404</h1>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 12px', fontWeight: 600 }}>
            {t('notFound.title')}
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            {t('notFound.message')}
          </p>
          <Button variant="primary" onClick={() => navigate("/")}>
            {t('notFound.go_home')}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
