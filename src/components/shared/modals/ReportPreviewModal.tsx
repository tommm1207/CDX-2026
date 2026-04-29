import React from 'react';
import { X, Download, ImageIcon, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { useState } from 'react';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  isCapturing?: boolean;
  title?: string;
  children: React.ReactNode;
}

export const ReportPreviewModal = ({
  isOpen,
  onClose,
  onExport,
  isCapturing = false,
  title = 'Xem trước báo cáo',
  children,
}: ReportPreviewModalProps) => {
  const [zoom, setZoom] = useState(0.4);

  const [prevIsOpen, setPrevIsOpen] = useState(false);

  const getDefaultZoom = () => {
    if (window.innerWidth < 640) return 0.22;
    if (window.innerWidth < 768) return 0.4;
    return 0.5;
  };

  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setZoom(getDefaultZoom());
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 1.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.1));
  const handleReset = () => {
    if (window.innerWidth < 640) setZoom(0.22);
    else setZoom(0.5);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 no-print">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-6xl h-full max-h-[90vh] bg-gray-100 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800 tracking-tight">{title}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Bản xem trước độ nét cao (4K)
                  </p>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-white rounded-xl transition-all text-gray-500 hover:text-primary active:scale-95"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1 text-[10px] font-black font-mono text-gray-400 hover:text-primary uppercase tracking-tighter bg-white/50 rounded-lg"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-white rounded-xl transition-all text-gray-500 hover:text-primary active:scale-95"
                  title="Phóng to"
                >
                  <ZoomIn size={18} />
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Preview Content Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start bg-gray-200/50">
              <div
                className="bg-white shadow-xl origin-top transition-transform duration-200 ease-out"
                style={{ transform: `scale(${zoom})` }}
              >
                <div className="w-[1400px] pointer-events-none select-none">{children}</div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-6 bg-white border-t border-gray-100 flex items-center justify-between">
              <div className="hidden md:block">
                <p className="text-xs text-gray-500 font-medium">
                  <span className="font-bold text-primary">Lưu ý:</span> Ảnh sẽ được xuất với độ
                  phân giải 4K (siêu nét).
                </p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 md:flex-none h-12 px-6 rounded-2xl font-bold text-gray-600 border-gray-200"
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={onExport}
                  isLoading={isCapturing}
                  className="flex-1 md:flex-none h-12 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                  Xuất 4K PNG
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
