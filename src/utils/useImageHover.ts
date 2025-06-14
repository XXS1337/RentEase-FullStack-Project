import { useState, useEffect } from 'react';

// Custom hook to manage hover-based image preview positioning
export function useImageHover() {
  const [previewImage, setPreviewImage] = useState<string | null>(null); // Stores the preview image URL
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null); // Stores the position for image preview
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number }>({ width: 500, height: 500 }); // Stores the current preview box size

  // Called when mouse enters the zoom icon
  const onMouseEnter = (e: React.MouseEvent, image: string) => {
    // Prevent preview on small screens
    if (window.innerWidth < 850) return;

    // Set preview size based on current screen width
    if (window.innerWidth >= 850 && window.innerWidth < 1200) {
      setPreviewSize({ width: 350, height: 350 }); // Medium screens
    } else if (window.innerWidth >= 1200 && window.innerWidth < 1500) {
      setPreviewSize({ width: 400, height: 400 }); // Large screens
    } else {
      setPreviewSize({ width: 500, height: 500 }); // Extra large screens
    }

    // Store image and initial mouse position
    setPreviewImage(image);
    setHoverPosition({ x: e.clientX, y: e.clientY });
  };

  // Called when mouse leaves the zoom icon
  const onMouseLeave = () => {
    // Always reset image and position on leave
    setPreviewImage(null);
    setHoverPosition(null);
  };

  // Called while the mouse is moving over the zoom icon
  const onMouseMove = (e: React.MouseEvent) => {
    if (window.innerWidth < 850) return; // Skip preview on small/mobile screens

    const { width, height } = previewSize;
    const MARGIN = 12; // Distance between the preview box and screen edges
    const BUFFER = 5; // Extra buffer to prevent 5px overflow at exact edge

    // Start by positioning the preview to the bottom-right of the cursor
    let x = e.clientX + MARGIN;
    let y = e.clientY + MARGIN;

    // If the preview would overflow the right edge, try placing it to the left
    if (x + width > window.innerWidth) {
      x = e.clientX - width - MARGIN;

      // If it still overflows left, clamp to max visible X
      if (x < MARGIN) {
        x = Math.max(window.innerWidth - width - MARGIN - BUFFER, MARGIN);
      }
    }

    // If the preview would overflow the bottom edge, try placing it above
    if (y + height > window.innerHeight) {
      y = e.clientY - height - MARGIN;

      // If it still overflows above, clamp to max visible Y
      if (y < MARGIN) {
        y = Math.max(window.innerHeight - height - MARGIN - BUFFER, MARGIN);
      }
    }

    // Final safety clamp to avoid overflow by 1px on any edge
    x = Math.max(MARGIN, Math.min(x, window.innerWidth - width - MARGIN - BUFFER));
    y = Math.max(MARGIN, Math.min(y, window.innerHeight - height - MARGIN - BUFFER));

    // Apply the computed safe position
    setHoverPosition({ x, y });
  };

  // Listen for Escape key to close the preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
        setHoverPosition(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    previewImage,
    hoverPosition,
    previewSize,
    onMouseEnter,
    onMouseLeave,
    onMouseMove,
    setPreviewImage,
  };
}
