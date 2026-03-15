import { useState, useEffect } from 'react';
import { CalendarCheck, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';

import { AttendanceTable } from './AttendanceTable';

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

      <AttendanceTable
        employees={employees}
        days={days}
        attendance={attendance}
        loading={loading}
        user={user}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onToggleAttendance={toggleAttendance}
        onOpenEditModal={openEditModal}
      />

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
