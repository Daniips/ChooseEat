import Loader from './Loader.jsx';
import { useTranslation } from 'react-i18next';

export default function RouteLoader() {
  const { t } = useTranslation();
  
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem'
    }}>
      <Loader />
      <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>{t('loading')}</p>
    </div>
  );
}
