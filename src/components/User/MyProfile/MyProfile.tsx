import React, { useState, useEffect } from 'react';
import { Form, useLoaderData, useActionData, redirect } from 'react-router-dom';
import Cookies from 'js-cookie';
import axios from '../../../api/axiosConfig';
import handleRemoveUser from '../../../utils/handleRemoveUser';
import Modal from '../../Shared/Modal/Modal';
import { useAuth } from '../../../context/AuthContext';
import { validateField } from '../../../utils/validateField';
import { useTranslate } from '../../../i18n/useTranslate';
import type User from '../../../types/User';
import styles from './MyProfile.module.css';

// State type for modal visibility and message
type ShowModalState = {
  isVisible: boolean;
  message: string;
};

// Form data type for profile editing
type FormData = Omit<User, 'id' | 'createdAt' | 'isAdmin' | 'password' | 'role'> & {
  password: string;
  confirmPassword: string;
};

// Type for form validation errors
type FieldErrors = Partial<Record<keyof FormData | 'general', string>>;

// Optional _id included for Mongo users
type ExtendedUser = User & { _id?: string };

// Loader to fetch current user profile
export const myProfileLoader = async () => {
  const token = Cookies.get('token');
  if (!token) return redirect('/login');

  try {
    const { data } = await axios.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.currentUser;
  } catch (error) {
    console.error('Profile load error:', error);
    return redirect('/login');
  }
};

// Action to update user profile (and optionally password)
export const myProfileAction = async ({ request }: { request: Request }) => {
  const token = Cookies.get('token');
  if (!token) return redirect('/login');

  const formData = await request.formData();

  const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';

  // Extract and normalize field values
  const rawData = {
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    birthDate: formData.get('birthDate') as string,
  };

  // Validate input fields
  const errors: FieldErrors = {};
  errors.firstName = await validateField('firstName', rawData.firstName, { lang });
  errors.lastName = await validateField('lastName', rawData.lastName, { lang });
  errors.email = await validateField('email', rawData.email, { checkEmail: true, lang });
  errors.birthDate = await validateField('birthDate', rawData.birthDate, { lang });

  const payload: Record<string, string> = {
    firstName: rawData.firstName,
    lastName: rawData.lastName,
    email: rawData.email,
    birthDate: rawData.birthDate,
  };

  // If user wants to change password, validate and include it
  const isPasswordChanged = rawData.password.trim() !== '';

  if (isPasswordChanged) {
    errors.password = await validateField('password', rawData.password, { lang });
    errors.confirmPassword = await validateField('confirmPassword', rawData.confirmPassword, { password: rawData.password, lang });
    payload.newPassword = rawData.password;
  }

  // Remove empty errors
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof FieldErrors]) delete errors[key as keyof FieldErrors];
  });

  // If there are validation errors, return them to the component
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    await axios.patch('/users/updateMyProfile', payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (isPasswordChanged) {
      return { logout: true };
    } else {
      return { success: true };
    }
  } catch (error: any) {
    return {
      errors: {
        general: error?.response?.data?.message || 'Failed to update profile.',
      },
    };
  }
};

