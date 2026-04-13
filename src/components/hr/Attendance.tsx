import { useState, useEffect, useRef } from 'react';
import {
  CalendarCheck,
  Plus,
  X,
  Users,
  Check,
  RefreshCw,
  Search,
  Filter,
  Image as LucideImageIcon,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { ToastType } from '../shared/Toast';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { Button } from '../shared/Button';
import { SortButton, SortOption } from '../shared/SortButton';
import { ExcelButton } from '../shared/ExcelButton';
import { exportTableImage } from '../../utils/reportExport';
import { SaveImageButton } from '../shared/SaveImageButton';
import { ReportPreviewModal } from '../shared/ReportPreviewModal';

import { AttendanceTable } from './AttendanceTable';
import { FAB } from '../shared/FAB';
import { utils, writeFile } from 'xlsx';

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
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [hideZero, setHideZero] = useState(false);

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(lastDayOfMonth);

  const [isCapturingTable, setIsCapturingTable] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const logoBase64 = '/logo.png';
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, isCustomRange, startDate, endDate]);

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

      const fetchStartDate = isCustomRange
        ? startDate
        : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const fetchEndDate = isCustomRange
        ? endDate
        : new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      let attQuery = supabase
        .from('attendance')
        .select('*')
        .gte('date', fetchStartDate)
        .lte('date', fetchEndDate);

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

  const getDaysArray = () => {
    if (!isCustomRange) {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        return {
          day: d,
          dateStr: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        };
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const result = [];
    const current = new Date(start);
    while (current <= end) {
      result.push({
        day: current.getDate(),
        dateStr: current.toISOString().split('T')[0]
      });
      current.setDate(current.getDate() + 1);
    }
    return result;
  };

  const daysData = getDaysArray();
  const days = daysData.map(d => d.day);

  const getStatus = (empId: string, dateStr: string) => {
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
      // Search filter
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches = (e.full_name || '').toLowerCase().includes(s) ||
          (e.code || '').toLowerCase().includes(s);
        if (!matches) return false;
      }

      // Zero work days filter
      if (hideZero) {
        const hasAttendance = attendance.some(a => a.employee_id === e.id &&
          (a.status === 'present' || a.status === 'half-day'));
        if (!hasAttendance) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
      if (sortBy === 'newest') return (a.full_name || '').localeCompare(b.full_name || '');
      return 0;
    });

  const exportExcel = () => {
    try {
      if (attendance.length === 0) {
        if (addToast) addToast('Không có dữ liệu để xuất', 'warning');
        return;
      }

      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const exportData = filteredEmployees.map((emp) => {
        const row: any = {
          'Mã NV': emp.code,
          'Nhân viên': emp.full_name,
        };
        for (let d = 1; d <= daysInMonth; d++) {
          const status = getStatus(emp.id, `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
          row[d.toString()] = status ? (status.status === 'present' ? 'X' : status.status === 'half-day' ? '1/2' : 'V') : '';
        }
        return row;
      });

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Chấm công');
      writeFile(wb, `ChamCong_T${selectedMonth}_${selectedYear}.xlsx`);
      if (addToast) addToast('Xuất Excel thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi xuất Excel: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageBreadcrumb title="Chấm công" onBack={onBack} />
        <div className="flex items-center gap-1.5 justify-end flex-1">
          {user.role !== 'User' && (
            <Button
              onClick={openBulkModal}
              className="bg-[#05503b] hover:bg-[#044030] text-white border-none shadow-md flex items-center gap-2 px-3 sm:px-4 shrink-0 transition-all font-bold"
              icon={Users}
            >
              <span className="hidden sm:inline">Chấm công</span>
            </Button>
          )}

          <div className="flex items-center gap-1.5 ml-1">
            <ExcelButton onClick={exportExcel} />
            <SortButton
              currentSort={sortBy}
              onSortChange={(val) => {
                setSortBy(val);
                localStorage.setItem(`sort_pref_attendance_${user.id}`, val);
              }}
              options={[
                { value: 'code', label: 'Sắp xếp: Mã NV' },
                { value: 'newest', label: 'Sắp xếp: Tên A-Z' },
              ]}
            />
            <Button
              size="icon"
              variant={showFilter ? 'primary' : 'outline'}
              onClick={() => setShowFilter((f) => !f)}
              icon={Search}
              className={showFilter ? '' : 'border-gray-200'}
            />
            <SaveImageButton
              onClick={() => setShowReportPreview(true)}
              isCapturing={isCapturingTable}
              title="Lưu ảnh chấm công"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="z-20"
            style={{ overflow: showFilter ? 'visible' : 'hidden' }}
          >
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Chọn thời kỳ */}
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest text-center">Chọn thời kỳ</p>
                  <MonthYearPicker
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onMonthChange={setSelectedMonth}
                    onYearChange={setSelectedYear}
                  />
                </div>

                {/* 2. Tìm kiếm */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tìm kiếm nhân viên</label>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={16} />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Họ tên hoặc mã nhân viên..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>

                </div>

                {/* 3. Tùy chọn hiển thị */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tùy chọn hiển thị</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setHideZero(!hideZero)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${hideZero ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' : 'bg-white border-gray-100 text-gray-500'
                        }`}
                    >
                      <span className="text-xs font-bold uppercase">Ẩn công = 0</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${hideZero ? 'bg-amber-400' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${hideZero ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>

                    <button
                      onClick={() => setIsCustomRange(!isCustomRange)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${isCustomRange ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-gray-100 text-gray-500'
                        }`}
                    >
                      <span className="text-xs font-bold uppercase">Khoảng ngày tùy chỉnh</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${isCustomRange ? 'bg-blue-400' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isCustomRange ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Date Range Picker */}
              <AnimatePresence>
                {isCustomRange && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="pt-4 border-t border-dashed border-gray-100 mt-4"
                  >
                    <div className="flex items-center flex-wrap gap-4">
                      <div className="flex-1 min-w-[150px] space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Từ ngày</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                      <div className="flex-1 min-w-[150px] space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Đến ngày</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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

      {/* Hidden Ref for Report Capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={reportRef} className="p-8 bg-white" style={{ width: '1400px' }}>
          {/* Premium Branding Header */}
          <div className="flex items-center gap-6 mb-10">
            <img
              src={logoBase64}
              alt="Logo"
              className="w-24 h-24 rounded-3xl object-contain shadow-sm"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase leading-none">CDX - CON ĐƯỜNG XANH</h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Hệ thống quản lý kho và nhân sự</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black italic text-[#2D5A27] tracking-tighter mb-1">BẢNG CHẤM CÔNG</h1>
            <p className="text-sm font-bold text-gray-500 italic">
              Thượng tuần/Hạ tuần: Tháng {selectedMonth}/{selectedYear} • CDX-2026 Edition
            </p>
          </div>

          <AttendanceTable
            employees={filteredEmployees}
            days={days}
            attendance={attendance}
            loading={false}
            user={user}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onToggleAttendance={() => { }}
            onOpenEditModal={() => { }}
          />

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-end">
            <div className="text-[10px] text-gray-400 font-bold">
              Ngày xuất: {new Date().toLocaleDateString('vi-VN')} • {new Date().toLocaleTimeString('vi-VN')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-300 uppercase italic">CDX ERP SYSTEM</span>
              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
              <span className="text-[10px] font-bold text-gray-300 uppercase">Operational Excellence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Attendance Modal */}
      <AnimatePresence>
        {showEditModal && editingAtt && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-8 text-white flex items-center justify-between transition-colors">
                <div className="flex items-center gap-4">
                  <div
                    className="p-3 bg-white/20 rounded-2xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowEditModal(false)}
                  >
                    <CalendarCheck size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl">
                      NGÀY {editingAtt.day} - THÁNG {selectedMonth}
                    </h3>
                    <p className="text-white/70 font-bold uppercase tracking-widest text-sm mt-1">
                      {editingAtt.empName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={32} />
                </button>
              </div>
              <div className="p-10 space-y-10">
                <div className="space-y-6 text-center">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] block">
                    Chọn trạng thái công
                  </label>
                  <div className="grid grid-cols-3 gap-6">
                    <button
                      onClick={() => setEditFormData({ ...editFormData, status: 'present' })}
                      className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 transition-all active:scale-95 gap-3 ${editFormData.status === 'present' ? 'bg-green-500 text-white border-green-500 shadow-2xl shadow-green-200 ring-4 ring-green-100' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100 opacity-60'}`}
                    >
                      <span className="text-4xl font-black">X</span>
                      <span className="text-xs font-bold uppercase tracking-widest">1 công</span>
                    </button>
                    <button
                      onClick={() => setEditFormData({ ...editFormData, status: 'half-day' })}
                      className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 transition-all active:scale-95 gap-3 ${editFormData.status === 'half-day' ? 'bg-amber-500 text-white border-amber-500 shadow-2xl shadow-amber-200 ring-4 ring-amber-100' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100 opacity-60'}`}
                    >
                      <span className="text-4xl font-black">½</span>
                      <span className="text-xs font-bold uppercase tracking-widest">½ công</span>
                    </button>
                    <button
                      onClick={() => setEditFormData({ ...editFormData, status: 'absent' })}
                      className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 transition-all active:scale-95 gap-3 ${editFormData.status === 'absent' ? 'bg-red-500 text-white border-red-500 shadow-2xl shadow-red-200 ring-4 ring-red-100' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100 opacity-60'}`}
                    >
                      <span className="text-4xl font-black">V</span>
                      <span className="text-xs font-bold uppercase tracking-widest">Vắng</span>
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-inner space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Plus size={12} /> Giờ tăng ca (TC)
                    </label>
                    {editFormData.overtime > 0 && (
                      <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 animation-pulse">
                        +{editFormData.overtime}h
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editFormData.overtime}
                    onChange={(e) => setEditFormData({ ...editFormData, overtime: parseFloat(e.target.value) || 0 })}
                    placeholder="Nhập giờ TC..."
                    className="w-full bg-white px-8 py-5 rounded-[2rem] border-2 border-transparent focus:border-amber-500 text-center text-2xl font-black text-amber-600 outline-none transition-all placeholder:text-gray-200 shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="px-8 py-5 rounded-[2rem] text-sm font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95 uppercase tracking-widest"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-8 py-5 rounded-[2rem] text-sm font-black text-white bg-primary hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest"
                    >
                      CẬP NHẬT
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      if (editingAtt?.id) {
                        await supabase.from('attendance').delete().eq('id', editingAtt.id);
                        fetchData();
                      }
                      setShowEditModal(false);
                    }}
                    className="w-full px-8 py-5 rounded-[2rem] text-xs font-black text-red-400 border-2 border-red-50 hover:bg-red-50 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    XÓA CHẤM CÔNG
                  </button>
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
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${bulkStatus === s
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
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedEmployees.includes(emp.id)
                              ? 'bg-white border-primary shadow-sm'
                              : 'bg-white/50 border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedEmployees.includes(emp.id)
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
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden"
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
      {/* Removed FAB per user request to move to top */}
      <ReportPreviewModal
        isOpen={showReportPreview}
        onClose={() => setShowReportPreview(false)}
        title="Bảng chấm công tháng"
        isCapturing={isCapturingTable}
        onExport={() => {
          if (reportRef.current) {
            exportTableImage({
              element: reportRef.current,
              fileName: `Bang_Cham_Cong_T${selectedMonth}_${selectedYear}.png`,
              addToast,
              onStart: () => setIsCapturingTable(true),
              onEnd: () => {
                setIsCapturingTable(false);
                setShowReportPreview(false);
              },
            });
          }
        }}
      >
        <div className="p-12 bg-white">
          {/* Logo & Header */}
          <div className="flex items-center gap-6 mb-10">
            <img
              src={logoBase64}
              alt="Logo"
              className="w-24 h-24 rounded-3xl object-contain shadow-sm"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase leading-none">CDX - CON ĐƯỜNG XANH</h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Hệ thống quản lý kho và nhân sự</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black italic text-[#2D5A27] tracking-tighter mb-1 uppercase">BẢNG CHẤM CÔNG</h1>
            <p className="text-sm font-bold text-gray-500 italic uppercase">
              Kỳ chấm công: {isCustomRange ? `${startDate} - ${endDate}` : `Tháng ${selectedMonth}/${selectedYear}`} • CDX-2026 ERP
            </p>
          </div>

          {/* Table */}
          <AttendanceTable
            employees={filteredEmployees}
            days={days}
            attendance={attendance}
            loading={false}
            user={user}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onToggleAttendance={() => { }}
            onOpenEditModal={() => { }}
          />

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-end">
            <div className="text-[10px] text-gray-400 font-bold">
              Ngày xuất: {new Date().toLocaleDateString('vi-VN')} • {new Date().toLocaleTimeString('vi-VN')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-300 uppercase italic">CDX ERP SYSTEM</span>
              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
              <span className="text-[10px] font-bold text-gray-300 uppercase">Operational Excellence</span>
            </div>
          </div>
        </div>
      </ReportPreviewModal>
    </div>
  );
};
