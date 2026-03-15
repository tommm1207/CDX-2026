import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, Trash2, X, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { formatDate } from '../../utils/format';

export const Notifications = ({ user, onBack }: { user: Employee, onBack: () => void }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('status', 'reminded')
        .order('reminder_time', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClear = async (id: string) => {
    try {
      // For notifications, we'll just update status to 'cleared' or similar if it exists,
      // but for now, let's keep it simple: any 'reminded' item is a notification.
      // If we want to "clear" it from the notification center, we might need a new column or status.
      // Let's use 'cleared' status.
      const { error } = await supabase.from('reminders').update({ status: 'cleared' }).eq('id', id);
      if (error) throw error;
      fetchNotifications();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Bạn có muốn xóa tất cả thông báo?')) return;
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ status: 'cleared' })
        .eq('status', 'reminded');
      
      if (error) throw error;
      fetchNotifications();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Trung tâm Thông báo" onBack={onBack} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="text-primary" /> Thông báo hệ thống
          </h2>
          <p className="text-xs text-gray-500 mt-1">Các lời nhắc đã được kích hoạt</p>
        </div>
        
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
          >
            <Trash2 size={16} /> Xóa tất cả
          </button>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 italic text-gray-400">
            <RefreshCw className="animate-spin mb-2" />
            <p>Đang tải thông báo...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
              <Bell size={32} />
            </div>
            <div>
              <p className="text-gray-500 font-medium">Không có thông báo mới nào</p>
              <p className="text-xs text-gray-400 mt-1">Các lời nhắc sẽ xuất hiện ở đây khi đến giờ</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 group"
              >
                <div className="p-3 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                  <Clock size={24} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-gray-800 truncate">{notif.title}</h4>
                    <span className="text-[10px] font-bold text-gray-400 uppercase flex-shrink-0">
                      {new Date(notif.reminder_time).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notif.content}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleClear(notif.id)}
                    className="p-2 text-gray-400 hover:bg-gray-100 hover:text-green-600 rounded-lg transition-all"
                    title="Đã xem"
                  >
                    <CheckCircle size={18} />
                  </button>
                  <button
                    onClick={() => handleClear(notif.id)}
                    className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Xóa"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
