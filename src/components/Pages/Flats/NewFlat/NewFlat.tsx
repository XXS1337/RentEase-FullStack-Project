import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { useActionData, Form, useNavigate } from 'react-router-dom';
import { validateField } from '../../../../utils/validateField';
import type { FieldErrors, FormData } from '../../../../types/Flat';
import axios from '../../../../api/axiosConfig';
import Cookies from 'js-cookie';
import { useTranslate } from '../../../../i18n/useTranslate';
import { translations } from '../../../../i18n/translations';
import styles from './NewFlat.module.css';

// Action to validate and submit the new flat form
export const newFlatAction = async ({ request }: { request: Request }) => {
  const token = Cookies.get('token');
  if (!token) return { errors: { general: 'Not authenticated' } };

  const formData = await request.formData();

  const lang = (formData.get('lang') as 'en' | 'ro') || 'en';

  const t = (key: string, vars?: Record<string, string | number>) => {
    let str = translations[lang][key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
      });
    }
    return str;
  };

  // Extract form values
  const adTitle = formData.get('adTitle') as string;
  const city = formData.get('city') as string;
  const streetName = formData.get('streetName') as string;
  const streetNumber = formData.get('streetNumber') as string;
  const areaSize = formData.get('areaSize') as string;
  const hasAC = formData.get('hasAC') === 'on';
  const yearBuilt = formData.get('yearBuilt') as string;
  const rentPrice = formData.get('rentPrice') as string;
  const imageFile = formData.get('image') as File;

  const dateAvailableRaw = formData.get('dateAvailable') as string;
  const [y, m, d] = dateAvailableRaw.split('-').map(Number);
  const dateAvailable = Date.UTC(y, m - 1, d);

  // Validate fields
  const errors: FieldErrors = {};
  errors.adTitle = await validateField('adTitle', adTitle, { lang });
  errors.city = await validateField('city', city, { lang });
  errors.streetName = await validateField('streetName', streetName, { lang });
  errors.streetNumber = await validateField('streetNumber', streetNumber, { lang });
  errors.areaSize = await validateField('areaSize', areaSize, { lang });
  errors.yearBuilt = await validateField('yearBuilt', yearBuilt, { lang });
  errors.rentPrice = await validateField('rentPrice', rentPrice, { lang });
  errors.dateAvailable = await validateField('dateAvailable', dateAvailable, { lang });
  errors.image = imageFile?.name ? await validateField('image', imageFile.name, { lang }) : t('imageRequired');

  // Remove fields with no errors
  Object.keys(errors).forEach((key) => {
    if (!errors[key as keyof FieldErrors]) delete errors[key as keyof FieldErrors];
  });

  // If there are validation errors, return them to the component
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    // Prepare form data for multipart submission
    const uploadData = new FormData();
    uploadData.append('adTitle', adTitle);
    uploadData.append('city', city);
    uploadData.append('streetName', streetName);
    uploadData.append('streetNumber', streetNumber);
    uploadData.append('areaSize', areaSize);
    uploadData.append('hasAC', String(hasAC));
    uploadData.append('yearBuilt', yearBuilt);
    uploadData.append('rentPrice', rentPrice);
    uploadData.append('dateAvailable', dateAvailable.toString());
    uploadData.append('image', imageFile);

    // Send POST request
    await axios.post('/flats', uploadData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding flat:', error);
    return { errors: { general: t('addFlatFailed') } };
  }
};

