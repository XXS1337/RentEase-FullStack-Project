import axios from 'axios';
import { translations } from '../i18n/translations';

// Create a custom Axios instance with predefined configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // The base URL for all API requests, coming from environment variables
  headers: {
    'Content-Type': 'application/json', // Ensure all requests send data in JSON format
  },
  withCredentials: true, // Send cookies with every request (needed for authentication/session)
});

// Helper function to check if the session expiration alert was already shown in this browser tab
const hasSessionExpiredAlertBeenShown = () => sessionStorage.getItem('sessionExpired') === '1';

// Helper to mark that the alert has been shown
const markSessionExpiredAlertAsShown = () => sessionStorage.setItem('sessionExpired', '1');

// Set up a response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response, // Simply return the response if it's successful
  (error) => {
    // Try to extract the error message from the response (if any)
    const message = error?.response?.data?.message;

    // Translation helper using saved language from localStorage (defaults to English)
    const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';
    const t = (key: string) => translations[lang][key] || key;

    // Define a list of known auth-related error conditions
    const isAuthExpired = error?.response?.status === 401 && (message === 'Token expired!' || message === 'Invalid token!' || message === 'User not found' || message === 'Token is not valid' || message === 'Session expired. Please login again');

    // If the error indicates the session is no longer valid and the alert was not yet shown in this tab
    if (isAuthExpired && !hasSessionExpiredAlertBeenShown()) {
      markSessionExpiredAlertAsShown(); // Mark the alert as shown to prevent duplicate alerts in this tab

      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; // Remove the authentication token cookie

      const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';
      const t = (key: string) => translations[lang][key] || key;
      alert(t('sessionExpired')); // Inform the user their session expired. Show the alert only once per session
      window.location.href = '/login'; // Redirect the user to the login page
    }

    // No response from server (e.g. offline or server down)
    if (!error.response) {
      alert(t('noConnection') || 'You appear to be offline. Please check your internet connection.');
    }

    // Re-throw the error so it can be handled in the component if needed
    return Promise.reject(error);
  }
);

// Export the configured Axios instance for reuse in the project
export default api;
