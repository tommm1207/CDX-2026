import { useState, useRef, ChangeEvent } from 'react';
import { Camera, Image as ImageIcon, X, Loader2, Plus } from 'lucide-react';
import { compressImage, uploadToImgBB } from '@/utils/imageUpload';
import { Button } from '../ui/Button';

interface ImageCaptureProps {
  onUpload: (urls: string[]) => void;
  existingImages?: string[];
  maxImages?: number;
  label?: string;
}

export const ImageCapture = ({
  onUpload,
  existingImages: propImages = [],
  maxImages = 10,
  label = 'Ảnh minh chứng / Hiện trường',
}: ImageCaptureProps) => {
  const existingImages = propImages || [];
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [...existingImages];

    try {
      for (let i = 0; i < files.length; i++) {
        if (newUrls.length >= maxImages) break;

        const file = files[i];
        const compressedBlob = await compressImage(file);
        const url = await uploadToImgBB(compressedBlob);
        newUrls.push(url);
      }
      onUpload(newUrls);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      // Reset inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const updated = existingImages.filter((_, i) => i !== index);
    onUpload(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
          {label} ({existingImages.length}/{maxImages})
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(existingImages || []).map((url, idx) => (
          <div
            key={idx}
            className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 group"
          >
            <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg transition-all shadow-lg active:scale-95 z-10"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {existingImages.length < maxImages && !uploading && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-full aspect-square md:aspect-auto rounded-2xl border-dashed border-2 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus size={24} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">Chọn ảnh</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="md:hidden rounded-xl border-dashed text-primary border-primary/30 flex items-center justify-center gap-2 py-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera size={16} />
              <span className="text-[9px] font-bold uppercase">Chụp ảnh</span>
            </Button>
          </div>
        )}

        {uploading && (
          <div className="aspect-square rounded-2xl border-dashed border-2 border-primary/30 flex flex-col items-center justify-center bg-primary/5 animate-pulse">
            <Loader2 size={24} className="text-primary animate-spin mb-2" />
            <span className="text-[9px] font-bold text-primary uppercase">Đang tải...</span>
          </div>
        )}
      </div>

      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple={maxImages > 1}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
    </div>
  );
};
