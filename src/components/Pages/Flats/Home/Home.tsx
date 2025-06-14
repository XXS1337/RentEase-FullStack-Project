import React, { useCallback, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { IoMdHeartEmpty, IoMdHeart } from 'react-icons/io';
import { FaSearchPlus } from 'react-icons/fa';
import axios from './../../../../api/axiosConfig';
import Spinner from '../../../Shared/Spinner/Spinner';
import styles from './Home.module.css';
import ChatBot from './../../../ChatBot/ChatBot';
import { useAuth } from '../../../../context/AuthContext';
import ImageHoverPreview from '../../../Shared/ImageHoverPreview/ImageHoverPreview';
import { useImageHover } from '../../../../utils/useImageHover';
import { useTranslate } from '../../../../i18n/useTranslate';

// Loader function to fetch flats and user's favorites (if logged in)
export const homeLoader = async () => {
  const token = Cookies.get('token');
  let userData = null;

  try {
    if (token) {
      const res = await axios.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = res.data;
    }
  } catch (err) {
    console.warn('Invalid token or not logged in, proceeding without user data');
  }

  // Fetch all flats
  const { data: flatsData } = await axios.get('/flats');

  // Extract user's favorite flat IDs
  const favoriteFlatIds = userData?.currentUser?.favoriteFlats || [];

  // Map and enrich each flat with id, image, and favorite flag
  const flats = flatsData.data.map((flat: any) => ({
    ...flat,
    id: flat._id,
    favorite: favoriteFlatIds.includes(flat._id),
    image: flat.image?.url,
  }));

  return {
    flats,
    userId: userData?.currentUser?._id || null,
  };
};

const Home: React.FC = () => {
  const t = useTranslate();
  const { flats: initialFlats, userId } = useLoaderData() as { flats: any[]; userId: string };
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // State: all flats, filters, sorting, validation and loading
  const [flats, setFlats] = useState<any[]>(initialFlats);
  const [filters, setFilters] = useState({
    city: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
  });
  const [pendingFilters, setPendingFilters] = useState({
    city: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
  });
  const [sortOption, setSortOption] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ price?: string; area?: string }>({});
  const [loading, setLoading] = useState(true);
  const { previewImage, hoverPosition, onMouseEnter, onMouseLeave, onMouseMove, previewSize } = useImageHover();

  // Helper to map sort option to query format
  const mapSortToQuery = (option: string) => {
    switch (option) {
      case 'cityAsc':
        return 'city';
      case 'cityDesc':
        return '-city';
      case 'priceAsc':
        return 'rentPrice';
      case 'priceDesc':
        return '-rentPrice';
      case 'areaAsc':
        return 'areaSize';
      case 'areaDesc':
        return '-areaSize';
      default:
        return '';
    }
  };

  // Fetch flats from backend using filters and sort, and enrich with favorites
  const fetchFlatsFromServer = useCallback(async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params: any = {};
      if (filters.city) params.city = filters.city;
      if (filters.minPrice || filters.maxPrice) params.rentPrice = `${filters.minPrice || 0}-${filters.maxPrice || 1000000}`;
      if (filters.minArea || filters.maxArea) params.areaSize = `${filters.minArea || 0}-${filters.maxArea || 100000}`;
      if (sortOption) params.sort = mapSortToQuery(sortOption);

      const { data } = await axios.get('/flats', { params });

      // Get favorites again if token is valid
      const token = Cookies.get('token');
      let favoriteFlatIds: string[] = [];
      if (token) {
        try {
          const res = await axios.get('/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          favoriteFlatIds = res.data?.currentUser?.favoriteFlats || [];
        } catch (err) {
          console.warn('Could not fetch favorites');
        }
      }

      // Enrich flats with favorite info
      const enriched = data.data.map((flat: any) => ({
        ...flat,
        id: flat._id,
        favorite: favoriteFlatIds.includes(flat._id),
        image: flat.image?.url,
      }));

      setFlats(enriched);
    } catch (err) {
      console.error('Failed to fetch flats:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, sortOption, userId]);

  // Validate filters (price and area range logic)
  useEffect(() => {
    const errors: typeof validationErrors = {};
    const minPrice = parseFloat(pendingFilters.minPrice);
    const maxPrice = parseFloat(pendingFilters.maxPrice);
    if (pendingFilters.minPrice && pendingFilters.maxPrice && minPrice > maxPrice) {
      errors.price = t('priceError');
    }
    const minArea = parseFloat(pendingFilters.minArea);
    const maxArea = parseFloat(pendingFilters.maxArea);
    if (pendingFilters.minArea && pendingFilters.maxArea && minArea > maxArea) {
      errors.area = t('areaError');
    }
    setValidationErrors(errors);
  }, [pendingFilters]);

  // Re-fetch flats on sort option change
  useEffect(() => {
    fetchFlatsFromServer();
  }, [sortOption, fetchFlatsFromServer]);

  // Handle favorite/unfavorite click
  const handleFavorite = async (flat: any) => {
    if (!userId) {
      navigate('/login');
      return;
    }
    try {
      if (flat.favorite) {
        await axios.delete(`/flats/${flat.id}/removeFromFavorites`, {
          headers: { Authorization: `Bearer ${Cookies.get('token')}` },
        });
      } else {
        await axios.post(
          `/flats/${flat.id}/addToFavorites`,
          {},
          {
            headers: { Authorization: `Bearer ${Cookies.get('token')}` },
          }
        );
      }
      // Update favorite state locally
      setFlats((prev) => prev.map((f) => (f.id === flat.id ? { ...f, favorite: !flat.favorite } : f)));
    } catch (err) {
      console.error('Favorite update failed', err);
    }
  };

  // Handle filter input change
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPendingFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Handle sort selection
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
  };

  // Apply pending filters
  const applyFilters = () => {
    setFilters(pendingFilters);
  };

  // Reset all filters and sorting
  const resetFilters = () => {
    const reset = { city: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '' };
    setPendingFilters(reset);
    setFilters(reset);
    setSortOption('');
  };

  // Apply or reset filters with Enter or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Only apply filters if there are no validation errors
        if (Object.keys(validationErrors).length === 0) {
          applyFilters();
        }
      } else if (e.key === 'Escape') {
        resetFilters();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyFilters, resetFilters, validationErrors]);

  return (
    <div className={styles.home}>
      <h2>{t('availableFlats')}</h2>

      {/* Filters Section */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="city">{t('city')}</label>
          <input type="text" id="city" name="city" value={pendingFilters.city} onChange={handleFilterChange} placeholder={t('enterCity')} />
        </div>
        <div className={styles.filterGroup}>
          <label>{t('priceRange')}</label>
          <input type="number" name="minPrice" value={pendingFilters.minPrice} onChange={handleFilterChange} placeholder={t('minPrice')} />
          <input type="number" name="maxPrice" value={pendingFilters.maxPrice} onChange={handleFilterChange} placeholder={t('maxPrice')} />
        </div>
        <div className={styles.filterGroup}>
          <label>{t('areaSize')} (m²):</label>
          <input type="number" name="minArea" value={pendingFilters.minArea} onChange={handleFilterChange} placeholder={t('min')} />
          <input type="number" name="maxArea" value={pendingFilters.maxArea} onChange={handleFilterChange} placeholder={t('max')} />
        </div>
        <button onClick={applyFilters} className={styles.applyButton} disabled={Object.keys(validationErrors).length > 0}>
          {t('applyFilters')}
        </button>
        <button onClick={resetFilters} className={styles.resetButton}>
          {t('resetFilters')}
        </button>
      </div>

      {/* Display filter errors if any */}
      <div className={styles.filterErrors}>
        {validationErrors.price && <p className={styles.error}>{validationErrors.price}</p>}
        {validationErrors.area && <p className={styles.error}>{validationErrors.area}</p>}
      </div>

      {/* Sorting Section */}
      <div className={styles.sort}>
        <div className={styles.sortContainer}>
          <label htmlFor="sortOptions">{t('sortBy')}</label>
          <select id="sortOptions" value={sortOption} onChange={handleSortChange}>
            <option value="">{t('none')}</option>
            <option value="cityAsc">{t('cityAZ')}</option>
            <option value="cityDesc">{t('cityZA')}</option>
            <option value="priceAsc">{t('priceAsc')}</option>
            <option value="priceDesc">{t('priceDesc')}</option>
            <option value="areaAsc">{t('areaAsc')}</option>
            <option value="areaDesc">{t('areaDesc')}</option>
          </select>
        </div>
      </div>

      {/* Flat Listing or Spinner */}
      {loading ? (
        <Spinner />
      ) : initialFlats.length === 0 ? (
        // Case 1: No flats exist in DB
        <p className={styles.noResults}>{t('noFlats')}</p>
      ) : flats.length === 0 ? (
        // Case 2: Flats exist, but current filters return nothing
        <p className={styles.noResults}>{t('noFlatsMatch')}</p>
      ) : (
        // Case 3: Show the filtered flats
        <div className={styles.gridContainer}>
          {flats.map((flat) => (
            <div className={styles.gridItem} key={flat.id}>
              <div className={styles.flatImage} onClick={() => navigate(`/flats/view/${flat.id}`)} style={{ cursor: 'pointer' }}>
                <img src={flat.image} alt={flat.adTitle} />
                {/* Zoom icon shown on hover */}
                <FaSearchPlus className={styles.zoomIcon} title={t('previewImage')} onMouseEnter={(e) => onMouseEnter(e, flat.image)} onMouseLeave={onMouseLeave} onMouseMove={onMouseMove} onClick={(e) => e.stopPropagation()} />
              </div>
              <div className={styles.flatDetails}>
                <h3>{flat.adTitle}</h3>
                <p>
                  <strong>{t('city')}</strong> {flat.city}
                </p>
                <p>
                  <strong>{t('streetName')}</strong> {flat.streetName}
                </p>
                <p>
                  <strong>{t('streetNumber')}</strong> {flat.streetNumber}
                </p>
                <p>
                  <strong>{t('areaSize')}:</strong> {flat.areaSize} m²
                </p>
                <p>
                  <strong>{t('hasAC')}</strong> {flat.hasAC ? t('yes') : t('no')}
                </p>
                <p>
                  <strong>{t('yearBuilt')}</strong> {flat.yearBuilt}
                </p>
                <p>
                  <strong>{t('rentPrice')}</strong> {flat.rentPrice} {t('euroPerMonth')}
                </p>
                <p>
                  <strong>{t('dateAvailable')}</strong> {new Date(flat.dateAvailable).toLocaleDateString('en-US')}
                </p>

                {flat.favorite ? (
                  <IoMdHeart
                    className={styles.filledHeart}
                    title={t('removeFavorite')}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFavorite(flat);
                    }}
                  />
                ) : (
                  <IoMdHeartEmpty
                    className={styles.emptyHeart}
                    title={t('addFavorite')}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFavorite(flat);
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal preview */}
      <ImageHoverPreview image={previewImage} position={hoverPosition} size={previewSize} />

      {!loading && isAuthenticated && <ChatBot />}
    </div>
  );
};

export default Home;
