"use client"

import Lightbox from "yet-another-react-lightbox"
import "yet-another-react-lightbox/styles.css"

interface ImageLightboxProps {
  images: Array<{ src: string; alt?: string }>
  open: boolean
  index: number
  onClose: () => void
  onIndexChange?: (index: number) => void
}

export function ImageLightbox({
  images,
  open,
  index,
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={images}
      on={{
        view: ({ index }) => onIndexChange?.(index),
      }}
      carousel={{
        finite: false,
      }}
      controller={{
        closeOnBackdropClick: true,
      }}
      styles={{
        container: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
      }}
    />
  )
}
