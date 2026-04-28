import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, CheckCircle, RefreshCw } from 'lucide-react';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export const ConfirmModal = ({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'danger',
  isLoading = false,
}: ConfirmModalProps) => {
  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-600',
          hover: 'hover:bg-red-700',
          text: 'text-red-600',
          light: 'bg-red-50',
          border: 'border-red-100',
          shadow: 'shadow-red-500/20',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500',
          hover: 'hover:bg-amber-600',
          text: 'text-amber-600',
          light: 'bg-amber-50',
          border: 'border-amber-100',
          shadow: 'shadow-amber-500/20',
        };
      case 'info':
        return {
          bg: 'bg-blue-600',
          hover: 'hover:bg-blue-700',
          text: 'text-blue-600',
          light: 'bg-blue-50',
          border: 'border-blue-100',
          shadow: 'shadow-blue-500/20',
        };
      case 'success':
        return {
          bg: 'bg-green-600',
          hover: 'hover:bg-green-700',
          text: 'text-green-600',
          light: 'bg-green-50',
          border: 'border-green-100',
          shadow: 'shadow-green-500/20',
        };
      default:
        return {
          bg: 'bg-red-600',
          hover: 'hover:bg-red-700',
          text: 'text-red-600',
          light: 'bg-red-50',
          border: 'border-red-100',
          shadow: 'shadow-red-500/20',
        };
    }
  };

  const colors = getColors();
  const IconComponent = type === 'success' ? CheckCircle : AlertTriangle;

  return (
    <AnimatePresence>
      {show && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden m-4 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`p-6 ${colors.bg} text-white flex items-center justify-between transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                  onClick={onCancel}
                >
                  <IconComponent size={20} />
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
              </div>
              <button
                onClick={onCancel}
                className="p-2 hover:bg-white/20 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 text-center space-y-6">
              <div
                className={`w-20 h-20 ${colors.light} ${colors.text} rounded-2xl flex items-center justify-center mx-auto border ${colors.border} shadow-sm`}
              >
                <IconComponent size={40} />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed font-medium px-2">{message}</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-3 ${colors.bg} text-white rounded-2xl text-sm font-bold ${colors.hover} transition-all shadow-lg ${colors.shadow} active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2`}
                >
                  {isLoading ? <RefreshCw size={16} className="animate-spin" /> : null}
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
