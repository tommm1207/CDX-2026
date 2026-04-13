import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportImagePreviewModalProps {
  imageDataUrl: string | null;
  fileName?: string;
  onClose: () => void;
  onSave?: () => void;
}

export const ReportImagePreviewModal = ({
  imageDataUrl,
  fileName = 'report.png',
  onClose,
  onSave,
}: ReportImagePreviewModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [prevUrl, setPrevUrl] = useState(imageDataUrl);

  if (imageDataUrl !== prevUrl) {
    setPrevUrl(imageDataUrl);
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }

  // Pinch-to-zoom state
  const lastDist = useRef<number | null>(null);
  const lastScale = useRef(1);
  // Pan state
  const isPanning = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastPanX = useRef(0);
  const lastPanY = useRef(0);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 5;

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.isPrimary) {
      isPanning.current = true;
      setIsDragging(true);
      lastPanX.current = e.clientX;
      lastPanY.current = e.clientY;
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning.current && e.isPrimary) {
      const dx = e.clientX - lastPanX.current;
      const dy = e.clientY - lastPanY.current;
      lastPanX.current = e.clientX;
      lastPanY.current = e.clientY;
      setTranslateX((prev) => prev + dx);
      setTranslateY((prev) => prev + dy);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
    setIsDragging(false);
  }, []);

  // Touch pinch zoom
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastDist.current = Math.hypot(dx, dy);
        lastScale.current = scale;
        isPanning.current = false;
      }
    },
    [scale],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / lastDist.current;
      setScale(clampScale(lastScale.current * ratio));
    } else if (e.touches.length === 1 && isPanning.current) {
      const dx = e.touches[0].clientX - lastPanX.current;
      const dy = e.touches[0].clientY - lastPanY.current;
      lastPanX.current = e.touches[0].clientX;
      lastPanY.current = e.touches[0].clientY;
      setTranslateX((prev) => prev + dx);
      setTranslateY((prev) => prev + dy);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = null;
    isPanning.current = false;
    setIsDragging(false);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => clampScale(prev * delta));
  }, []);

  const handleReset = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
      return;
    }
    if (!imageDataUrl) return;
    const link = document.createElement('a');
    link.download = fileName;
    link.href = imageDataUrl;
    link.click();
    onClose();
  };

  return (
    <AnimatePresence>
      {imageDataUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex flex-col bg-black/90 backdrop-blur-sm"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/60 flex-shrink-0 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-xs font-bold uppercase tracking-widest">
                Xem trước ảnh
              </span>
              <span className="bg-white/10 text-white text-[11px] font-black px-3 py-1 rounded-full">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleReset}
                className="text-white/40 hover:text-white/80 text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                Fit
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-primary text-white font-black text-[11px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-primary/30"
              >
                <Download size={14} />
                Lưu ảnh
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Zoom hint */}
          <div className="text-center py-1.5 flex-shrink-0">
            <span className="text-white/30 text-[10px] font-medium">
              Vuốt 2 ngón để zoom • Kéo để di chuyển • Lăn chuột để zoom
            </span>
          </div>

          {/* Preview area */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden relative select-none"
            style={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <div
              className="absolute inset-0 flex items-start justify-center pt-4"
              style={{ pointerEvents: 'none' }}
            >
              <img
                src={imageDataUrl}
                alt="Preview"
                draggable={false}
                style={{
                  transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                  transformOrigin: 'top center',
                  maxWidth: '100%',
                  transition: 'none',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-center gap-3 px-4 py-3 bg-black/60 flex-shrink-0">
            <button
              onClick={() => setScale((s) => clampScale(s * 1.2))}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center transition-all active:scale-90"
            >
              +
            </button>
            <div className="w-32 h-1 rounded-full bg-white/10 relative">
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all"
                style={{ width: `${((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}%` }}
              />
            </div>
            <button
              onClick={() => setScale((s) => clampScale(s * 0.8))}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center transition-all active:scale-90"
            >
              −
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
