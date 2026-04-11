import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'notification';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
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
            initial={
              toast.type === 'notification'
                ? { opacity: 0, y: -50, scale: 0.95 }
                : { opacity: 0, x: 50, scale: 0.9 }
            }
            animate={
              toast.type === 'notification'
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 1, x: 0, scale: 1 }
            }
            exit={
              toast.type === 'notification'
                ? { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
                : { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
            }
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl border w-[320px] ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-100 text-green-800'
                : toast.type === 'error'
                  ? 'bg-red-50 border-red-100 text-red-800'
                  : toast.type === 'warning'
                    ? 'bg-amber-50 border-amber-100 text-amber-800'
                    : toast.type === 'notification'
                      ? 'bg-white border-primary/20 text-gray-800 shadow-2xl shadow-primary/10 relative overflow-hidden ring-1 ring-primary/5'
                      : 'bg-blue-50 border-blue-100 text-blue-800'
            }`}
          >
            {toast.type === 'notification' && (
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            )}

            {toast.type === 'success' && (
              <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            )}
            {toast.type === 'warning' && (
              <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            )}
            {toast.type === 'info' && (
              <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
            )}
            {toast.type === 'notification' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="text-primary">
                  <AlertCircle size={16} />
                </i>
              </div>
            )}

            <div className="flex-1 flex flex-col pt-0.5">
              {toast.title && (
                <p className="text-sm font-black text-gray-900 mb-0.5 leading-tight">
                  {toast.title}
                </p>
              )}
              <p
                className={`text-[13px] font-medium leading-relaxed whitespace-pre-wrap ${toast.type === 'notification' ? 'text-gray-600 line-clamp-3' : ''}`}
              >
                {toast.message.split('**').map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="font-black text-gray-900">
                      {part}
                    </strong>
                  ) : (
                    part
                  ),
                )}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className={`p-1 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                toast.type === 'success'
                  ? 'hover:bg-green-100 text-green-600'
                  : toast.type === 'error'
                    ? 'hover:bg-red-100 text-red-600'
                    : toast.type === 'warning'
                      ? 'hover:bg-amber-100 text-amber-600'
                      : toast.type === 'notification'
                        ? 'hover:bg-gray-100 text-gray-400'
                        : 'hover:bg-blue-100 text-blue-600'
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
