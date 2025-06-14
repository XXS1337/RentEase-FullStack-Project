import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ErrorPage.module.css';
import { useTranslate } from '../../i18n/useTranslate'; // Translation hook

// ErrorPage component to display when a route is not found or an error occurs
const ErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslate(); // Access translation function

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className={styles.errorPage}>
      <h1>{t('errorTitle')}</h1>
      <p>{t('errorDescription')}</p>
      <button className={styles.goBackButton} onClick={handleGoBack}>
        {t('goHome')}
      </button>
    </div>
  );
};

export default ErrorPage;
