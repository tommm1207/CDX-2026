import { useState, useEffect } from 'react';
import { CalendarCheck, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';

export const Attendance = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: empData } = await supabase.from('users').select('*').neq('status', 'Nghỉ việc').neq('role', 'Admin App').order('code');
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
      setLoading(false);
    }
  };

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getStatus = (empId: string, day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.find(a => a.employee_id === empId && a.date === dateStr);
  };

  const toggleAttendance = async (empId: string, day: number) => {
    if (user.role === 'User') return;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const current = getStatus(empId, day);

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
        fetchData();
        return;
      }

      await supabase.from('attendance').update({ status: nextStatus, hours_worked: hours, overtime_hours: current.overtime_hours || 0 }).eq('id', current.id);
    } else {
      await supabase.from('attendance').insert([{
        employee_id: empId,
        date: dateStr,
        status: 'present',
        hours_worked: 8,
        overtime_hours: 0
      }]);
    }
    fetchData();
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAtt, setEditingAtt] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ status: 'present', overtime: 0 });

  const openEditModal = (empId: string, day: number) => {
    if (user.role === 'User') return;
    const att = getStatus(empId, day);
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500 text-white';
      case 'half-day': return 'bg-amber-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      default: return 'bg-gray-100 text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'X';
      case 'half-day': return '1/2';
      case 'absent': return 'V';
      default: return '';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Chấm công" onBack={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarCheck className="text-primary" /> Chấm công nhân viên
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý chuyên cần và giờ làm việc</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-3 py-1.5 rounded-xl border-none text-sm font-bold text-gray-700 outline-none">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-1.5 rounded-xl border-none text-sm font-bold text-gray-700 outline-none">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider sticky left-0 z-10 bg-primary border-r border-white/10 w-48">Nhân viên</th>
                {days.map(d => <th key={d} className="px-1 py-3 text-[10px] font-bold uppercase tracking-wider text-center border-r border-white/10 w-10">{d}</th>)}
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-20">Tổng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={days.length + 2} className="px-4 py-12 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : (
                employees.map((emp) => {
                  const empAtt = attendance.filter(a => a.employee_id === emp.id);
                  const totalDays = empAtt.reduce((sum, a) => sum + Number(a.hours_worked || 0), 0) / 8;
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-100">
                        <p className="text-xs font-bold text-gray-800 leading-tight">{emp.full_name}</p>
                        <p className="text-[9px] text-gray-400">{emp.code || emp.id.slice(0, 8)}</p>
                      </td>
                      {days.map(d => {
                        const att = getStatus(emp.id, d);
                        return (
                          <td key={d} className="p-0.5 border-r border-gray-50 relative group/cell">
                            <button
                              onClick={() => toggleAttendance(emp.id, d)}
                              onContextMenu={(e) => { e.preventDefault(); openEditModal(emp.id, d); }}
                              className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-black transition-all ${getStatusColor(att?.status)}`}
                            >
                              <span>{getStatusLabel(att?.status)}</span>
                              {att?.overtime_hours > 0 && <span className="text-[7px] leading-none mt-0.5">+{att.overtime_hours}h</span>}
                            </button>
                            {user.role !== 'User' && (
                              <button
                                onClick={() => openEditModal(emp.id, d)}
                                className="absolute -top-1.5 -right-1.5 bg-white shadow-md border border-gray-100 rounded-full p-1 transition-all z-20 hover:scale-110 active:scale-90"
                              >
                                <Plus size={10} className="text-primary" />
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-center text-xs font-black text-primary">{totalDays.toFixed(1)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
