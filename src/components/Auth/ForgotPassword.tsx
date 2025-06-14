import React, { useState, useEffect } from 'react';
import { Form, useActionData, useNavigation } from 'react-router-dom';
import axios from '../../api/axiosConfig';
import styles from './Auth.module.css';
import { useTranslate } from '../../i18n/useTranslate'; // Import translation hook

// Define the error structure for the forgot password form
type ForgotPasswordErrors = Partial<Record<'email' | 'general', string>>;

// Server-side action for handling forgot password form submission
export const forgotPasswordAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;

  const errors: ForgotPasswordErrors = {};

  // If there are validation errors, return them to the component
  if (Object.keys(errors).length > 0) return { errors };

  try {
    // Send the forgot password request to the backend
    const res = await axios.post('/users/forgotPassword', { email });
    return { success: true, message: res.data.message };
  } catch (err: any) {
    // Handle error from server and send back to the form
    return {
      errors: {
        general: err?.response?.data?.message || 'Failed to send reset email',
      },
    };
  }
};

const ForgotPassword: React.FC = () => {
  const t = useTranslate(); // Access translation function

  // Get response data from action (success, error messages, etc.)
  const actionData = useActionData() as { success?: boolean; message?: string; errors?: ForgotPasswordErrors };
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  // Local state for form fields and validation
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [wasSubmitted, setWasSubmitted] = useState(false);

  // Handle server-side response and update UI accordingly
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        // If email was accepted, clear form and show success message
        setEmail('');
        setFieldErrors({});
        setGeneralError(null);
        setWasSubmitted(true);
      }
      if (actionData.errors) {
        // If errors returned from server, show them
        setFieldErrors(actionData.errors);
        setGeneralError(actionData.errors.general || null);
      }
    }
  }, [actionData]);

  // Local validation on blur event
  const handleBlur = () => {
    if (!email) {
      setFieldErrors((prev) => ({ ...prev, email: t('emailRequired') }));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors((prev) => ({ ...prev, email: t('invalidEmail') }));
    } else {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  // Handle input value changes and clear previous errors
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (wasSubmitted) setWasSubmitted(false);
    setEmail(e.target.value);
    setFieldErrors((prev) => ({ ...prev, email: undefined }));
    setGeneralError(null);
  };

  return (
    <div className={styles.auth}>
      <h2>{t('forgotPasswordTitle')}</h2>
      <Form method="post" className={styles.form}>
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="email">{t('emailLabel')}</label>
            <input type="email" id="email" name="email" placeholder={t('emailPlaceholder')} value={email} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {/* Display field-level error if present */}
          {fieldErrors.email && <p className={styles.error}>{fieldErrors.email}</p>}
        </div>

        {/* Display server-side error or success message */}
        {generalError && <p className={styles.error}>{generalError}</p>}
        {wasSubmitted && <p className={styles.success}>{t('resetLinkSent')}</p>}

        {/* Submit button is disabled during submission or if input is invalid */}
        <button type="submit" disabled={isSubmitting || !email || !!fieldErrors.email} className={styles.saveButton}>
          {isSubmitting ? t('sending') : t('sendResetLink')}
        </button>
      </Form>
    </div>
  );
};

export default ForgotPassword;
