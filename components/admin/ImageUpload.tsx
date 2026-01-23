"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Star } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

interface ImageData {
  id?: string; // from database after save
  url: string;
  public_id?: string;
  is_featured: boolean;
  display_order: number;
}

interface ImageUploadProps {
  images: ImageData[];
  onChange: (images: ImageData[]) => void;
  maxImages?: number;
  folder?: string; // Cloudinary folder (e.g., "campsites" or "pitches")
}

export function ImageUpload({ images, onChange, maxImages = 10, folder = "campsites" }: ImageUploadProps) {
  const t = useTranslations('admin.imageUpload');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFileWithProgress = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder); // Specify Cloudinary folder

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve({
            url: data.url,
            public_id: data.public_id,
            is_featured: false,
            display_order: 0,
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        reject(new Error("Network error"));
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.error(t('messages.maxImagesError', { max: maxImages }));
      return;
    }

    setUploading(true);
    const uploadedImages: ImageData[] = [];

    try {
      // Upload files sequentially to track progress
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileName(file.name);
        setUploadProgress(0);

        const imageData = await uploadFileWithProgress(file);
        imageData.is_featured = images.length === 0 && i === 0; // First image is featured
        imageData.display_order = images.length + i;
        uploadedImages.push(imageData);
      }

      onChange([...images, ...uploadedImages]);
      toast.success(t('messages.uploadSuccess', { count: files.length }));
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t('messages.uploadError'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentFileName("");
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSetFeatured = (index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_featured: i === index,
    }));
    onChange(updatedImages);
    toast.success(t('messages.setFeaturedSuccess'));
  };

  const handleDelete = async (index: number) => {
    const imageToDelete = images[index];

    try {
      // Delete from Cloudinary if has public_id
      if (imageToDelete.public_id) {
        await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_id: imageToDelete.public_id }),
        });
      }

      // Remove from state
      const updatedImages = images.filter((_, i) => i !== index);

      // If deleted image was featured, set first image as featured
      if (imageToDelete.is_featured && updatedImages.length > 0) {
        updatedImages[0].is_featured = true;
      }

      onChange(updatedImages);
      toast.success(t('messages.deleteSuccess'));
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t('messages.deleteError'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= maxImages}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? t('uploading') : t('selectImages')}
          </Button>
          <p className="text-sm text-gray-500">
            {t('imageCount', { current: images.length, max: maxImages })} | {t('maxSize')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium truncate max-w-md">
                {currentFileName}
              </span>
              <span className="text-blue-600 font-semibold">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group border rounded-lg overflow-hidden aspect-video"
            >
              {/* Image */}
              {image.url ? (
                <Image
                  src={image.url}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {/* Featured Badge */}
              {image.is_featured && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold">
                  <Star className="w-3 h-3 fill-white" />
                  {t('featuredBadge')}
                </div>
              )}

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.is_featured && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetFeatured(index)}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-12 text-center text-gray-500">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm">{t('emptyState')}</p>
          <p className="text-xs mt-1">{t('emptyStateHint')}</p>
        </div>
      )}

      {/* Helper Text */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          {t('tipsTitle')}
        </p>
        <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-disc">
          <li>{t('tip1')}</li>
          <li>{t('tip2')}</li>
          <li>{t('tip3')}</li>
        </ul>
      </div>
    </div>
  );
}
