import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReloadPromptProps {
  currentPage?: string;
}

export function ReloadPrompt({ currentPage }: ReloadPromptProps) {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
      // Kiểm tra bản cập nhật định kỳ mỗi 60 phút
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  // Kiểm tra cập nhật khi người dùng quay lại tab hoặc đổi tính năng
  useEffect(() => {
    const handleCheckUpdate = () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.update();
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleCheckUpdate();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check ngay khi đổi trang (currentPage thay đổi)
    handleCheckUpdate();

    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentPage]);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9999]"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${needRefresh ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-600'}`}>
                {needRefresh ? <RefreshCw size={24} className="animate-spin-slow" /> : <Download size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">
                  {needRefresh ? 'Đã có bản cập nhật mới' : 'Sẵn sàng dùng ngoại tuyến'}
                </h3>
                <p className="text-sm text-gray-500">
                  {needRefresh 
                    ? 'Vui lòng cập nhật để sử dụng các tính năng mới nhất.' 
                    : 'Ứng dụng đã có thể hoạt động khi không có mạng.'}
                </p>
              </div>
              <button 
                onClick={close}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Cập nhật ngay
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
