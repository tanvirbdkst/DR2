import React, { useState, useRef } from 'react';
import { UploadCloud, Camera, X, CheckCircle2, AlertCircle, RefreshCw, User, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  subLabel?: string;
  required?: boolean;
  className?: string;
}

// Preset doctor avatars for quick selection if needed
const PRESET_AVATARS = [
  { label: 'Doctor 1 (Male)', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256' },
  { label: 'Doctor 2 (Female)', url: 'https://images.unsplash.com/photo-1594824813639-9524f285f543?auto=format&fit=crop&q=80&w=256' },
  { label: 'Doctor 3 (Male)', url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=256' },
  { label: 'Doctor 4 (Female)', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256' },
];

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label,
  subLabel,
  required = false,
  className = '',
}) => {
  const { t } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Compresses image on canvas before uploading for fast loading & consistent sizing
   */
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 500; // 500x500 max profile avatar
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(img.src);
            return;
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Return high quality WebP/JPEG data URL
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const uploadToServer = async (dataUrl: string, originalFileName?: string): Promise<string> => {
    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          filename: originalFileName || 'doctor_profile.jpg',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          return data.url;
        }
      }
    } catch (err) {
      console.warn('Could not save to /uploads, using direct data url:', err);
    }
    // Fallback to dataUrl directly
    return dataUrl;
  };

  const processFile = async (file: File) => {
    setError(null);

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError(t('Please upload a valid image file (JPG, PNG, or WebP).', 'অনুগ্রহ করে শুধুমাত্র JPG, PNG অথবা WebP ছবি আপলোড করুন।'));
      return;
    }

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      setError(t('File size must be under 8MB.', 'ছবির সাইজ সর্বোচ্চ ৮ মেগাবাইট হতে হবে।'));
      return;
    }

    setUploading(true);
    try {
      const compressedDataUrl = await compressImage(file);
      const serverUrl = await uploadToServer(compressedDataUrl, file.name);
      onChange(serverUrl);
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      setError(t('Failed to process image. Please try another file.', 'ছবি প্রসেস করতে ব্যর্থ হয়েছে। অন্য একটি ছবি চেষ্টা করুন।'));
    } finally {
      setUploading(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
          >
            {showPresets ? t('Hide Presets', 'নমুনা ছবি লুকান') : t('Choose Preset Avatar', 'নমুনা ছবি বেছে নিন')}
          </button>
        </div>
      )}

      {/* Preset selection drawer */}
      {showPresets && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <span className="text-[11px] font-medium text-slate-600 block">
            {t('Or select a professional medical avatar:', 'অথবা একটি নমুনা ডাক্তার অবতার বেছে নিন:')}
          </span>
          <div className="flex flex-wrap gap-3">
            {PRESET_AVATARS.map((avatar, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(avatar.url);
                  setShowPresets(false);
                }}
                className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition hover:scale-105 cursor-pointer ${
                  value === avatar.url ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200'
                }`}
              >
                <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                {value === avatar.url && (
                  <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload Zone (Drag-and-Drop + Click to select) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-center gap-4 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
            : value
            ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
            : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Avatar Preview or Default Icon */}
        <div className="relative shrink-0">
          {value ? (
            <div className="relative group">
              <img
                src={value}
                alt="Doctor Profile Preview"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md ring-1 ring-slate-200/80"
              />
              <button
                type="button"
                onClick={handleRemove}
                title={t('Remove photo', 'ছবি মুছে ফেলুন')}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex flex-col items-center justify-center group-hover:text-emerald-600 transition">
              {uploading ? (
                <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
              ) : (
                <User className="w-8 h-8" />
              )}
            </div>
          )}

          {/* Camera mini badge */}
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs border-2 border-white">
            <Camera className="w-3 h-3" />
          </div>
        </div>

        {/* Text and Actions */}
        <div className="text-center sm:text-left space-y-1 flex-1">
          {uploading ? (
            <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-700 font-semibold text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t('Processing & optimizing image...', 'ছবি প্রসেস ও অপ্টিমাইজ করা হচ্ছে...')}</span>
            </div>
          ) : value ? (
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('Profile Photo Selected', 'প্রোফাইল ছবি সফলভাবে যুক্ত হয়েছে')}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('Click or drag another image to replace', 'পরিবর্তন করতে ক্লিক করুন অথবা অন্য ছবি টেনে আনুন')}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-800">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <span>{t('Click to upload or drag & drop', 'ছবি আপলোড করতে ক্লিক করুন অথবা টেনে আনুন')}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {subLabel || t('JPG, PNG, WebP (Square ratio recommended, max 8MB)', 'JPG, PNG, WebP (বর্গাকার ছবি বাঞ্ছনীয়, সর্বোচ্চ ৮ এমবি)')}
              </p>
            </div>
          )}

          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              <ImageIcon className="w-3 h-3 text-slate-400" />
              {value ? t('Photo Ready', 'ছবি প্রস্তুত') : t('Supports Drag & Drop', 'ড্র্যাগ অ্যান্ড ড্রপ সমর্থিত')}
            </span>
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
              >
                {t('Remove', 'মুছে ফেলুন')}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
