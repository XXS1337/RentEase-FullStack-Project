import React from 'react';
import styles from './Spinner.module.css';

// Spinner component to indicate a loading state
const Spinner: React.FC = () => {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner}></div>
    </div>
  );
};

export default Spinner;
