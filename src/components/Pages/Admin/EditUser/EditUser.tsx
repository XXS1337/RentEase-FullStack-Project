import React, { useEffect, useState } from 'react';
import { Form, useLoaderData, useActionData, redirect, useNavigate, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router-dom';
import Cookies from 'js-cookie';
import axios from '../../../../api/axiosConfig';
import handleRemoveUser from '../../../../utils/handleRemoveUser';
import { validateField } from '../../../../utils/validateField';
import Modal from '../../../Shared/Modal/Modal';
import type User from '../../../../types/User';
import { useTranslate } from '../../../../i18n/useTranslate';
import styles from './../../../User/MyProfile/MyProfile.module.css';

// Form data type used for editing a user, including password and confirmPassword
export type FormData = Omit<User, 'id' | 'createdAt' | 'isAdmin' | 'role'> & {
  password: string;
  confirmPassword: string;
};

// Validation error type per field or general error
type FieldErrors = Partial<Record<keyof FormData | 'general', string>>;

// Modal state type
type ShowModalState = {
  isVisible: boolean;
  message: string;
};

// Loader to fetch user data by ID (admin-only)
export const editUserLoader = async ({ params }: LoaderFunctionArgs) => {
  const token = Cookies.get('token');
  if (!token) return redirect('/login');

  try {
    const { data } = await axios.get(`/users/getUserById/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      ...data,
      id: data._id,
    };
  } catch (error) {
    return redirect('/admin/all-users');
  }
};

// Action to handle form submission for user update
export const editUserAction = async ({ request, params }: ActionFunctionArgs) => {
  const token = Cookies.get('token');
  if (!token) return redirect('/login');

  const formData = await request.formData();

  const lang = (formData.get('lang') as 'en' | 'ro') || 'en';

  const rawData = {
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    email: formData.get('email') as string,
    birthDate: formData.get('birthDate') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const errors: FieldErrors = {};

  // Validate each field
  errors.firstName = await validateField('firstName', rawData.firstName, { lang });
  errors.lastName = await validateField('lastName', rawData.lastName, { lang });
  errors.email = await validateField('email', rawData.email, { checkEmail: true, lang });
  errors.birthDate = await validateField('birthDate', rawData.birthDate, { lang });

  // Prepare payload for update
  const payload: Record<string, string> = {
    firstName: rawData.firstName,
    lastName: rawData.lastName,
    email: rawData.email,
    birthDate: rawData.birthDate,
  };

  const isPasswordChanged = rawData.password.trim() !== '';

  // If password is changed, validate and include in payload
  if (isPasswordChanged) {
    errors.password = await validateField('password', rawData.password, { lang });
    errors.confirmPassword = await validateField('confirmPassword', rawData.confirmPassword, { password: rawData.password, lang });
    payload.newPassword = rawData.password;
  }

  // Remove empty error fields
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof FieldErrors]) delete errors[key as keyof FieldErrors];
  });

  // If there are validation errors, return them to the component
  if (Object.keys(errors).length > 0) return { errors };

  try {
    await axios.patch(`/users/editProfile/${params.id}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true };
  } catch (error: any) {
    return {
      errors: {
        general: error?.response?.data?.message || 'Failed to update user.',
      },
    };
  }
};

const EditUser: React.FC = () => {
  const t = useTranslate();
  const userData = useLoaderData() as User;
  const actionData = useActionData() as { errors?: FieldErrors; success?: boolean } | undefined;
  const navigate = useNavigate();

  const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';

  // Form state
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    birthDate: '',
    password: '',
    confirmPassword: '',
  });

  // Form state: field validation errors, email availability check, delete modal visibility, and delete operation status
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showModal, setShowModal] = useState<ShowModalState>({ isVisible: false, message: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Load initial user data into form
  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        birthDate: userData.birthDate?.split('T')[0] || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [userData]);

  // Handle response from form action
  useEffect(() => {
    if (actionData?.success) {
      alert(t('profileUpdateSuccess'));
      navigate('/admin/all-users');
    }
    if (actionData?.errors?.general) {
      alert(actionData.errors.general);
    }
  }, [actionData]);

  // Validate individual field
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

  // On field blur: validate input
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

  // Determine if form is valid and ready to submit
  const isFormValid = () => {
    const hasErrors = Object.values(fieldErrors).some((error) => error);
    const isPasswordChanged = formData.password.trim() !== '' || formData.confirmPassword.trim() !== '';

    const hasChanges = formData.firstName !== userData.firstName || formData.lastName !== userData.lastName || formData.email !== userData.email || formData.birthDate !== (userData.birthDate?.split('T')[0] || '') || isPasswordChanged;

    // Ensure both password fields are filled in if password is being changed
    const passwordFieldsValid = !isPasswordChanged || (formData.password.trim() !== '' && formData.confirmPassword.trim() !== '');

    return !hasErrors && hasChanges && passwordFieldsValid && !isCheckingEmail;
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    setIsDeleting(true);
    try {
      await handleRemoveUser(userData.id);
      alert(t('userDeletedSuccess'));
      navigate('/admin/all-users');
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(t('userDeleteFailed'));
      setIsDeleting(false);
    }
  };

  // Cancel deletion modal and reset target state
  const handleCancelDelete = () => {
    setShowModal({ isVisible: false, message: '' });
  };

  return (
    <div className={styles.profile}>
      <h2 className={styles.profileTitle}>{t('editUser')}</h2>

      {/* Static display of user info */}
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

        {/* Submit button */}
        <button type="submit" className={styles.updateButton} disabled={!isFormValid()}>
          {t('update')}
        </button>
      </Form>

      {/* Delete button */}
      <button className={styles.deleteButton} onClick={() => setShowModal({ isVisible: true, message: t('confirmDeleteUser') })}>
        {t('deleteUser')}
      </button>

      {/* Back button */}
      <button className={styles.backButton} onClick={() => navigate('/admin/all-users')}>
        {t('backToAllUsers')}
      </button>

      {/* Modal Confirmation */}
      {showModal.isVisible && <Modal message={showModal.message} onYes={handleDeleteUser} onNo={handleCancelDelete} yesDisabled={isDeleting} yesText={isDeleting ? t('deleting') : t('yes')} />}
    </div>
  );
};

export default EditUser;
