import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal = ({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'danger'
}: ConfirmModalProps) => {
  const getColors = () => {
    switch (type) {
      case 'danger': return { bg: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', light: 'bg-red-50' };
      case 'warning': return { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-amber-600', light: 'bg-amber-50' };
      case 'info': return { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-600', light: 'bg-blue-50' };
      default: return { bg: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', light: 'bg-red-50' };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {show && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 ${colors.bg} text-white flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <h3 className="font-bold">{title}</h3>
              </div>
              <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-8 text-center space-y-6">
              <div className={`w-16 h-16 ${colors.light} ${colors.text} rounded-full flex items-center justify-center mx-auto`}>
                <AlertTriangle size={32} />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                {message}
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 py-3 ${colors.bg} text-white rounded-xl text-sm font-bold ${colors.hover} transition-all shadow-lg active:scale-95`}
                >
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
