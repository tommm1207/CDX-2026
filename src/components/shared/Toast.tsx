import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border w-[300px] ${
              toast.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' :
              toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
              'bg-blue-50 border-blue-100 text-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />}
            {toast.type === 'error' && <AlertCircle className="text-red-500 flex-shrink-0" size={20} />}
            {toast.type === 'info' && <Info className="text-blue-500 flex-shrink-0" size={20} />}
            
            <p className="text-sm font-medium flex-1 leading-tight">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                toast.type === 'success' ? 'hover:bg-green-100 text-green-600' :
                toast.type === 'error' ? 'hover:bg-red-100 text-red-600' :
                'hover:bg-blue-100 text-blue-600'
              }`}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
