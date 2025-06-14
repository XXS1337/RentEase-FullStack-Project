import React from 'react';
import styles from './ImageHoverPreview.module.css';

type Props = {
  image: string | null; // The URL of the image to preview
  position: { x: number; y: number } | null; // The screen coordinates where the preview should appear
  size: { width: number; height: number }; // The width and height of the preview box
};

const ImageHoverPreview: React.FC<Props> = ({ image, position, size }) => {
  // Do not render if there is no image or position
  if (!image || !position) return null;

  return (
    <div
      className={styles.hoverPreview}
      style={{
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
      }}
    >
      <img src={image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};

export default ImageHoverPreview;
