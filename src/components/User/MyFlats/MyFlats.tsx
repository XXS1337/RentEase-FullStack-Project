import React, { useState } from 'react';
import { useLoaderData, useNavigate, redirect } from 'react-router-dom';
import Cookies from 'js-cookie';
import axios from './../../../api/axiosConfig';
import { FaRegTrashAlt, FaEdit } from 'react-icons/fa';
import { FaSearchPlus } from 'react-icons/fa';
import ImageHoverPreview from '../../Shared/ImageHoverPreview/ImageHoverPreview';
import { useImageHover } from '../../../utils/useImageHover';
import { useTranslate } from '../../../i18n/useTranslate';
import styles from './MyFlats.module.css';

// Loader to fetch the flats added by the currently logged-in user
export const myFlatsLoader = async () => {
  const token = Cookies.get('token');
  if (!token) return redirect('/login');

  try {
    // Request user's flats from backend
    const { data } = await axios.get('/flats/myFlats', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Format flat data (ensure we use flat.id and flat.image.url)
    const flats = data.data.map((flat: any) => ({
      ...flat,
      id: flat._id,
      image: flat.image?.url,
    }));

    return { flats };
  } catch (err) {
    console.error('Failed to load user flats:', err);
    return redirect('/login');
  }
};

const MyFlats: React.FC = () => {
  const t = useTranslate();
  const { flats: initialFlats } = useLoaderData() as { flats: any[] };
  const navigate = useNavigate();
  const { previewImage, hoverPosition, onMouseEnter, onMouseLeave, onMouseMove, previewSize } = useImageHover();

  // State to hold the user's flats
  const [myFlats, setMyFlats] = useState<any[]>(initialFlats);

  // Delete a flat and update the UI immediately
  const handleDeleteFlat = async (flatId: string) => {
    try {
      const token = Cookies.get('token');
      await axios.delete(`/flats/${flatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove the flat from local state
      setMyFlats((prevFlats) => prevFlats.filter((flat) => flat.id !== flatId));
    } catch (error) {
      console.error('Error deleting flat:', error);
    }
  };

  return (
    <div className={styles.myFlats}>
      <div className={styles.header}>
        <h2>{t('myFlatsTitle')}</h2>

        {/* New Flat button */}
        <button className={styles.newFlatButton} onClick={() => navigate('/flats/new')}>
          {t('insertNewFlat')}
        </button>
      </div>

      {/* Display message if no flats exist */}
      {myFlats.length === 0 ? (
        <p className={styles.noResults}>{t('noFlatsPublished')}</p>
      ) : (
        <div className={styles.gridContainer}>
          {myFlats.map((flat) => (
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

                {/* Delete button */}
                <FaRegTrashAlt className={styles.deleteFlat} onClick={() => handleDeleteFlat(flat.id)} title={t('deleteFlat')} />

                {/* Edit button */}
                <FaEdit className={styles.editFlat} onClick={() => navigate(`/flats/edit/${flat.id}`)} title={t('editFlat')} />
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal preview */}
      <ImageHoverPreview image={previewImage} position={hoverPosition} size={previewSize} />
    </div>
  );
};

export default MyFlats;
