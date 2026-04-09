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
  X,
  Package,
  Layers,
  Banknote
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { formatCurrency, formatNumber } from '@/utils/format';
import { parseReminderContent } from '@/utils/reminderUtils';
import { AttendanceTable } from '../hr/AttendanceTable';
import { NumericInput } from '../shared/NumericInput';
import { ToastType } from '../shared/Toast';

interface DashboardProps {
  user: Employee;
  onNavigate: (page: string, params?: any) => void;
  addToast?: (message: string, type?: ToastType) => void;
  pendingApprovals?: number;
}

export const Dashboard = ({ user, onNavigate, addToast, pendingApprovals = 0 }: DashboardProps) => {
  // Attendance data for Users
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAtt, setEditingAtt] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ status: 'present', overtime: 0 });
  const [reminderCount, setReminderCount] = useState(0);

  const selectedMonth = new Date().getMonth() + 1;
  const selectedYear = new Date().getFullYear();

  useEffect(() => {
    const fetchReminderCount = async () => {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('reminders')
          .select('*')
          .neq('status', 'Đã xóa')
          .gte('created_at', twentyFourHoursAgo);

        if (data) {
          const clearedRaw = localStorage.getItem('cleared_reminders') || '[]';
          const clearedMap = new Set(JSON.parse(clearedRaw));
          
          let count = 0;
          for (const rem of data) {
            if (clearedMap.has(rem.id)) continue;
            if (new Date(rem.reminder_time).getTime() > Date.now()) continue;
            const payload = parseReminderContent(rem.content);
            if (payload.assignees.length > 0 && !payload.assignees.includes(user.id)) continue;
            count++;
          }
          setReminderCount(count);
        }
      } catch (err) {}
    };
    
    fetchReminderCount();
    const interval = setInterval(fetchReminderCount, 15000);
    return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
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
    { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle, color: 'bg-red-600', description: 'Tạo phiếu xuất kho vật tư' },
    { id: 'transfer', label: 'Luân chuyển kho', icon: ArrowLeftRight, color: 'bg-orange-500', description: 'Chuyển vật tư giữa các kho' },
    { id: 'production-list', label: 'Lệnh sản xuất', icon: Layers, color: 'bg-indigo-600', description: 'Điều phối sản xuất và vật tư' },
    { id: 'cost-report', label: 'Báo cáo chi phí', icon: FileText, color: 'bg-primary', description: 'Ghi chép chi tiêu dự án' },
  ];

  const totalNotifs = reminderCount + ((user.role === 'Admin' || user.role === 'Admin App') ? pendingApprovals : 0);

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Chào {user.full_name.split(' ').pop()}! 👋
          </h1>
          <p className="text-gray-500 font-medium text-sm">Chúc bạn một ngày làm việc hiệu quả tại CDX.</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20 h-[46px]">
            <div className="text-left">
              <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest leading-none mb-1">Vai trò</p>
              <p className="text-sm font-black text-white leading-none uppercase">{user.role}</p>
            </div>
          </div>

          <button 
            onClick={() => onNavigate('notifications')}
            className="group relative flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 w-[46px] h-[46px] rounded-xl transition-all shadow-sm border border-gray-100 mr-2 md:mr-0"
          >
            <Bell size={22} className={totalNotifs > 0 ? "text-amber-500 group-hover:scale-110 transition-transform" : "text-gray-400"} />
            {totalNotifs > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-slow-fade">
                {totalNotifs}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Actions — 1 row compact on mobile, full cards on desktop */}
      <div className="grid grid-cols-4 gap-2 md:gap-6 md:grid-cols-4">
        {menuActions.map((action) => (
          (user.role === 'Admin' || user.role === 'Admin App' || ['stock-in', 'stock-out', 'transfer', 'cost-report'].includes(action.id)) && (
            <motion.div
              key={action.id}
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate(action.id)}
              className="group bg-white md:p-6 rounded-xl md:rounded-[2rem] shadow-sm border border-gray-100 cursor-pointer hover:shadow-xl hover:shadow-gray-200/50 transition-all flex flex-col items-center justify-center py-2.5 px-1 md:items-start md:gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 bg-gray-50 rounded-bl-full translate-x-4 -translate-y-4 group-hover:bg-primary/5 transition-colors hidden md:block" />
              <div className={`w-8 h-8 md:w-12 md:h-12 flex-shrink-0 ${action.color} rounded-lg md:rounded-2xl flex items-center justify-center text-white shadow-sm md:shadow-lg relative z-10 group-hover:rotate-12 transition-transform`}>
                <action.icon size={16} className="md:hidden" />
                <action.icon size={24} className="hidden md:block" />
              </div>
              <p className="text-[10px] md:hidden font-semibold text-gray-600 text-center leading-tight mt-1.5 w-full px-0.5">{action.label}</p>
              <div className="hidden md:block relative z-10">
                <h3 className="text-base font-bold text-gray-800 group-hover:text-primary transition-colors">{action.label}</h3>
                <p className="text-[10px] text-gray-400 font-medium leading-tight mt-1">{action.description}</p>
              </div>
              <ArrowRight className="hidden md:block absolute bottom-6 right-6 text-gray-200 group-hover:text-primary group-hover:translate-x-1 transition-all" size={20} />
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
            <div
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onNavigate('pending-approvals')}
            >
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                    <Bell size={14} className="animate-bounce" />
                  </div>
                  <h2 className="text-xs font-black text-gray-700 uppercase tracking-tight">Phiếu chờ duyệt</h2>
                </div>
                <span className="px-2.5 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-full">
                  {pendingApprovals} phiếu
                </span>
              </div>
              {pendingApprovals > 0 && (
                <div className="px-4 pb-3">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div className="flex gap-2 items-center">
                      <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                      <p className="text-[11px] text-amber-800 font-medium">Bạn có {pendingApprovals} phiếu đang chờ</p>
                    </div>
                    <ArrowRight size={14} className="text-amber-500" />
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              <p className="text-xs font-bold text-gray-700">Hệ thống hoạt động ổn định</p>
              <span className="ml-auto text-[10px] text-gray-400">Cloud Server</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Attendance Modal */}
      <AnimatePresence>
        {showEditModal && editingAtt && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
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

      <RadialMenu onNavigate={onNavigate} />
    </div>
  );
};

const RadialMenu = ({ onNavigate }: { onNavigate: (page: string, params?: any) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const items = [
    { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownCircle, color: 'bg-blue-500', action: () => onNavigate('stock-in', { action: 'add' }) },
    { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle, color: 'bg-red-600', action: () => onNavigate('stock-out', { action: 'add' }) },
    { id: 'transfer', label: 'Luân chuyển', icon: ArrowLeftRight, color: 'bg-orange-500', action: () => onNavigate('transfer', { action: 'add' }) },
    { id: 'production-list', label: 'Sản xuất', icon: Layers, color: 'bg-indigo-600', action: () => onNavigate('production-list', { action: 'add' }) },
    { id: 'costs', label: 'Chi phí', icon: Wallet, color: 'bg-primary', action: () => onNavigate('costs', { action: 'add' }) },
    { id: 'notes', label: 'Ghi chú', icon: FileText, color: 'bg-amber-500', action: () => onNavigate('notes', { action: 'add' }) },
    { id: 'reminders', label: 'Lời nhắc', icon: Bell, color: 'bg-primary', action: () => onNavigate('reminders', { action: 'add' }) },
  ];

  return (
    <>
      {/* Overlay backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-[90px] right-6 z-[90]">
        <AnimatePresence>
          {isOpen && (
            <>
              {items.map((item, index) => {
                const angle = Math.PI + (Math.PI / 2) * (index / (items.length - 1)); 
                const iconRadius = 160; 
                const labelRadius = 245; // Further out for "Ray" effect
                
                const ix = Math.round(iconRadius * Math.cos(angle));
                const iy = Math.round(iconRadius * Math.sin(angle));
                
                const lx = Math.round(labelRadius * Math.cos(angle));
                const ly = Math.round(labelRadius * Math.sin(angle));

                return (
                  <React.Fragment key={item.id}>
                    {/* Label - Radial Ray style */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1, x: lx, y: ly }}
                      exit={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 25, delay: index * 0.05 }}
                      className="absolute inset-x-0 bottom-0 flex items-center justify-center pointer-events-none"
                    >
                      <div className="bg-white/95 backdrop-blur-md text-gray-800 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl shadow-xl border border-white/50">
                        {item.label}
                      </div>
                    </motion.div>

                    {/* Icon Button */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1, x: ix, y: iy }}
                      exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: index * 0.05 }}
                      className="absolute inset-x-0 bottom-0 flex items-center justify-center pointer-events-none"
                    >
                      <button
                        onClick={() => { setIsOpen(false); item.action(); }}
                        className={`flex items-center justify-center w-12 h-12 rounded-full shadow-2xl ${item.color} text-white hover:scale-110 hover:brightness-110 active:scale-95 transition-all outline-none pointer-events-auto shrink-0`}
                      >
                        <item.icon size={20} />
                      </button>
                    </motion.div>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all relative z-10 
            ${isOpen ? 'bg-red-500 text-white rotate-45' : 'bg-primary text-white hover:bg-primary-hover hover:scale-105 active:scale-95'}`}
        >
          <Plus size={28} className="transition-transform duration-300" />
        </button>
      </div>
    </>
  );
};
