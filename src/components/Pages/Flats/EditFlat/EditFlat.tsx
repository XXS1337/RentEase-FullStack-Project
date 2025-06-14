import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { useActionData, Form, useNavigate, useLoaderData, redirect } from 'react-router-dom';
import { validateField } from '../../../../utils/validateField';
import type { Flat, FieldErrors } from '../../../../types/Flat';
import axios from '../../../../api/axiosConfig';
import Cookies from 'js-cookie';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router-dom';
import { useTranslate } from '../../../../i18n/useTranslate';
import styles from './EditFlat.module.css';

// Loader function to fetch the flat data and validate access rights
export const editFlatLoader = async ({ params }: LoaderFunctionArgs) => {
  const token = Cookies.get('token');
  if (!token) return redirect('/login');

  try {
    // 1. Fetch the flat by ID
    const { data: flatRes } = await axios.get(`/flats/${params.flatID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const flat = flatRes.data;

    // 2. Get the current user to verify ownership
    const { data: userRes } = await axios.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const currentUserId = userRes.currentUser._id;
    const ownerId = flat.owner?._id || flat.owner;

    // 3. Deny access if user is not the owner
    if (ownerId !== currentUserId) {
      throw new Response('Unauthorized: You cannot edit this flat.', { status: 403 });
    }

    // 4. Format date and return normalized data
    const formattedDate = new Date(flat.dateAvailable).toISOString().split('T')[0];

    return {
      ...flat,
      id: flat._id,
      image: flat.image?.url || '',
      streetNumber: flat.streetNumber || '',
      dateAvailable: formattedDate,
    };
  } catch (error) {
    console.error('Error in editFlatLoader:', error);
    throw new Response('Access denied or flat not found.', { status: 403 });
  }
};

// Action function to handle flat form submission and update
export const editFlatAction = async ({ request, params }: ActionFunctionArgs) => {
  const token = Cookies.get('token');
  if (!token) return redirect('/login');

  const formData = await request.formData();
  const flatID = params.flatID;

  try {
    // Convert dateAvailable from input into UTC timestamp
    const dateInput = formData.get('dateAvailable') as string;
    const [year, month, day] = dateInput.split('-').map(Number);
    const timestampUTC = Date.UTC(year, month - 1, day);

    // Prepare the flat data for update
    const updatedData = {
      adTitle: formData.get('adTitle') as string,
      city: formData.get('city') as string,
      streetName: formData.get('streetName') as string,
      streetNumber: formData.get('streetNumber') as string,
      areaSize: Number(formData.get('areaSize')),
      hasAC: formData.get('hasAC') === 'on',
      yearBuilt: Number(formData.get('yearBuilt')),
      rentPrice: Number(formData.get('rentPrice')),
      dateAvailable: timestampUTC,
    };

    // Check if a new image was uploaded
    const imageFile = formData.get('image') as File;
    const isNewImage = imageFile && imageFile.size > 0;

    if (isNewImage) {
      // Upload new image along with updated fields
      const combinedData = new FormData();
      Object.entries(updatedData).forEach(([key, value]) => {
        combinedData.append(key, value.toString());
      });
      combinedData.append('image', imageFile);

      await axios.patch(`/flats/${flatID}`, combinedData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      // Submit without image if unchanged
      await axios.patch(`/flats/${flatID}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating flat:', error);
    return {
      errors: {
        general: error.response?.data?.message || 'Failed to update flat. Please try again.',
        ...(error.response?.data?.errors || {}),
      },
    };
  }
};

const EditFlat: React.FC = () => {
  const t = useTranslate();
  const flatData = useLoaderData<Flat>();
  const actionData = useActionData<{ success?: boolean; errors?: FieldErrors }>();
  const navigate = useNavigate();

  // Form state: current values, original snapshot, validation errors, global error, and submission state
  const [formData, setFormData] = useState<Flat>(flatData);
  const [originalData, setOriginalData] = useState<Flat>(flatData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reload local state if loader returns new flat data
  useEffect(() => {
    if (flatData) {
      setFormData(flatData);
      setOriginalData(flatData);
    }
  }, [flatData]);

  // Handle success or general error after form submission
  useEffect(() => {
    if (actionData?.success) {
      alert(t('flatUpdatedSuccess'));
      setIsSubmitting(false);
      navigate('/myFlats');
    }
    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general);
    }
  }, [actionData, navigate]);

  // Validate field on blur
  const handleBlur = async (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, files } = target;
    const fieldValue = name === 'image' ? files?.[0]?.name || '' : value;

    const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';

    const error = await validateField(name === 'dateAvailable' ? 'updatedDateAvailable' : name, fieldValue, { lang, originalDate: new Date(originalData.dateAvailable) });
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Update local form state and reset field error on change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files?.[0] || null : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setGeneralError(null);
  };

  // Validate form before submission: check for errors and actual changes
  const isFormValid = () => {
    const hasErrors = Object.values(fieldErrors).some((error) => error);
    const hasChanges =
      originalData &&
      (formData.adTitle !== originalData.adTitle ||
        formData.city !== originalData.city ||
        formData.streetName !== originalData.streetName ||
        formData.streetNumber !== originalData.streetNumber ||
        Number(formData.areaSize) !== originalData.areaSize ||
        Number(formData.yearBuilt) !== originalData.yearBuilt ||
        Number(formData.rentPrice) !== originalData.rentPrice ||
        formData.dateAvailable !== originalData.dateAvailable ||
        formData.hasAC !== originalData.hasAC ||
        (formData.image && typeof formData.image === 'object'));

    return !hasErrors && hasChanges;
  };

  return (
    <div className={styles.editFlat}>
      <h2>{t('editFlatTitle')}</h2>
      <Form method="post" action="." className={styles.form} encType="multipart/form-data" onSubmit={() => setIsSubmitting(true)}>
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="adTitle">{t('adTitle')}</label>
            <input id="adTitle" name="adTitle" type="text" value={formData.adTitle || ''} minLength={5} maxLength={60} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.adTitle && <p className={styles.error}>{fieldErrors.adTitle}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="city">{t('city')}</label>
            <input id="city" name="city" type="text" value={formData.city || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.city && <p className={styles.error}>{fieldErrors.city}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetName">{t('streetName')}</label>
            <input id="streetName" name="streetName" type="text" value={formData.streetName || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetName && <p className={styles.error}>{fieldErrors.streetName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetNumber">{t('streetNumber')}</label>
            <input id="streetNumber" name="streetNumber" type="text" value={formData.streetNumber || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetNumber && <p className={styles.error}>{fieldErrors.streetNumber}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="areaSize">{t('areaSize')} (m²):</label>
            <input id="areaSize" name="areaSize" type="number" value={formData.areaSize || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.areaSize && <p className={styles.error}>{fieldErrors.areaSize}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="yearBuilt">{t('yearBuilt')}</label>
            <input id="yearBuilt" name="yearBuilt" type="number" value={formData.yearBuilt || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.yearBuilt && <p className={styles.error}>{fieldErrors.yearBuilt}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="rentPrice">{t('rentPrice')} (€):</label>
            <input id="rentPrice" name="rentPrice" type="number" value={formData.rentPrice || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.rentPrice && <p className={styles.error}>{fieldErrors.rentPrice}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="dateAvailable">{t('dateAvailable')}</label>
            <input id="dateAvailable" name="dateAvailable" type="date" value={formData.dateAvailable || ''} onChange={handleChange} onBlur={handleBlur} required />
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
            <input id="image" name="image" type="file" accept="image/*" onChange={handleChange} />
          </div>
          {formData.image && typeof formData.image === 'string' && (
            <div className={styles.imagePreview}>
              <p>{t('currentImage')}</p>
              <img src={formData.image} alt="Current Flat" style={{ width: '200px' }} />
            </div>
          )}
          {formData.image && typeof formData.image === 'object' && (
            <div className={styles.imagePreview}>
              <p>{t('newImagePreview')}</p>
              <img src={URL.createObjectURL(formData.image)} alt="New Flat" style={{ width: '200px' }} />
            </div>
          )}

          {fieldErrors.image && <p className={styles.error}>{fieldErrors.image}</p>}
        </div>

        {/* Display general error if present */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        {/* Submit button */}
        <button type="submit" className={styles.saveButton} disabled={isSubmitting || !isFormValid()}>
          {isSubmitting ? t('saving') : t('save')}
        </button>

        {/* Back button */}
        <button type="button" className={styles.backButton} onClick={() => navigate('/myFlats')}>
          {t('back')}
        </button>
      </Form>
    </div>
  );
};

export default EditFlat;
