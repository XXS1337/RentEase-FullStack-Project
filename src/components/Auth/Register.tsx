import React, { useState, useEffect } from 'react';
import { Form, useActionData, useNavigate } from 'react-router-dom';
import { validateField } from '../../utils/validateField';
import { useTranslate } from '../../i18n/useTranslate';
import axios from '../../api/axiosConfig';
import styles from './Auth.module.css';

// Define the structure for form data
type RegisterFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
};

// Define possible field-level and general validation errors
type FieldErrors = Partial<Record<keyof RegisterFormData | 'general', string>>;

// Server-side action for handling register form submission
export const registerAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData();

  // Extract all fields from the form
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const birthDate = formData.get('birthDate') as string;

  const lang = (formData.get('lang') as 'en' | 'ro') || 'en';

  const errors: FieldErrors = {};

  // Run validation on all fields
  errors.firstName = await validateField('firstName', firstName, { lang });
  errors.lastName = await validateField('lastName', lastName, { lang });
  errors.email = await validateField('email', email, { lang, checkEmail: true });
  errors.password = await validateField('password', password, { lang });
  errors.confirmPassword = await validateField('confirmPassword', confirmPassword, { password, lang });
  errors.birthDate = await validateField('birthDate', birthDate, { lang });

  // Remove any fields with no errors
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof RegisterFormData]) delete errors[key as keyof RegisterFormData];
  });

  // If there are validation errors, return them to the component
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    // Submit the data to the server
    await axios.post('/users/register', {
      firstName,
      lastName,
      email,
      password,
      birthDate,
    });

    return { success: true };
  } catch (error: any) {
    return {
      // Return a general server error if the request fails
      errors: {
        general: error?.response?.data?.message || 'Registration failed. Please try again.',
      },
    };
  }
};

const Register: React.FC = () => {
  const t = useTranslate();
  const actionData = useActionData<{ success?: boolean; errors?: FieldErrors }>();
  const navigate = useNavigate();

  // State for field values and validation
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false);

  // Navigate to login page on successful registration
  useEffect(() => {
    if (actionData?.success) {
      alert(t('registrationSuccess'));
      navigate('/login');
    }
    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general);
    }
  }, [actionData, navigate]);

  // Validate fields on blur
  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';

    if (name === 'email') {
      // 1) Validate email format
      const formatError = await validateField('email', value, { lang });
      if (formatError) {
        setFieldErrors((prev) => ({ ...prev, email: formatError }));
        return;
      }

      //2) If email format is ok, check if email is available
      setIsCheckingEmail(true);

      try {
        const res = await axios.post('/users/checkEmail', { email: value });
        const available = res.data?.available;
        const error = available ? '' : t('emailTaken');
        setFieldErrors((prev) => ({ ...prev, email: error }));
      } catch (error) {
        setFieldErrors((prev) => ({ ...prev, email: t('emailCheckFailed') }));
      } finally {
        setIsCheckingEmail(false);
      }
    } else {
      // Validate other fields
      const error = await validateField(name, value, { lang, password: formData.password });
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setGeneralError(null);
  };

  // Check if form is valid and ready to submit
  const isFormValid = () => {
    return Object.values(fieldErrors).every((error) => !error) && Object.values(formData).every((value) => value.trim() !== '') && !isCheckingEmail;
  };

  return (
    <div className={styles.auth}>
      <h2>{t('register')}</h2>
      <Form method="post" className={styles.form}>
        <input type="hidden" name="lang" value={localStorage.getItem('language') || 'en'} />
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="firstName">{t('firstNameLabel')}</label>
            <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} placeholder={t('firstNamePlaceholder')} required />
          </div>
          {fieldErrors.firstName && <p className={styles.error}>{fieldErrors.firstName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="lastName">{t('lastNameLabel')}</label>
            <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} placeholder={t('lastNamePlaceholder')} required />
          </div>
          {fieldErrors.lastName && <p className={styles.error}>{fieldErrors.lastName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="email">{t('emailLabel')}</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder={t('emailPlaceholder')} required />
          </div>
          {isCheckingEmail && <p className={styles.duplicateEmail}>{t('checkingEmail')}</p>}
          {fieldErrors.email && <p className={styles.error}>{fieldErrors.email}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="password">{t('passwordLabel')}</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} placeholder={t('passwordPlaceholder')} required />
          </div>
          {fieldErrors.password && <p className={styles.error}>{fieldErrors.password}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="confirmPassword">{t('confirmPasswordLabel')}</label>
            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder={t('confirmPasswordPlaceholder')} required />
          </div>
          {fieldErrors.confirmPassword && <p className={styles.error}>{fieldErrors.confirmPassword}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="birthDate">{t('birthDateLabel')}</label>
            <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.birthDate && <p className={styles.error}>{fieldErrors.birthDate}</p>}
        </div>

        {/* General Error */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        {/* Submit button */}
        <button type="submit" disabled={!isFormValid() || isCheckingEmail}>
          {t('register')}
        </button>
      </Form>
    </div>
  );
};

export default Register;
