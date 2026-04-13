import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { CalendarCheck, Plus, X, Users, Check, RefreshCw, Search, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { ToastType } from '../shared/Toast';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { Button } from '../shared/Button';
import { SortButton, SortOption } from '../shared/SortButton';
import { AttendanceTable } from './AttendanceTable';
import { ReportImagePreviewModal } from '../shared/ReportImagePreviewModal';
import { useTableCapture } from '../shared/useTableCapture';

export const Attendance = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_attendance_${user.id}`) as SortOption) || 'code',
  );
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const { captureElement, isCapturing: isCapturingTable } = useTableCapture();

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const isAdmin = ['admin', 'develop'].includes(user.role?.toLowerCase() || '');

      let query = supabase.from('users').select('*');

      if (!isAdmin) {
        query = query.eq('id', user.id);
      } else {
        query = query
          .neq('status', 'Nghỉ việc')
          .neq('status', 'Đã xóa')
          .neq('role', 'Develop')
          .eq('has_salary', true);
      }

      const { data: empData } = await query.order('code');
      if (empData) setEmployees(empData);

      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      let attQuery = supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (!isAdmin) {
        attQuery = attQuery.eq('employee_id', user.id);
      }

      const { data: attData } = await attQuery;

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
    return attendance.find((a) => a.employee_id === empId && a.date === dateStr);
  };

  const toggleAttendance = async (
    empId: string,
    day: number,
    action?: 'present' | 'half-day' | 'absent' | 'remove',
    otHours: number | '' = 0,
  ) => {
    const isAdmin = ['admin', 'develop'].includes(user.role?.toLowerCase() || '');
    if (!isAdmin) return;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const current = getStatus(empId, day);

    if (action === 'remove') {
      if (current) {
        await supabase.from('attendance').delete().eq('id', current.id);
        if (addToast) addToast(`Đã xóa chấm công ngày ${day}/${selectedMonth}`, 'info');
      }
      fetchData();
      return;
    }

    const status = action || 'present';
    const hours = status === 'present' ? 8 : status === 'half-day' ? 4 : 0;
    const saveOt = status === 'absent' ? 0 : otHours === '' ? 0 : otHours;

    if (current) {
      await supabase
        .from('attendance')
        .update({ status, hours_worked: hours, overtime_hours: saveOt })
        .eq('id', current.id);
    } else {
      await supabase.from('attendance').insert([
        {
          employee_id: empId,
          date: dateStr,
          status,
          hours_worked: hours,
          overtime_hours: saveOt,
        },
      ]);
    }
    if (addToast) {
      let msg = '';
      if (status === 'present') msg = '1 công';
      else if (status === 'half-day') msg = '½ công';
      else if (status === 'absent') msg = 'vắng (nghỉ)';

      addToast(
        `Đã chấm ${msg} ngày ${day}/${selectedMonth}`,
        status === 'absent' ? 'warning' : 'success',
      );
    }
    fetchData();
  };

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [bulkDateFrom, setBulkDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [bulkDateTo, setBulkDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [bulkStatus, setBulkStatus] = useState('present');
  // Per-employee per-day TC: { 'empId': { 'YYYY-MM-DD': number } }
  const [bulkEmpDayTC, setBulkEmpDayTC] = useState<Record<string, Record<string, number>>>({});

  const setBulkTC = (empId: string, date: string, val: number) => {
    setBulkEmpDayTC((prev) => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [date]: val },
    }));
  };

  const getBulkTC = (empId: string, date: string) => bulkEmpDayTC[empId]?.[date] ?? 0;

  // Generate list of dates in range
  const getBulkDays = () => {
    const result: string[] = [];
    if (!bulkDateFrom || !bulkDateTo || bulkDateFrom > bulkDateTo) return result;
    const cur = new Date(bulkDateFrom);
    const end = new Date(bulkDateTo);
    while (cur <= end) {
      result.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  };

  const openBulkModal = () => {
    setSelectedEmployees([]);
    const today = new Date().toISOString().split('T')[0];
    setBulkDateFrom(today);
    setBulkDateTo(today);
    setBulkStatus('present');
    setBulkEmpDayTC({});
    setShowBulkModal(true);
  };

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, label: '' });
  const [showConfirmBulk, setShowConfirmBulk] = useState(false);

  const handleStartSaveBulk = () => {
    if (selectedEmployees.length === 0) {
      if (addToast) addToast('Vui lòng chọn ít nhất một nhân viên', 'error');
      return;
    }
    const days = getBulkDays();
    if (days.length === 0) {
      if (addToast) addToast('Khoảng ngày không hợp lệ', 'error');
      return;
    }
    setShowConfirmBulk(true);
  };

  const confirmAndSaveBulk = async () => {
    setShowConfirmBulk(false);
    setBulkLoading(true);
    const days = getBulkDays();
    const hours = bulkStatus === 'present' ? 8 : bulkStatus === 'half-day' ? 4 : 0;
    const totalOps = selectedEmployees.length * days.length;
    let done = 0;
    let isError = false;

    try {
      for (const empId of selectedEmployees) {
        const emp = employees.find((e) => e.id === empId);
        for (const dateStr of days) {
          done++;
          setBulkProgress({
            current: done,
            total: totalOps,
            label: `${emp?.full_name || ''} - ${dateStr}`,
          });
          const tc = getBulkTC(empId, dateStr);

          await supabase.from('attendance').delete().eq('employee_id', empId).eq('date', dateStr);

          const { error } = await supabase.from('attendance').insert([
            {
              employee_id: empId,
              date: dateStr,
              status: bulkStatus,
              hours_worked: hours,
              overtime_hours: tc,
            },
          ]);

          if (error) {
            isError = true;
            if (addToast)
              addToast(`Lỗi: ${emp?.full_name} - ${dateStr}: ${error.message}`, 'error');
            break;
          }
        }
        if (isError) break;
      }

      if (!isError) {
        if (addToast)
          addToast(
            `Đã chấm công ${days.length} ngày cho ${selectedEmployees.length} nhân viên!`,
            'success',
          );
        setShowBulkModal(false);
      }
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setBulkLoading(false);
      setBulkProgress({ current: 0, total: 0, label: '' });
      fetchData();
    }
  };

  // Legacy - keep for compatibility
  const [employeeSettings, setEmployeeSettings] = useState<
    Record<string, { status: string; overtime: number }>
  >({});

  const updateIndividualSetting = (empId: string, field: 'status' | 'overtime', value: any) => {
    setEmployeeSettings((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  };

  const applyGlobalToSelection = () => {
    // no-op for now
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAtt, setEditingAtt] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ status: 'present', overtime: 0 });

  const openEditModal = (empId: string, day: number) => {
    const isAdmin = ['admin', 'develop'].includes(user.role?.toLowerCase() || '');
    if (!isAdmin) return;
    const att = getStatus(empId, day);
    const emp = employees.find((e) => e.id === empId);
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setEditingAtt({ empId, day, dateStr, id: att?.id, empName: emp?.full_name || 'Nhân viên' });
    setEditFormData({
      status: att?.status || 'present',
      overtime: att?.overtime_hours || 0,
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    const hours =
      editFormData.status === 'present' ? 8 : editFormData.status === 'half-day' ? 4 : 0;
    if (editingAtt.id) {
      await supabase
        .from('attendance')
        .update({
          status: editFormData.status,
          hours_worked: hours,
          overtime_hours: editFormData.overtime,
        })
        .eq('id', editingAtt.id);
    } else {
      await supabase.from('attendance').insert([
        {
          employee_id: editingAtt.empId,
          date: editingAtt.dateStr,
          status: editFormData.status,
          hours_worked: hours,
          overtime_hours: editFormData.overtime,
        },
      ]);
    }
    setShowEditModal(false);
    if (addToast) addToast('Đã cập nhật chấm công thành công!', 'success');
    else alert('Đã cập nhật chấm công thành công!');
    fetchData();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'X';
      case 'half-day':
        return '1/2';
      case 'absent':
        return 'V';
      default:
        return '';
    }
  };

  const filteredEmployees = employees
    .filter((e) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        (e.full_name || '').toLowerCase().includes(s) || (e.code || '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
      if (sortBy === 'newest') return (a.full_name || '').localeCompare(b.full_name || '');
      return 0;
    });

  const handleCaptureTable = useCallback(async () => {
    if (!tableRef.current) return;
    const subtitle = `Ngày: ${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
    const dataUrl = await captureElement(tableRef.current, {
      reportTitle: 'BẢNG CHẤM CÔNG',
      subtitle,
      fileName: `CDX_ChamCong_T${selectedMonth}_${selectedYear}.png`,
    });
    if (dataUrl) setPreviewImageUrl(dataUrl);
    else if (addToast) addToast('Lỗi khi tạo ảnh chấm công', 'error');
  }, [tableRef, selectedMonth, selectedYear, captureElement, addToast]);

  const handleExportExcel = useCallback(() => {
    const data: any[][] = [
      [
        'Mã NV',
        'Họ tên',
        ...Array.from(
          { length: new Date(selectedYear, selectedMonth, 0).getDate() },
          (_, i) => `${i + 1}`,
        ),
        'Tổng công',
      ],
    ];
    employees.forEach((emp) => {
      const row: any[] = [emp.code || emp.id.slice(0, 8), emp.full_name];
      let total = 0;
      const daysCount = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let d = 1; d <= daysCount; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const att = attendance.find((a) => a.employee_id === emp.id && a.date === dateStr);
        const val =
          att?.status === 'present'
            ? 1
            : att?.status === 'half-day'
              ? 0.5
              : att?.status === 'absent'
                ? 0
                : '';
        if (typeof val === 'number') total += val;
        row.push(val === '' ? '' : val);
      }
      row.push(total);
      data.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `ChamCong_T${selectedMonth}_${selectedYear}`);
    XLSX.writeFile(wb, `CDX_ChamCong_T${selectedMonth}_${selectedYear}.xlsx`);
  }, [employees, attendance, selectedMonth, selectedYear]);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PageBreadcrumb title="Chấm công" onBack={onBack} />
        {/* Toolbar: [Chấm công] [Lưu ảnh] [Excel] [Sắp xếp] [Lọc] */}
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0 justify-end ml-auto">
          {/* Nút Chấm công */}
          {user.role !== 'User' && (
            <Button
              size="sm"
              variant="primary"
              onClick={openBulkModal}
              className="flex items-center gap-1.5 flex-shrink min-w-0"
              title="Chấm công hàng loạt"
            >
              <Users size={14} className="flex-shrink-0" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                Chấm công
              </span>
            </Button>
          )}
          {/* Lưu ảnh */}
          <Button
            size="icon"
            variant="outline"
            onClick={handleCaptureTable}
            isLoading={isCapturingTable}
            title="Lưu ảnh bảng chấm công"
          >
            {!isCapturingTable && <Camera size={16} />}
          </Button>
          {/* Xuất Excel */}
          <Button size="icon" variant="outline" onClick={handleExportExcel} title="Xuất Excel">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="5" fill="#2D5A27" />
              <path
                d="M7.5 6L11 12l-3.5 6h3.5l1.5-3.5 1.5 3.5h3.5L14 12l3.5-6h-3.5L12.5 9.5 11 6z"
                fill="white"
              />
            </svg>
          </Button>
          {/* Sắp xếp */}
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_attendance_${user.id}`, val);
            }}
            options={[
              { value: 'code', label: 'Mã NV' },
              { value: 'newest', label: 'Tên A-Z' },
            ]}
          />
          {/* Lọc */}
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter((f) => !f)}
            title="Lọc"
          >
            <Search size={16} />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Bộ lọc</label>
                <button
                  onClick={() => {
                    setSearchTerm('');
                  }}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Đặt lại
                </button>
              </div>
              {/* Tháng/Năm */}
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">
                  Kỳ:
                </label>
                <MonthYearPicker
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onMonthChange={setSelectedMonth}
                  onYearChange={setSelectedYear}
                />
              </div>
              {/* Tìm kiếm */}
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm nhân viên..."
                  className="w-full pl-8 pr-8 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={tableRef}>
        <AttendanceTable
          employees={filteredEmployees}
          days={days}
          attendance={attendance}
          loading={loading}
          user={user}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onToggleAttendance={toggleAttendance}
          onOpenEditModal={openEditModal}
        />
      </div>

      {/* Edit Attendance Modal */}
      <AnimatePresence>
        {showEditModal && editingAtt && (
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden max-h-[90dvh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowEditModal(false)}
                  >
                    <CalendarCheck size={20} />
                  </div>
                  <h3 className="font-bold text-lg">
                    Ngày {editingAtt.day} - {editingAtt.empName}
                  </h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                    Trạng thái công
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setEditFormData({ ...editFormData, status: 'present' })}
                      className={`py-4 rounded-2xl text-sm font-bold border transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[52px] ${editFormData.status === 'present' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                    >
                      <Check size={18} /> ✓ 1 công
                    </button>
                    <button
                      onClick={() => setEditFormData({ ...editFormData, status: 'half-day' })}
                      className={`py-4 rounded-2xl text-sm font-bold border transition-all active:scale-95 ${editFormData.status === 'half-day' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                    >
                      ½ công
                    </button>
                    <button
                      onClick={() => setEditFormData({ ...editFormData, status: 'absent' })}
                      className={`py-4 rounded-2xl text-sm font-bold border transition-all active:scale-95 ${editFormData.status === 'absent' ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                    >
                      Vắng (Nghỉ)
                    </button>
                    <button
                      onClick={async () => {
                        if (editingAtt?.id) {
                          await supabase.from('attendance').delete().eq('id', editingAtt.id);
                          fetchData();
                        }
                        setShowEditModal(false);
                      }}
                      className="py-4 rounded-2xl text-sm font-bold bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 transition-all active:scale-95"
                    >
                      Xóa chấm công
                    </button>
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
                  <Button variant="outline" fullWidth onClick={() => setShowEditModal(false)}>
                    Hủy bỏ
                  </Button>
                  <Button variant="primary" fullWidth onClick={saveEdit}>
                    Cập nhật
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Bulk Attendance Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between flex-shrink-0 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowBulkModal(false)}
                  >
                    <Users size={24} />
                  </div>
                  <h3 className="font-bold text-lg">Chấm công hàng loạt</h3>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto space-y-6 custom-scrollbar">
                {/* Row 1: Date Range + Status */}
                <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={bulkDateFrom}
                      onChange={(e) => setBulkDateFrom(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={bulkDateTo}
                      min={bulkDateFrom}
                      onChange={(e) => setBulkDateTo(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Trạng thái
                    </label>
                    <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200">
                      {(['present', 'half-day', 'absent'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setBulkStatus(s)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            bulkStatus === s
                              ? 'bg-primary text-white'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {s === 'present' ? '1 Công' : s === 'half-day' ? '½ Công' : 'Vắng'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: Employee list + Per-day TC table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[380px]">
                  {/* Employee select */}
                  <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                        Chọn nhân sự ({selectedEmployees.length})
                      </label>
                      <button
                        onClick={() =>
                          setSelectedEmployees(
                            selectedEmployees.length === employees.length
                              ? []
                              : employees.map((e) => e.id),
                          )
                        }
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        {selectedEmployees.length === employees.length
                          ? 'Bỏ chọn hết'
                          : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                      {employees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() =>
                            setSelectedEmployees((prev) =>
                              prev.includes(emp.id)
                                ? prev.filter((id) => id !== emp.id)
                                : [...prev, emp.id],
                            )
                          }
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                            selectedEmployees.includes(emp.id)
                              ? 'bg-white border-primary shadow-sm'
                              : 'bg-white/50 border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              selectedEmployees.includes(emp.id)
                                ? 'bg-primary border-primary text-white'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            {selectedEmployees.includes(emp.id) && (
                              <Check size={12} strokeWidth={4} />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{emp.full_name}</p>
                            <p className="text-[9px] text-gray-400">{emp.code}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Per-employee per-day TC grid */}
                  <div className="bg-white rounded-3xl p-5 border border-gray-100 flex flex-col overflow-hidden">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                      TC Từng Ngày / Từng Người
                    </label>
                    {getBulkDays().length === 0 ? (
                      <div className="flex items-center justify-center flex-1 text-gray-300 italic text-xs">
                        Chọn khoảng ngày hợp lệ để xem
                      </div>
                    ) : getBulkDays().length > 31 ? (
                      <div className="flex items-center justify-center flex-1 text-red-400 italic text-xs">
                        Khoảng ngày quá lớn (tối đa 31 ngày)
                      </div>
                    ) : selectedEmployees.length === 0 ? (
                      <div className="flex items-center justify-center flex-1 text-gray-300 italic text-xs">
                        Chọn nhân sự ở cột bên trái
                      </div>
                    ) : (
                      <div className="overflow-y-auto flex-1 custom-scrollbar space-y-3">
                        {getBulkDays().map((d) => {
                          const dateObj = new Date(d);
                          const dayOfWeek = dateObj.toLocaleDateString('vi-VN', {
                            weekday: 'short',
                          });
                          const dayNum = dateObj.getDate();
                          return (
                            <div
                              key={d}
                              className="border border-gray-100 rounded-2xl overflow-hidden"
                            >
                              <div className="bg-gray-50 px-3 py-1.5 flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase">
                                  Ngày {dayNum}
                                </span>
                                <span className="text-[9px] text-gray-400">({dayOfWeek})</span>
                              </div>
                              <div className="divide-y divide-gray-50">
                                {selectedEmployees.map((empId) => {
                                  const emp = employees.find((e) => e.id === empId);
                                  return (
                                    <div
                                      key={empId}
                                      className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50/50"
                                    >
                                      <span className="text-xs text-gray-700 truncate max-w-[110px]">
                                        {emp?.full_name}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] text-gray-400">TC:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.5"
                                          value={getBulkTC(empId, d)}
                                          onChange={(e) =>
                                            setBulkTC(empId, d, parseFloat(e.target.value) || 0)
                                          }
                                          className="w-14 px-2 py-0.5 text-center text-sm font-bold text-amber-600 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary/20"
                                        />
                                        <span className="text-[10px] text-gray-400">h</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {bulkLoading && (
                  <div className="bg-primary/5 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between text-xs font-bold text-primary">
                      <span>Đang lưu...</span>
                      <span>
                        {bulkProgress.current}/{bulkProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 border border-primary/10">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{bulkProgress.label}</p>
                  </div>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  isLoading={bulkLoading}
                  onClick={handleStartSaveBulk}
                  className="shadow-lg shadow-primary/30"
                >
                  Lưu chấm công ({getBulkDays().length} ngày × {selectedEmployees.length} người)
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Bulk Attendance */}
      <AnimatePresence>
        {showConfirmBulk && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowConfirmBulk(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl max-w-sm w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-amber-500 text-white flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowConfirmBulk(false)}
                  >
                    <CalendarCheck size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Xác nhận</h3>
                </div>
                <button
                  onClick={() => setShowConfirmBulk(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-100 shadow-sm">
                  <CalendarCheck size={40} />
                </div>
                <p className="text-sm text-gray-500 leading-relaxed font-medium px-2">
                  Xác nhận chấm công cho{' '}
                  <span className="font-bold text-primary">{selectedEmployees.length}</span> nhân
                  viên
                  <br />
                  từ{' '}
                  <span className="font-bold text-gray-800">
                    {new Date(bulkDateFrom).toLocaleDateString('vi-VN')}
                  </span>{' '}
                  đến{' '}
                  <span className="font-bold text-gray-800">
                    {new Date(bulkDateTo).toLocaleDateString('vi-VN')}
                  </span>{' '}
                  ({getBulkDays().length} ngày)?
                </p>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" fullWidth onClick={() => setShowConfirmBulk(false)}>
                    Kiểm tra lại
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={confirmAndSaveBulk}
                    className="bg-amber-500 hover:bg-amber-600 border-amber-500 !shadow-amber-500/20"
                  >
                    Xác nhận
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview modal */}
      {previewImageUrl && (
        <ReportImagePreviewModal
          imageDataUrl={previewImageUrl}
          fileName={`CDX_ChamCong_T${selectedMonth}_${selectedYear}.png`}
          onClose={() => setPreviewImageUrl(null)}
        />
      )}
    </div>
  );
};