const MyProfile: React.FC = () => {
  const { logout, setUser } = useAuth();
  const t = useTranslate();
  const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';
  const userData = useLoaderData() as User;
  const actionData = useActionData() as { errors?: FieldErrors; success?: boolean; logout?: boolean } | undefined;

  // Component state
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
  });

  // Form state: errors, modal, spinner, etc.
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showModal, setShowModal] = useState<ShowModalState>({ isVisible: false, message: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form values from loader
  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: '',
        confirmPassword: '',
        birthDate: userData.birthDate ? userData.birthDate.split('T')[0] : '',
      });
    }
  }, [userData]);

  // React to action result (update, logout, or errors)
  useEffect(() => {
    if (actionData?.success && !formData.password.trim()) {
      alert(t('profileUpdateSuccess'));
      setUser({
        ...(userData as ExtendedUser),
        id: userData.id || (userData as ExtendedUser)._id!,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        birthDate: formData.birthDate,
      });
      window.location.href = '/';
    }

    if (actionData?.logout) {
      Cookies.remove('token');
      setUser(null);
      window.location.href = '/login';
    }

    if (actionData?.errors) {
      setFieldErrors(actionData.errors);
      if (actionData.errors.general) alert(actionData.errors.general);
    } else {
      setFieldErrors({});
    }
  }, [actionData]);

  // Validate individual field with optional email check
  const validateFieldLocal = async (name: keyof FormData, value: string) => {
    let error = '';

    if (name === 'email') {
      // 1 Validate email format
      const formatError = await validateField('email', value, { lang });
      if (formatError) {
        setFieldErrors((prev) => ({ ...prev, email: formatError }));
        return;
      }

      //2 If email format is ok, check if email is available
      setIsCheckingEmail(true);

      try {
        if (value !== userData.email) {
          const res = await axios.post('/users/checkEmail', { email: value });
          const available = res.data?.available;
          error = available ? '' : t('emailTaken');
        }
      } catch (err) {
        error = t('emailCheckFailed');
      } finally {
        setIsCheckingEmail(false);
      }
    } else {
      error = await validateField(name, value, {
        password: formData.password,
        allowEmptyPassword: true,
        lang,
      });
    }

    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Handlers for field blur and change
  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    await validateFieldLocal(name as keyof FormData, value);
  };

  // Handle form input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Validate the form before allowing update
  const isFormValid = () => {
    const hasErrors = Object.values(fieldErrors).some((error) => error);
    const isPasswordChanged = formData.password.trim() !== '' || formData.confirmPassword.trim() !== '';

    const hasChanges = userData && (formData.firstName !== userData.firstName || formData.lastName !== userData.lastName || formData.email !== userData.email || formData.birthDate !== (userData.birthDate?.split('T')[0] || '') || isPasswordChanged);

    const passwordFieldsValid = !isPasswordChanged || (formData.password.trim() !== '' && formData.confirmPassword.trim() !== '');

    return !hasErrors && hasChanges && passwordFieldsValid && !isCheckingEmail;
  };

  // Handle user deletion
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await handleRemoveUser('me');
      logout();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(t('deleteUserError'));
      setIsDeleting(false);
    }
  };

  // Cancel deletion modal and reset target state
  const handleCancelDelete = () => {
    setShowModal({ isVisible: false, message: '' });
  };

  return (
    <div className={styles.profile}>
      <h2 className={styles.profileTitle}>{t('myProfile')}</h2>

      {/* Display current profile info */}
      <div className={styles.profileDetails}>
        <h3>{t('userDetails')}</h3>
        <p>
          <strong>{t('firstNameLabel')}</strong> {userData.firstName}
        </p>
        <p>
          <strong>{t('lastNameLabel')}</strong> {userData.lastName}
        </p>
        <p>
          <strong>{t('emailLabel')}</strong> {userData.email}
        </p>
        <p>
          <strong>{t('birthDateLabel')}</strong> {new Date(userData.birthDate || '').toLocaleDateString('en-US')}
        </p>
        <p>
          <strong>{t('registeredAt')}</strong> {userData?.createdAt ? new Date(userData.createdAt).toLocaleString() : 'Not Available'}
        </p>
      </div>

      {/* Profile update form */}
      <h3 className={styles.formTitle}>{t('updateProfile')}</h3>
      <Form method="post" className={styles.form}>
        <input type="hidden" name="lang" value={lang} />
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="firstName">{t('firstNameLabel')}</label>
            <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.firstName && <p className={styles.error}>{fieldErrors.firstName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="lastName">{t('lastNameLabel')}</label>
            <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.lastName && <p className={styles.error}>{fieldErrors.lastName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="email">{t('emailLabel')}</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {isCheckingEmail && <p className={styles.duplicateEmail}>{t('checkingEmail')}</p>}
          {fieldErrors.email && <p className={styles.error}>{fieldErrors.email}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="birthDate">{t('birthDateLabel')}</label>
            <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.birthDate && <p className={styles.error}>{fieldErrors.birthDate}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="password">{t('passwordLabel')}</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.password && <p className={styles.error}>{fieldErrors.password}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="confirmPassword">{t('confirmPasswordLabel')}</label>
            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.confirmPassword && <p className={styles.error}>{fieldErrors.confirmPassword}</p>}
        </div>

        {/* Update button */}
        <button type="submit" className={styles.updateButton} disabled={!isFormValid()}>
          {t('update')}
        </button>
      </Form>

      {/* Delete Account button */}
      <button className={styles.deleteButton} onClick={() => setShowModal({ isVisible: true, message: t('confirmDelete') })}>
        {t('deleteAccount')}
      </button>

      {/* Modal Confirmation */}
      {showModal.isVisible && <Modal message={showModal.message} onYes={handleDeleteAccount} onNo={handleCancelDelete} yesDisabled={isDeleting} yesText={isDeleting ? t('deleting') : t('yes')} />}
    </div>
  );
};

export default MyProfile;
