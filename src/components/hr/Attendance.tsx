import { useState, useEffect } from 'react';
import { CalendarCheck, Plus, X, Users, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { ToastType } from '../shared/Toast';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { Button } from '../shared/Button';

import { AttendanceTable } from './AttendanceTable';

export const Attendance = ({ user, onBack, addToast }: { 
  user: Employee, 
  onBack?: () => void,
  addToast?: (message: string, type?: ToastType) => void 
}) => {
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

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [bulkFormData, setBulkFormData] = useState({
    status: 'present',
    overtime: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const openBulkModal = () => {
    setSelectedEmployees([]);
    setBulkFormData({
      ...bulkFormData,
      date: new Date().toISOString().split('T')[0]
    });
    setShowBulkModal(true);
  };

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, employeeName: '' });
  const [showConfirmBulk, setShowConfirmBulk] = useState(false);

  const handleStartSaveBulk = () => {
    if (selectedEmployees.length === 0) {
      if (addToast) addToast('Vui lòng chọn ít nhất một nhân viên', 'error');
      return;
    }
    setShowConfirmBulk(true);
  };

  const confirmAndSaveBulk = async () => {
    setShowConfirmBulk(false);
    setBulkLoading(true);
    const successfullySaved: string[] = [];
    let isError = false;

    try {
      for (let i = 0; i < selectedEmployees.length; i++) {
        const empId = selectedEmployees[i];
        const emp = employees.find(e => e.id === empId);
        setBulkProgress({ 
          current: i + 1, 
          total: selectedEmployees.length, 
          employeeName: emp?.full_name || 'Nhân viên' 
        });

        const setting = employeeSettings[empId] || { status: 'present', overtime: 0 };
        const hours = setting.status === 'present' ? 8 : (setting.status === 'half-day' ? 4 : 0);

        // Delete then insert
        const { error: delError } = await supabase
          .from('attendance')
          .delete()
          .eq('employee_id', empId)
          .eq('date', bulkFormData.date);
        
        if (delError) {
          isError = true;
          if (addToast) addToast(`Lỗi khi lưu ${emp?.full_name}: ${delError.message}`, 'error');
          break;
        }

        const { error: insError } = await supabase
          .from('attendance')
          .insert([{
            employee_id: empId,
            date: bulkFormData.date,
            status: setting.status,
            hours_worked: hours,
            overtime_hours: setting.overtime
          }]);

        if (insError) {
          isError = true;
          if (addToast) addToast(`Lỗi khi lưu ${emp?.full_name}: ${insError.message}`, 'error');
          break;
        }

        successfullySaved.push(emp?.full_name || empId);
      }

      if (!isError) {
        if (addToast) addToast('Đã lưu chấm công hàng loạt thành công!', 'success');
        setShowBulkModal(false);
      } else {
        const remainingCount = selectedEmployees.length - successfullySaved.length;
        alert(`QUÁ TRÌNH BỊ DỪNG LẠI!\n\n- Đã lưu thành công: ${successfullySaved.length} người\n- Nhân viên lỗi: ${bulkProgress.employeeName}\n- Chưa lưu được: ${remainingCount} người còn lại.`);
      }
    } catch (err: any) {
      console.error(err);
      if (addToast) addToast('Lỗi không xác định: ' + err.message, 'error');
    } finally {
      setBulkLoading(false);
      setBulkProgress({ current: 0, total: 0, employeeName: '' });
      fetchData();
    }
  };

  const [employeeSettings, setEmployeeSettings] = useState<Record<string, { status: string, overtime: number }>>({});

  useEffect(() => {
    // Sync settings when selections change
    const newSettings = { ...employeeSettings };
    let changed = false;
    selectedEmployees.forEach(id => {
      if (!newSettings[id]) {
        newSettings[id] = { status: bulkFormData.status, overtime: bulkFormData.overtime };
        changed = true;
      }
    });
    if (changed) setEmployeeSettings(newSettings);
  }, [selectedEmployees]);

  const updateIndividualSetting = (empId: string, field: 'status' | 'overtime', value: any) => {
    setEmployeeSettings(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value }
    }));
  };

  const applyGlobalToSelection = () => {
    const newSettings = { ...employeeSettings };
    selectedEmployees.forEach(id => {
      newSettings[id] = { status: bulkFormData.status, overtime: bulkFormData.overtime };
    });
    setEmployeeSettings(newSettings);
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
    if (addToast) addToast('Đã cập nhật chấm công thành công!', 'success');
    else alert('Đã cập nhật chấm công thành công!');
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
        <div className="flex items-center gap-2">
          {user.role !== 'User' && (
            <Button
              variant="secondary"
              icon={Users}
              onClick={openBulkModal}
            >
              Chấm công hàng loạt
            </Button>
          )}
          <MonthYearPicker
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
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
                <Button variant="ghost" size="icon" icon={X} onClick={() => setShowEditModal(false)} />
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
                  <Button variant="outline" fullWidth onClick={() => setShowEditModal(false)}>Hủy</Button>
                  <Button variant="primary" fullWidth onClick={saveEdit}>Lưu</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Bulk Attendance Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowBulkModal(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer">
                    <Users size={20} />
                  </button>
                  <h3 className="font-bold text-lg">Chấm công hàng loạt</h3>
                </div>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar">
                <div className="flex flex-col gap-8">
                  {/* Top: Global Settings & Selection Toggle */}
                  <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngày chấm công</label>
                      <input 
                        type="date" 
                        value={bulkFormData.date} 
                        onChange={(e) => setBulkFormData({ ...bulkFormData, date: e.target.value })} 
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thiết lập chung (Tùy chọn)</label>
                      <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200">
                        {['present', 'half-day', 'absent'].map(s => (
                          <button
                            key={s}
                            onClick={() => setBulkFormData({ ...bulkFormData, status: s })}
                            className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${bulkFormData.status === s ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                          >
                            {getStatusLabel(s)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <NumericInput
                        label="OT chung"
                        value={bulkFormData.overtime}
                        onChange={(val) => setBulkFormData({ ...bulkFormData, overtime: val })}
                        isDecimal={true}
                        className="flex-1"
                      />
                      <Button 
                        onClick={applyGlobalToSelection}
                        variant="primary"
                        size="sm"
                        title="Áp dụng cho những người đã chọn"
                      >
                        Áp dụng
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full min-h-[400px]">
                    {/* Left: Employee List for selection */}
                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col h-full overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Chọn nhân sự ({selectedEmployees.length})</label>
                        <button 
                          onClick={() => setSelectedEmployees(selectedEmployees.length === employees.length ? [] : employees.map(e => e.id))}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          {selectedEmployees.length === employees.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                        </button>
                      </div>
                      <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                        {employees.map(emp => (
                          <div 
                            key={emp.id} 
                            onClick={() => {
                              setSelectedEmployees(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]);
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedEmployees.includes(emp.id) ? 'bg-white border-primary shadow-sm' : 'bg-white/50 border-transparent opacity-60 hover:opacity-100'}`}
                          >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedEmployees.includes(emp.id) ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200'}`}>
                              {selectedEmployees.includes(emp.id) && <Check size={12} strokeWidth={4} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">{emp.full_name}</p>
                              <p className="text-[9px] text-gray-400">{emp.code || emp.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Individual Configuration */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col h-full overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Cấu hình riêng biệt</label>
                      </div>
                      
                      <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                        {selectedEmployees.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-300 italic py-12">
                            <Users size={32} className="mb-2 opacity-20" />
                            <p className="text-[10px]">Chưa chọn nhân viên nào</p>
                          </div>
                        ) : (
                          selectedEmployees.map(empId => {
                            const emp = employees.find(e => e.id === empId);
                            const setting = employeeSettings[empId] || { status: 'present', overtime: 0 };
                            return (
                              <div key={empId} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-800">{emp?.full_name}</span>
                                  <span className="text-[8px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded font-black">{emp?.code}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-[2] grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-gray-100">
                                    {['present', 'half-day', 'absent'].map(s => (
                                      <button
                                        key={s}
                                        onClick={() => updateIndividualSetting(empId, 'status', s)}
                                        className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${setting.status === s ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                                      >
                                        {getStatusLabel(s)}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex-1">
                                    <NumericInput
                                      value={setting.overtime}
                                      onChange={(val) => updateIndividualSetting(empId, 'overtime', val)}
                                      isDecimal={true}
                                      placeholder="OT"
                                      inputClassName="w-full px-2 py-2 rounded-xl border border-gray-100 text-xs font-bold text-amber-600 outline-none focus:ring-1 focus:ring-primary/20 text-center"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
                <div className="text-[10px] text-gray-400 font-medium">
                  {bulkLoading ? (
                    <span className="flex items-center gap-2 text-amber-600 font-bold">
                      <RefreshCw size={12} className="animate-spin" />
                      Đang lưu... ({bulkProgress.current}/{bulkProgress.total}) - {bulkProgress.employeeName}
                    </span>
                  ) : (
                    <>Đang chấm cho <span className="font-bold text-primary">{selectedEmployees.length}</span> nhân sự</>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBulkModal(false)} 
                    disabled={bulkLoading}
                  >
                    Hủy
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleStartSaveBulk} 
                    isLoading={bulkLoading}
                    disabled={selectedEmployees.length === 0}
                    className="min-w-[140px]"
                  >
                    Lưu dữ liệu
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Bulk Attendance */}
      <AnimatePresence>
        {showConfirmBulk && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-100"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                  <CalendarCheck size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Xác nhận chấm công</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Xác nhận chấm công cho <span className="font-bold text-primary">{selectedEmployees.length}</span> nhân viên <br /> 
                  ngày <span className="font-bold text-gray-700">{new Date(bulkFormData.date).toLocaleDateString('vi-VN')}</span>?
                </p>
                <div className="flex gap-3 w-full pt-4">
                  <Button 
                    variant="outline" 
                    fullWidth 
                    onClick={() => setShowConfirmBulk(false)}
                  >
                    Hủy
                  </Button>
                  <Button 
                    variant="primary" 
                    fullWidth 
                    onClick={confirmAndSaveBulk}
                  >
                    Xác nhận
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
