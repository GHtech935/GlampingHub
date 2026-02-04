'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageLightbox } from '@/components/ui/image-lightbox';

interface ZoneImageGalleryProps {
  images: string[];
  zoneName: string;
}

export function ZoneImageGallery({ images, zoneName }: ZoneImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Use only first 3 images for grid display
  const displayImages = images.slice(0, 3);
  const totalImages = images.length;

  // Prepare ALL images for lightbox
  const lightboxImages = images.map((url, index) => ({
    src: url,
    alt: `${zoneName} - Image ${index + 1}`,
  }));

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (displayImages.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {displayImages.map((imageUrl, index) => (
          <div
            key={index}
            className="relative aspect-[4/3] rounded-lg overflow-hidden group cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            <Image
              src={imageUrl}
              alt={`${zoneName} - Image ${index + 1}`}
              fill
              className="object-cover group-hover:opacity-90 transition-opacity"
              sizes="(max-width: 768px) 33vw, 300px"
            />
            {/* Show image count badge on first image */}
            {index === 0 && totalImages > 0 && (
              <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                {totalImages}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}
