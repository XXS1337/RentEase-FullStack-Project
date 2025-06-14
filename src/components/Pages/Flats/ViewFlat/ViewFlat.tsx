import React, { useState } from 'react';
import { useLoaderData, Outlet, useNavigate, useLocation, redirect } from 'react-router-dom';
import Cookies from 'js-cookie';
import axios from './../../../../api/axiosConfig';
import { BsFillEnvelopeFill, BsFillEnvelopeSlashFill } from 'react-icons/bs';
import { FaHome, FaEdit } from 'react-icons/fa';
import Spinner from '../../../Shared/Spinner/Spinner';
import type { LoaderFunctionArgs } from 'react-router-dom';
import { useTranslate } from '../../../../i18n/useTranslate';
import styles from './ViewFlat.module.css';

// Loader function to fetch flat details based on flatID
export const viewFlatLoader = async ({ params }: LoaderFunctionArgs) => {
  const token = Cookies.get('token');
  if (!token) return redirect('/login');

  try {
    const { data } = await axios.get(`/flats/${params.flatID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const flat = data.data;
    return {
      id: flat._id,
      adTitle: flat.adTitle,
      city: flat.city,
      streetName: flat.streetName,
      streetNumber: flat.streetNumber,
      areaSize: flat.areaSize,
      hasAC: flat.hasAC,
      yearBuilt: flat.yearBuilt,
      rentPrice: flat.rentPrice,
      dateAvailable: flat.dateAvailable,
      image: flat.image?.url,
      ownerID: flat.owner._id,
      createdAt: flat.createdAt,
      updatedAt: flat.updatedAt,
    };
  } catch (error) {
    console.error('Error fetching flat data:', error);
    throw new Response('Failed to fetch flat data.', { status: 404 });
  }
};

const ViewFlat: React.FC = () => {
  const t = useTranslate();
  const flatData = useLoaderData() as any;
  const navigate = useNavigate();
  const location = useLocation();

  // State to show/hide messages and track logged-in user ID
  const [showMessages, setShowMessages] = useState(location.pathname.endsWith('/messages'));
  const [userId, setUserId] = useState<string | null>(null);

  const token = Cookies.get('token');

  // Fetch current user info on mount
  React.useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;
      try {
        const { data } = await axios.get('/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserId(data.currentUser.id || data.currentUser._id);
      } catch (err) {
        console.error('Failed to load user:', err);
      }
    };
    fetchUser();
  }, [token]);

  // Show spinner if flat data is not loaded
  if (!flatData) return <Spinner />;

  // Destructure flat fields
  const { id, adTitle, city, streetName, streetNumber, areaSize, hasAC, yearBuilt, rentPrice, dateAvailable, image, ownerID } = flatData;

  // Toggle message section
  const handleToggleMessages = () => {
    if (showMessages) {
      navigate(`/flats/view/${id}`);
      setShowMessages(false);
    } else {
      navigate('messages');
      setShowMessages(true);
    }
  };

  return (
    <>
      <div className={styles.viewFlat}>
        {/* Header section */}
        <div className={styles.header}>
          <h2>{adTitle}</h2>
        </div>

        {/* Flat details and actions */}
        <div className={styles.flatDetails}>
          <div className={styles.imageContainer}>
            <img src={image} alt={adTitle} className={styles.flatImage} />
          </div>
          <div className={styles.detailsContainer}>
            <p>
              <strong>{t('city')}</strong> {city}
            </p>
            <p>
              <strong>{t('streetName')}</strong> {streetName}
            </p>
            <p>
              <strong>{t('streetNumber')}</strong> {streetNumber}
            </p>
            <p>
              <strong>{t('areaSize')}:</strong> {areaSize} m²
            </p>
            <p>
              <strong>{t('hasAC')}</strong> {hasAC ? t('yes') : t('no')}
            </p>
            <p>
              <strong>{t('yearBuilt')}</strong> {yearBuilt}
            </p>
            <p>
              <strong>{t('rentPrice')}</strong> {rentPrice} €/month
            </p>
            <p>
              <strong>{t('dateAvailable')}</strong> {new Date(dateAvailable).toLocaleDateString('en-US')}
            </p>

            {/* Action icons */}
            <div className={styles.icons}>
              {/* Navigate to homepage */}
              <FaHome className={styles.backToHomepage} title={t('backToHomepage')} onClick={() => navigate('/')} />

              {/* Toggle messages */}
              {showMessages ? (
                <BsFillEnvelopeSlashFill className={`${styles.envelopeIcon} ${styles.active}`} title={t('hideMessages')} onClick={handleToggleMessages} />
              ) : (
                <BsFillEnvelopeFill className={styles.envelopeIcon} title={t('showMessages')} onClick={handleToggleMessages} />
              )}
              {/* Show edit button only if current user is flat owner */}
              {userId === ownerID && <FaEdit className={styles.editFlat} title={t('editFlat')} onClick={() => navigate(`/flats/edit/${id}`)} />}
            </div>
          </div>
        </div>
      </div>
      {/* Message section (loaded via outlet) */}
      <div className={showMessages ? styles.visible : styles.hidden}>
        <Outlet context={{ flatID: id, ownerID }} />
      </div>
    </>
  );
};

export default ViewFlat;
