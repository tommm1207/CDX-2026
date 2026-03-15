import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingDown,
  LayoutDashboard,
  Bell,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/format';

export const Dashboard = ({ user, onNavigate }: { user: Employee, onNavigate: (page: string, params?: any) => void }) => {
  const [stats, setStats] = useState({
    totalBudget: 0,
    totalIn: 0,
    totalOut: 0,
    pendingApprovals: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch Stats
        const [expenses, siCount, soCount, trCount] = await Promise.all([
          supabase.from('costs').select('total_amount').eq('status', 'Đã duyệt'),
          supabase.from('stock_in').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
          supabase.from('stock_out').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
          supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt')
        ]);

        const totalSpent = (expenses.data || []).reduce((sum, item) => sum + (item.total_amount || 0), 0);

        setStats({
          totalBudget: totalSpent,
          totalIn: 125, // Mock data or fetch real
          totalOut: 48,
          pendingApprovals: (siCount.count || 0) + (soCount.count || 0) + (trCount.count || 0)
        });

        // Fetch Recent Activities
        const { data: recent } = await supabase
          .from('costs')
          .select('*, users(full_name)')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentActivities(recent || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const menuActions = [
    { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownCircle, color: 'bg-blue-500', description: 'Tạo phiếu nhập vật tư mới' },
    { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle, color: 'bg-orange-500', description: 'Tạo phiếu xuất kho vật tư' },
    { id: 'attendance', label: 'Chấm công', icon: CheckCircle2, color: 'bg-green-600', description: 'Điểm danh nhân sự hôm nay' },
    { id: 'cost-report', label: 'Báo cáo chi phí', icon: FileText, color: 'bg-primary', description: 'Ghi chép chi tiêu dự án' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Chào {user.full_name.split(' ').pop()}! 👋
          </h1>
          <p className="text-gray-500 font-medium">Chúc bạn một ngày làm việc hiệu quả tại CDX.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <LayoutDashboard size={24} />
          </div>
          <div className="pr-4 border-r border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Dự án</p>
            <p className="text-sm font-black text-gray-800 leading-none">CDX - 2026</p>
          </div>
          <div className="pl-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Vai trò</p>
            <p className="text-sm font-black text-primary leading-none uppercase">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {menuActions.map((action, idx) => (
          (user.role === 'Admin' || user.role === 'Admin App' || ['stock-in', 'stock-out', 'attendance', 'cost-report'].includes(action.id)) && (
            <motion.div
              key={action.id}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(action.id)}
              className="group bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-gray-100 cursor-pointer hover:shadow-xl hover:shadow-gray-200/50 transition-all flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 bg-gray-50 rounded-bl-full translate-x-4 -translate-y-4 group-hover:bg-primary/5 transition-colors" />
              <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center text-white shadow-lg relative z-10 group-hover:rotate-12 transition-transform`}>
                <action.icon size={24} />
              </div>
              <div className="relative z-10">
                <h3 className="text-base font-bold text-gray-800 group-hover:text-primary transition-colors">{action.label}</h3>
                <p className="text-[10px] text-gray-400 font-medium leading-tight mt-1">{action.description}</p>
              </div>
              <ArrowRight className="absolute bottom-6 right-6 text-gray-200 group-hover:text-primary group-hover:translate-x-1 transition-all" size={20} />
            </motion.div>
          )
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Stats */}
        <div className="xl:col-span-2 space-y-8">

          {/* Pending Approvals Widget */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Bell size={20} className="animate-bounce" />
                </div>
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Phiếu đang chờ duyệt</h2>
              </div>
              <span className="px-4 py-1.5 bg-red-100 text-red-600 text-xs font-black rounded-full border-2 border-red-50">
                {stats.pendingApprovals} PHIẾU
              </span>
            </div>
            <div className="px-8 pb-8 pt-4">
              {stats.pendingApprovals > 0 ? (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 flex items-center justify-between group cursor-pointer" onClick={() => onNavigate('pending-approvals')}>
                  <div className="flex gap-4 items-center">
                    <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">Yêu cầu phê duyệt mới</p>
                      <p className="text-xs text-amber-700 font-medium">Bạn có {stats.pendingApprovals} phiếu nhập/xuất/chi đang chờ xử lý.</p>
                    </div>
                  </div>
                  <button className="p-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 group-hover:translate-x-1 transition-transform">
                    <ArrowRight size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-100 rounded-[2rem]">
                  <CheckCircle2 size={48} className="text-green-500/50 mb-4" />
                  <p className="font-bold text-sm">Không còn phiếu nào chờ duyệt</p>
                  <p className="text-xs font-medium">Mọi thứ đã được xử lý xong!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Mini List */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Ghi chép mới nhất</h2>
              <button className="text-[10px] font-bold text-primary hover:underline underline-offset-4" onClick={() => onNavigate('costs')}>XEM TẤT CẢ</button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              {recentActivities.length > 0 ? (
                <div className="space-y-2">
                  {recentActivities.map((activity, idx) => (
                    <div key={activity.id} className="p-4 rounded-3xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 flex gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                        <Wallet size={18} className="text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs font-bold text-gray-800 line-clamp-1">{activity.content}</p>
                          <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-md shrink-0">
                            {formatCurrency(activity.total_amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{activity.users?.full_name}</p>
                          <span className="w-1 h-1 bg-gray-200 rounded-full" />
                          <p className="text-[9px] text-gray-400 font-medium">
                            {new Date(activity.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <LayoutDashboard size={40} className="mb-4 opacity-10" />
                  <p className="text-xs font-bold">Chưa có hoạt động nào</p>
                </div>
              )}
            </div>
            <div className="p-8 pt-4">
              <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Trạng thái hệ thống</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-sm font-black text-gray-800">Hoạt động ổn định</p>
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-2 leading-relaxed">Dữ liệu được bảo mật và sao lưu thời gian thực trên Cloud Server.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
