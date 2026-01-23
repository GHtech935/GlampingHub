"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Progress } from '@/components/ui/progress';
import { ImageData } from '@/types/about-content';

interface SingleImageUploadProps {
  label: string;
  value: ImageData | null;
  onChange: (image: ImageData | null) => void;
  folder?: string;
  required?: boolean;
}

/**
 * Single image upload component
 * Simplified version of ImageUpload for uploading one image at a time
 */
export function SingleImageUpload({
  label,
  value,
  onChange,
  folder = 'about',
  required = false
}: SingleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File ảnh không được vượt quá 10MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          onChange({
            url: result.url,
            public_id: result.public_id
          });
          toast.success('Tải ảnh thành công');
        } else {
          toast.error('Lỗi khi tải ảnh lên');
        }
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('error', () => {
        toast.error('Lỗi khi tải ảnh lên');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Lỗi khi tải ảnh lên');
      setUploading(false);
      setUploadProgress(0);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!value?.public_id) {
      onChange(null);
      return;
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: value.public_id }),
      });

      if (!response.ok) throw new Error('Failed to delete image');

      onChange(null);
      toast.success('Đã xóa ảnh');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Lỗi khi xóa ảnh');
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      {!value ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-32 border-2 border-dashed"
          >
            {uploading ? (
              <div className="space-y-2 w-full px-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-600">{uploadProgress}%</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6" />
                <span className="text-sm">Click để tải ảnh lên</span>
                <span className="text-xs text-gray-500">PNG, JPG (Max 10MB)</span>
              </div>
            )}
          </Button>
        </div>
      ) : (
        <div className="relative group">
          <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-gray-100">
            <Image
              src={value.url}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4 mr-1" />
            Xóa
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Upload className="w-4 h-4 mr-1" />
            Thay thế
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
