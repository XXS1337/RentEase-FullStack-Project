import React, { useEffect } from 'react';
import { useTranslate } from '../../../i18n/useTranslate';

import styles from './Modal.module.css';

// Props for the Modal component
type ModalProps = {
  message: string; // Message to display inside the modal
  onYes: () => void; // Handler for "Yes" button click
  onNo: () => void; // Handler for "No" button click or Escape key
  yesText?: string; // Optional custom text for the "Yes" button
  yesDisabled?: boolean; // Optional flag to disable the "Yes" button
};

// Modal component for confirmation dialogs
const Modal: React.FC<ModalProps> = ({ message, onYes, onNo, yesText, yesDisabled }) => {
  const t = useTranslate();

  // Function to handle "Escape" key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNo(); // Trigger the "No" button's functionality
      }
    };

    // Add event listener for keydown events when the component mounts
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNo]); // Include onNo in the dependency array to ensure it's up-to-date

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <p>{message}</p>
        <div className={styles.modalButtons}>
          <button className={`${styles.modalButton} ${styles.modalButtonNo}`} onClick={onNo}>
            {t('no')}
          </button>
          <button className={`${styles.modalButton} ${styles.modalButtonYes}`} onClick={onYes} disabled={yesDisabled}>
            {yesText || t('yes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
