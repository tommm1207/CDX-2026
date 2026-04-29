import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, ArrowRight, ArrowUpCircle, Menu as MenuIcon } from 'lucide-react';

interface AppInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppInstructionsModal = ({ isOpen, onClose }: AppInstructionsModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Download size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                      Cài đặt Ứng dụng
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                      Hướng dẫn đưa ứng dụng ra màn hình chính
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-primary/20">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-800 text-sm">
                      Mở trình duyệt trên điện thoại
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Truy cập vào địa chỉ sau bằng Safari (iPhone) hoặc Chrome (Android):
                    </p>
                    <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group">
                      <span className="text-xs font-mono text-primary font-bold">
                        https://cdx-team.vercel.app
                      </span>
                      <button
                        onClick={() => window.open('https://cdx-team.vercel.app', '_blank')}
                        className="p-1.5 bg-white rounded-lg shadow-sm text-gray-400 hover:text-primary transition-colors"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-primary/20">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-800 text-sm">Thêm vào màn hình chính</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <span className="font-bold text-gray-700">iOS (iPhone):</span> Nhấn nút{' '}
                      <span className="inline-block p-1 bg-gray-100 rounded text-blue-500">
                        <ArrowUpCircle size={12} /> Chia sẻ
                      </span>
                      , sau đó chọn{' '}
                      <span className="font-bold text-gray-700">"Thêm vào MH chính"</span>.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed mt-2">
                      <span className="font-bold text-gray-700">Android:</span> Nhấn nút{' '}
                      <span className="inline-block p-1 bg-gray-100 rounded text-gray-600">
                        <MenuIcon size={12} /> Menu
                      </span>{' '}
                      (3 chấm), sau đó chọn{' '}
                      <span className="font-bold text-gray-700">"Cài đặt ứng dụng"</span>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-primary/20">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-800 text-sm">Hoàn tất</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Biểu tượng ứng dụng sẽ xuất hiện trên màn hình điện thoại của bạn như một ứng
                      dụng thông thường.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-black/10"
                >
                  ĐÃ HIỂU, CẢM ƠN!
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