const NewFlat: React.FC = () => {
  const t = useTranslate();
  const actionData = useActionData<{ success?: boolean; errors?: FieldErrors }>();
  const navigate = useNavigate();

  // Form state: track all fields, errors, and loading
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<FormData>({
    adTitle: '',
    city: '',
    streetName: '',
    streetNumber: '',
    areaSize: '',
    yearBuilt: '',
    rentPrice: '',
    dateAvailable: '',
    image: null,
    hasAC: false,
  });
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Handle action response after submit
  useEffect(() => {
    if (actionData?.success && !formSubmitted) {
      alert(t('flatAddedSuccess'));
      setFormSubmitted(true);
      setIsSubmitting(false);
      navigate('/myFlats');
    }
    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general);
      setIsSubmitting(false);
    }
  }, [actionData, formSubmitted, navigate]);

  // Validate individual field on blur
  const handleBlur = async (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, files } = target;
    const fieldValue = name === 'image' ? files?.[0]?.name || '' : value;

    const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';
    const error = await validateField(name, fieldValue, { lang });

    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Handle form field changes
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files?.[0] || null : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setGeneralError(null);
  };

  // Check if all fields are valid before submitting
  const isFormValid = () => {
    const isValid = Object.values(fieldErrors).every((error) => !error) && Object.values(formData).every((value) => value !== '' && value !== null);
    return isValid;
  };

  return (
    <div className={styles.newFlat}>
      <h2>{t('addNewFlatTitle')}</h2>

      <Form method="post" encType="multipart/form-data" className={styles.form} onSubmit={() => setIsSubmitting(true)}>
        <input type="hidden" name="lang" value={localStorage.getItem('language') || 'en'} />
        {/* Input fields for each flat */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="adTitle">{t('adTitle')}</label>
            <input id="adTitle" name="adTitle" type="text" value={formData.adTitle} minLength={5} maxLength={60} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.adTitle && <p className={styles.error}>{fieldErrors.adTitle}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="city">{t('city')}</label>
            <input id="city" name="city" type="text" value={formData.city} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.city && <p className={styles.error}>{fieldErrors.city}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetName">{t('streetName')}</label>
            <input id="streetName" name="streetName" type="text" value={formData.streetName} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetName && <p className={styles.error}>{fieldErrors.streetName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetNumber">{t('streetNumber')}</label>
            <input id="streetNumber" name="streetNumber" type="text" value={formData.streetNumber} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetNumber && <p className={styles.error}>{fieldErrors.streetNumber}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="areaSize">{t('areaSize')} (m²):</label>
            <input id="areaSize" name="areaSize" type="number" value={formData.areaSize} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.areaSize && <p className={styles.error}>{fieldErrors.areaSize}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="yearBuilt">{t('yearBuilt')}</label>
            <input id="yearBuilt" name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.yearBuilt && <p className={styles.error}>{fieldErrors.yearBuilt}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="rentPrice">{t('rentPrice')} (€):</label>
            <input id="rentPrice" name="rentPrice" type="number" value={formData.rentPrice} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.rentPrice && <p className={styles.error}>{fieldErrors.rentPrice}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="dateAvailable">{t('dateAvailable')}</label>
            <input id="dateAvailable" name="dateAvailable" type="date" value={formData.dateAvailable} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.dateAvailable && <p className={styles.error}>{fieldErrors.dateAvailable}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={`${styles.inputContainer} ${styles.inputContainerCheckbox}`}>
            <label htmlFor="hasAC">{t('hasAC')}</label>
            <input id="hasAC" name="hasAC" type="checkbox" checked={formData.hasAC || false} onChange={handleChange} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="image">{t('flatImage')}</label>
            <input id="image" name="image" type="file" accept="image/*" onChange={handleChange} onBlur={handleBlur} />
          </div>
          {formData.image && typeof formData.image === 'object' && (
            <div className={styles.imagePreview}>
              <p>{t('imagePreview')}</p>
              <img src={URL.createObjectURL(formData.image)} alt="Flat Preview" style={{ width: '200px' }} />
            </div>
          )}
          {fieldErrors.image && <p className={styles.error}>{fieldErrors.image}</p>}
        </div>

        {/* Global error message */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        {/* Submit button */}
        <button type="submit" className={styles.saveButton} disabled={isSubmitting || !isFormValid()}>
          {isSubmitting ? t('saving') : t('save')}
        </button>
      </Form>
    </div>
  );
};

export default NewFlat;
