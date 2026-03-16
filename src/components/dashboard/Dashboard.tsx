import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  FileText,
  CalendarCheck,
  ArrowLeftRight,
  Plus,
  X
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/format';
import { AttendanceTable } from '../hr/AttendanceTable';
import { NumericInput } from '../shared/NumericInput';
import { ToastType } from '../shared/Toast';

interface DashboardProps {
  user: Employee;
  onNavigate: (page: string, params?: any) => void;
  addToast?: (message: string, type?: ToastType) => void;
}

export const Dashboard = ({ user, onNavigate, addToast }: DashboardProps) => {
  const [stats, setStats] = useState({
    totalBudget: 0,
    totalIn: 0,
    totalOut: 0,
    pendingApprovals: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Attendance data for Users
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAtt, setEditingAtt] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ status: 'present', overtime: 0 });

  const selectedMonth = new Date().getMonth() + 1;
  const selectedYear = new Date().getFullYear();

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

    const fetchAttendanceData = async () => {
      // Fetch for everyone now since Admin also sees the table
      setLoadingAttendance(true);
      try {
        const { data: empData } = await supabase.from('users').select('*').neq('status', 'Nghỉ việc').neq('role', 'Admin App').eq('has_salary', true).order('code');
        if (empData) setEmployees(empData);

        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

        const { data: attData } = await supabase
          .from('attendance')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate);

        if (attData) setAttendance(attData);
      } catch (err) {
        console.error('Error fetching attendance:', err);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchDashboardData();
    fetchAttendanceData();
  }, [user.role, selectedMonth, selectedYear]);

  const toggleAttendance = async (empId: string, day: number) => {
    if (user.role === 'User') return;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const current = attendance.find(a => a.employee_id === empId && a.date === dateStr);

    if (current) {
      let nextStatus = 'present';
      let hours = 8;

      if (current.status === 'present') {
        nextStatus = 'half-day';
        hours = 4;
      } else if (current.status === 'half-day') {
        nextStatus = 'absent';
        hours = 0;
      } else {
        await supabase.from('attendance').delete().eq('id', current.id);
        const { data: updatedAtt } = await supabase
          .from('attendance')
          .select('*')
          .gte('date', `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`)
          .lte('date', new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]);
        if (updatedAtt) setAttendance(updatedAtt);
        
        if (addToast) addToast(`Đã xóa chấm công ngày ${day}/${selectedMonth}`, 'info');
        return;
      }

      await supabase.from('attendance').update({ status: nextStatus, hours_worked: hours, overtime_hours: current.overtime_hours || 0 }).eq('id', current.id);
      if (addToast) addToast(`Đã cập nhật chấm công thành: ${getStatusLabel(nextStatus)}`, 'success');
    } else {
      await supabase.from('attendance').insert([{
        employee_id: empId,
        date: dateStr,
        status: 'present',
        hours_worked: 8,
        overtime_hours: 0
      }]);
      if (addToast) addToast(`Đã chấm công đủ ngày ${day}/${selectedMonth}`, 'success');
    }
    
    // Refresh attendance data
    const { data: updatedAtt } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`)
      .lte('date', new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]);
    if (updatedAtt) setAttendance(updatedAtt);
  };

  const openEditModal = (empId: string, day: number) => {
    if (user.role === 'User') return;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const att = attendance.find(a => a.employee_id === empId && a.date === dateStr);
    setEditingAtt({ empId, day, dateStr, id: att?.id });
    setEditFormData({
      status: att?.status || 'present',
      overtime: att?.overtime_hours || 0
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    const hours = editFormData.status === 'present' ? 8 : (editFormData.status === 'half-day' ? 4 : 0);
    if (editingAtt.id) {
      await supabase.from('attendance').update({
        status: editFormData.status,
        hours_worked: hours,
        overtime_hours: editFormData.overtime
      }).eq('id', editingAtt.id);
    } else {
      await supabase.from('attendance').insert([{
        employee_id: editingAtt.empId,
        date: editingAtt.dateStr,
        status: editFormData.status,
        hours_worked: hours,
        overtime_hours: editFormData.overtime
      }]);
    }
    setShowEditModal(false);
    
    if (addToast) addToast(`Đã lưu thay đổi công ngày ${editingAtt.day}/${selectedMonth}`, 'success');
    
    // Refresh attendance data
    const { data: updatedAtt } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`)
      .lte('date', new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]);
    if (updatedAtt) setAttendance(updatedAtt);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'X';
      case 'half-day': return '1/2';
      case 'absent': return 'V';
      default: return '';
    }
  };

  const menuActions = [
    { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownCircle, color: 'bg-blue-500', description: 'Tạo phiếu nhập vật tư mới' },
    { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle, color: 'bg-orange-500', description: 'Tạo phiếu xuất kho vật tư' },
    { id: 'transfer', label: 'Luân chuyển kho', icon: ArrowLeftRight, color: 'bg-green-600', description: 'Chuyển vật tư giữa các kho' },
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
          (user.role === 'Admin' || user.role === 'Admin App' || ['stock-in', 'stock-out', 'transfer', 'cost-report'].includes(action.id)) && (
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
        {/* Main Content Area */}
        <div className="xl:col-span-2 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CalendarCheck className="text-primary" /> Bảng theo dõi chấm công
                </h2>
                <p className="text-xs text-gray-500 mt-1">Tháng {selectedMonth}/{selectedYear}</p>
              </div>
              <button 
                onClick={() => onNavigate('attendance')}
                className="text-xs font-bold text-primary hover:underline underline-offset-4"
              >
                XEM CHI TIẾT
              </button>
            </div>
            <AttendanceTable
              employees={employees}
              days={Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => i + 1)}
              attendance={attendance}
              loading={loadingAttendance}
              user={user}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onToggleAttendance={toggleAttendance}
              onOpenEditModal={openEditModal}
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Pending Approvals Widget - Now in Sidebar for Admin */}
          {(user.role === 'Admin' || user.role === 'Admin App') && (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div 
                className="p-8 pb-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onNavigate('pending-approvals')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Bell size={20} className="animate-bounce" />
                  </div>
                  <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Phiếu đang chờ duyệt</h2>
                </div>
                <span className="px-4 py-1.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full border-2 border-red-50">
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
                        <p className="text-sm font-bold text-amber-900">Yêu cầu mới</p>
                        <p className="text-[10px] text-amber-700 font-medium">Bạn có {stats.pendingApprovals} phiếu đang chờ.</p>
                      </div>
                    </div>
                    <button className="p-2 bg-amber-500 text-white rounded-lg shadow-lg shadow-amber-500/20 group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-[2rem]">
                    <CheckCircle2 size={32} className="text-green-500/50 mb-2" />
                    <p className="font-bold text-xs">Mọi thứ đã xong!</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
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
      
      {/* Edit Attendance Modal */}
      <AnimatePresence>
        {showEditModal && editingAtt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Chi tiết ngày {editingAtt.day}</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái công</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {['present', 'half-day', 'absent'].map(s => (
                      <button
                        key={s}
                        onClick={() => setEditFormData({ ...editFormData, status: s })}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${editFormData.status === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}
                      >
                        {getStatusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
                <NumericInput
                  label="Giờ tăng ca (h)"
                  value={editFormData.overtime}
                  onChange={(val) => setEditFormData({ ...editFormData, overtime: val })}
                  placeholder="Ví dụ: 1.5"
                  isDecimal={true}
                />
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500">Hủy</button>
                  <button onClick={saveEdit} className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20">Lưu</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
