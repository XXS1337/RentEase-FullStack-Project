import calculateAge from './calculateAge';
import { normalizeDateUTC, getOneYearFromTodayUTC } from './dateUtils';
import axios from '../api/axiosConfig';
import { translations } from '../i18n/translations';

// Context type for additional validation context
type ValidationContext = {
  checkEmail?: boolean;
  originalEmail?: string;
  allowEmptyPassword?: boolean;
  password?: string;
  originalDate?: Date;
  lang?: 'en' | 'ro';
};

export const validateField = async (name: string, value: string | number | Date | undefined, context: ValidationContext = {}): Promise<string> => {
  let error = '';

  const lang = context.lang ?? 'en';
  const t = (key: string, vars?: Record<string, string | number>) => {
    let str = translations[lang][key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
      });
    }
    return str;
  };

  switch (name) {
    case 'firstName':
    case 'lastName':
      if (!value || typeof value !== 'string' || value.trim().length < 2) {
        error = t(name === 'firstName' ? 'firstNameTooShort' : 'lastNameTooShort');
      } else if (value.length > 50) {
        error = t(name === 'firstName' ? 'firstNameTooLong' : 'lastNameTooLong');
      } else if (!/^[a-zA-ZăâîșțĂÂÎȘȚ -]+$/.test(value)) {
        error = t(name === 'firstName' ? 'firstNameInvalidChars' : 'lastNameInvalidChars');
      }
      break;
    case 'email':
      if (!value || (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
        error = t('emailInvalidFormat');
      } else if (context.checkEmail && value !== context.originalEmail) {
        try {
          const res = await axios.post('/users/checkEmail', { email: value });
          if (res.data.exists) {
            error = t('emailTaken');
          }
        } catch (err) {
          console.error('Error checking email availability:', err);
          error = t('emailCheckFailed');
        }
      }
      break;
    case 'password':
      if (!value && context.allowEmptyPassword) {
        error = '';
      } else if (!value || (typeof value === 'string' && value.length < 6)) {
        error = t('passwordTooShort');
      } else if (typeof value === 'string' && (!/[a-zA-Z]/.test(value) || !/\d/.test(value) || !/[^\w\s]/.test(value))) {
        error = t('passwordMissingChars');
      }
      break;
    case 'confirmPassword':
      if (value !== context.password) {
        error = t('passwordsDoNotMatch');
      }
      break;
    case 'birthDate':
      if (!value || isNaN(new Date(value as Date).getTime())) {
        error = t('birthDateRequired');
      } else {
        const age = calculateAge(value as Date);
        if (age < 18 || age > 120) {
          error = t('ageInvalidRange');
        }
      }
      break;
    case 'adTitle':
      if (!value || (typeof value === 'string' && (value.length < 5 || value.length > 60))) {
        error = t('adTitleLength');
      }
      break;
    case 'city':
      if (!value || (typeof value === 'string' && value.length < 2)) {
        error = t('cityTooShort');
      }
      break;
    case 'streetName':
      if (!value || (typeof value === 'string' && value.length < 2)) {
        error = t('streetNameTooShort');
      }
      break;
    case 'streetNumber':
      if (!value || isNaN(Number(value)) || Number(value) < 1) {
        error = t('streetNumberInvalid');
      }
      break;
    case 'areaSize':
      if (!value || isNaN(Number(value)) || Number(value) <= 0) {
        error = t('areaSizeInvalid');
      }
      break;
    case 'yearBuilt': {
      const currentYear = new Date().getFullYear();
      if (!value || isNaN(Number(value)) || Number(value) < 1900 || Number(value) > currentYear) {
        error = t('yearBuiltInvalid');
      }
      break;
    }
    case 'rentPrice':
      if (!value || isNaN(Number(value)) || Number(value) <= 0) {
        error = t('rentPriceInvalid');
      }
      break;
    case 'dateAvailable':
    case 'updatedDateAvailable': {
      if (!value) {
        error = t('dateAvailableRequired');
      } else {
        const today = new Date();
        const todayUTC = normalizeDateUTC(today);
        const selectedUTC = typeof value === 'number' ? value : normalizeDateUTC(value as Date);
        const originalUTC = context.originalDate ? normalizeDateUTC(context.originalDate) : todayUTC;
        const oneYearFromTodayUTC = getOneYearFromTodayUTC(today);

        const isOutOfRange =
          name === 'dateAvailable' ? selectedUTC < todayUTC || selectedUTC > oneYearFromTodayUTC : originalUTC > todayUTC ? selectedUTC < todayUTC || selectedUTC > oneYearFromTodayUTC : selectedUTC < originalUTC || selectedUTC > oneYearFromTodayUTC;

        if (isOutOfRange) {
          const startLabel = originalUTC >= todayUTC ? t('today') : t('originalDate');
          const startDate = new Date(originalUTC > todayUTC ? todayUTC : originalUTC).toLocaleDateString('en-US');
          const endDate = new Date(oneYearFromTodayUTC).toLocaleDateString('en-US');

          error = t('dateOutOfRange', {
            startLabel,
            startDate,
            endDate,
          });
        }
      }
      break;
    }
    case 'image':
      if (!value) {
        error = t('imageRequired');
      }
      break;
    case 'messageContent':
      if (!value || (typeof value === 'string' && !value.trim())) {
        error = t('messageEmpty');
      } else if (typeof value === 'string' && value.length > 1000) {
        error = t('messageTooLong');
      }
      break;
    default:
      break;
  }

  return error;
};
