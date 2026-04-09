import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, Trash2, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { parseReminderContent } from '@/utils/reminderUtils';

export const Notifications = ({ user, onBack, onNavigate, addToast }: { 
  user: Employee, 
  onBack: () => void,
  onNavigate?: (page: string, params?: any) => void,
  addToast?: (message: string, type?: ToastType) => void
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [remindersRes, siRes, soRes, costRes] = await Promise.all([
        supabase
          .from('reminders')
          .select('*')
          .neq('status', 'Đã xóa') // Lấy cả những cái chưa bị xóa (bao gồm cả pending và reminded)
          .gte('created_at', twentyFourHoursAgo)
          .order('reminder_time', { ascending: false }),
        supabase
          .from('stock_in')
          .select('id, import_code, created_at')
          .eq('status', 'Chờ duyệt')
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('stock_out')
          .select('id, export_code, created_at')
          .eq('status', 'Chờ duyệt')
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('costs')
          .select('id, voucher_code, created_at')
          .eq('status', 'Chờ duyệt')
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (remindersRes.error) throw remindersRes.error;
      
      const clearedRaw = localStorage.getItem('cleared_reminders') || '[]';
      const clearedMap = new Set(JSON.parse(clearedRaw));
      
      const activeReminders = (remindersRes.data || []).filter(rem => {
        // Bỏ qua nếu user đã Xóa
        if (clearedMap.has(rem.id)) return false;
        
        // Bỏ qua nếu chưa tới giờ
        if (new Date(rem.reminder_time).getTime() > Date.now()) return false;
        
        // Lọc theo người được phân công 
        const payload = parseReminderContent(rem.content);
        if (payload.assignees.length > 0 && !payload.assignees.includes(user.id)) return false;
        
        // Gắn lại text sạch để hiển thị
        rem.content = payload.text;
        return true;
      });

      setNotifications(activeReminders);

      // Combine and sort activities
      const activities = [
        ...(siRes.data || []).map(item => ({ id: item.id, code: item.import_code, type: 'Nhập kho', created_at: item.created_at })),
        ...(soRes.data || []).map(item => ({ id: item.id, code: item.export_code, type: 'Xuất kho', created_at: item.created_at })),
        ...(costRes.data || []).map(item => ({ id: item.id, code: item.voucher_code, type: 'Chi phí', created_at: item.created_at }))
      ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

      setPendingActivities(activities);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      if (addToast) addToast('Lỗi tải thông báo: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClear = async (id: string) => {
    try {
      const clearedRaw = localStorage.getItem('cleared_reminders') || '[]';
      const clearedList = JSON.parse(clearedRaw);
      if (!clearedList.includes(id)) {
        clearedList.push(id);
        localStorage.setItem('cleared_reminders', JSON.stringify(clearedList));
      }
      fetchNotifications();
      if (addToast) addToast('Đã đánh dấu xử lý nhắc nhở', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Bạn có muốn xóa hiển thị tất cả nhắc nhở trên thiết bị này?')) return;
    try {
      const clearedRaw = localStorage.getItem('cleared_reminders') || '[]';
      const clearedList = JSON.parse(clearedRaw);
      notifications.forEach(n => {
        if (!clearedList.includes(n.id)) clearedList.push(n.id);
      });
      localStorage.setItem('cleared_reminders', JSON.stringify(clearedList));
      fetchNotifications();
      if (addToast) addToast('Đã xóa tất cả nhắc nhở khỏi danh sách', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-8 pb-44">
      <PageBreadcrumb title="Trung tâm Thông báo" onBack={onBack} />
      
      {/* SECTION 1: Recent Activities (Last 24h Pending) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
              <RefreshCw className={`text-blue-500 ${loading ? 'animate-spin' : ''}`} size={20} /> Hoạt động gần đây
            </h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Phiếu mới chờ duyệt trong 24h qua</p>
          </div>
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? (
            <div className="col-span-full py-8 text-center text-gray-400 italic text-xs">Đang tải...</div>
          ) : pendingActivities.length === 0 ? (
            <div className="col-span-full py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 text-xs">
              Không có hoạt động mới nào cần duyệt.
            </div>
          ) : (
            pendingActivities.map((act) => (
              <div 
                key={`${act.type}-${act.id}`}
                className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between group hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                      Có phiếu <span className="text-blue-600 font-black">{act.type}</span> mới
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Mã: {act.code} • {new Date(act.created_at).toLocaleTimeString('vi-VN')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate && onNavigate(act.type === 'Nhập kho' ? 'stock-in' : (act.type === 'Xuất kho' ? 'stock-out' : 'cost-report'))}
                  className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors"
                >
                  XỬ LÝ
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* SECTION 2: Reminders (System Notifications) */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
              <Bell className="text-primary" size={20} /> Nhắc nhở đã kích hoạt
            </h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Các lời nhắc từ hệ thống Scheduler</p>
          </div>
          
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
            >
              <Trash2 size={14} /> Xóa tất cả
            </button>
          )}
        </div>

        <div className="space-y-3">
          {!loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-gray-100 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
                <Bell size={32} />
              </div>
              <p className="text-gray-400 text-xs italic">Mọi thứ đã gọn gàng! Không có nhắc nhở nào mới.</p>
            </div>
          ) : (
            <AnimatePresence>
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-start gap-4 group hover:shadow-xl hover:shadow-gray-200/40 transition-all"
                >
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl flex-shrink-0 group-hover:rotate-12 transition-transform">
                    <Clock size={24} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-gray-800 truncate">{notif.title}</h4>
                      <span className="text-[10px] font-bold text-gray-400 uppercase flex-shrink-0 bg-gray-50 px-2 py-1 rounded-lg">
                        {new Date(notif.reminder_time).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">{notif.content}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleClear(notif.id)}
                      className="p-2.5 text-gray-400 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                      title="Đã xử lý"
                    >
                      <CheckCircle size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};
