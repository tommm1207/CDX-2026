import { Image as ImageIcon } from 'lucide-react';

interface SaveImageButtonProps {
  onClick: () => void;
  isCapturing: boolean;
  title?: string;
}

/**
 * Standardized "Save Image" button for CDX report headers.
 * Shows a spinner while capturing.
 */
export const SaveImageButton = ({
  onClick,
  isCapturing,
  title = 'Lưu ảnh báo cáo',
}: SaveImageButtonProps) => (
  <button
    onClick={onClick}
    disabled={isCapturing}
    title={title}
    className={`w-11 h-11 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-2xl text-primary hover:bg-gray-50 active:scale-90 transition-all ${isCapturing ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {isCapturing ? (
      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    ) : (
      <ImageIcon size={22} />
    )}
  </button>
);
