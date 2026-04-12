import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Wallet, X, Eye, Printer, Download, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { formatCurrency, formatDate } from '@/utils/format';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { Button } from '../shared/Button';
import { ExcelButton } from '../shared/ExcelButton';
import { slugify, numberToVietnamese } from '@/utils/helpers';

export const MonthlySalary = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSalaries();
  }, [selectedMonth, selectedYear]);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const { data: employees } = await supabase
        .from('users')
        .select('*')
        .neq('status', 'Nghỉ việc')
        .neq('status', 'Đã xóa')
        .neq('role', 'Admin App')
        .eq('has_salary', true)
        .order('code');
      if (!employees) return;

      const { data: settings } = await supabase.from('salary_settings').select('*');

      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      const { data: att } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      const { data: adv } = await supabase
        .from('advances')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      const { data: all } = await supabase
        .from('allowances')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      const calculated = employees.map((emp) => {
        const set = settings
          ?.filter((s) => s.employee_id === emp.id)
          .sort((a, b) => new Date(b.valid_from || 0).getTime() - new Date(a.valid_from || 0).getTime())
          .find((s) => {
            const start = s.valid_from || '1900-01-01';
            const end = s.valid_to || '2099-12-31';
            const currentMonthDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-15`;
            return currentMonthDate >= start && currentMonthDate <= end;
          }) ||
          settings?.find((s) => s.employee_id === emp.id) || {
            base_salary: 0,
            daily_rate: 0,
            monthly_ot_coeff: 1.0,
          };

        const empAtt = att?.filter((a) => a.employee_id === emp.id) || [];
        const empAdv = adv?.filter((a) => a.employee_id === emp.id) || [];
        const empAll = all?.filter((a) => a.employee_id === emp.id) || [];

        const totalDays = empAtt.reduce((sum, a) => sum + Number(a.hours_worked || 0), 0) / 8;
        const totalOT = empAtt.reduce((sum, a) => sum + Number(a.overtime_hours || 0), 0);
        const totalAdv = empAdv.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const totalAll = empAll.reduce((sum, a) => sum + Number(a.amount || 0), 0);

        const insuranceDeduction = Number(set.insurance_deduction || 0);
        const monthlyCoeff = Number(set.monthly_ot_coeff || 1.0);

        const dailyRate = Number(set.daily_rate || 0);
        // OT ngày: tính theo giờ thực tế, đơn giá giờ gốc (không nhân thêm hệ số)
        const hourlyRate = dailyRate / 8;

        // Lương công: nhân hệ số OT tháng cho 8 tiếng chuẩn mỗi ngày đi làm
        const earnedSalary = totalDays * dailyRate;                        // Lương công gốc
        const monthOTSalary = totalDays * dailyRate * (monthlyCoeff - 1);   // TC tháng (phần thưởng từ hệ số)
        const dayOTSalary = totalOT * hourlyRate;                           // TC ngày (giờ thực tế)
        const netSalary = earnedSalary + monthOTSalary + dayOTSalary + totalAll - totalAdv - insuranceDeduction;

        return {
          ...emp,
          totalDays,
          totalOT,
          earnedSalary,
          monthOTSalary,
          dayOTSalary,
          totalAdv,
          totalAll,
          insuranceDeduction,
          netSalary,
          dailyRate,
          monthlyCoeff,
          hourlyRate,
          attendanceDetails: empAtt,
          advancesDetails: empAdv,
          allowancesDetails: empAll,
        };
      });

      setSalaries(calculated);
    } catch (err: any) {
      console.error('Error calculating salaries:', err);
      if (addToast) addToast('Lỗi tính toán lương: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customRange, setCustomRange] = useState({
    start: '',
    end: '',
  });
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showDetailModal && selectedSalary && isCustomRange) {
      recalculateIndividual();
    }
  }, [customRange, isCustomRange]);

  const recalculateIndividual = async () => {
    if (!selectedSalary || !customRange.start || !customRange.end) return;

    try {
      const { data: settings } = await supabase.from('salary_settings').select('*');
      const { data: att } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', selectedSalary.id)
        .gte('date', customRange.start)
        .lte('date', customRange.end);
      const { data: adv } = await supabase
        .from('advances')
        .select('*')
        .eq('employee_id', selectedSalary.id)
        .gte('date', customRange.start)
        .lte('date', customRange.end);
      const { data: all } = await supabase
        .from('allowances')
        .select('*')
        .eq('employee_id', selectedSalary.id)
        .gte('date', customRange.start)
        .lte('date', customRange.end);

      const set =
        settings?.find((s) => {
          if (s.employee_id !== selectedSalary.id) return false;
          const start = s.valid_from || '1900-01-01';
          const end = s.valid_to || '2099-12-31';
          return customRange.start >= start && customRange.start <= end;
        }) ||
        settings?.find((s) => s.employee_id === selectedSalary.id) ||
        {
          base_salary: 0,
          daily_rate: 0,
          monthly_ot_coeff: 1.0,
        };

      const totalDays = (att || []).reduce((sum, a) => sum + Number(a.hours_worked || 0), 0) / 8;
      const totalOT = (att || []).reduce((sum, a) => sum + Number(a.overtime_hours || 0), 0);
      const totalAdv = (adv || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const totalAll = (all || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);

      const insuranceDeduction = Number(set.insurance_deduction || 0);
      const monthlyCoeff = Number(set.monthly_ot_coeff || 1.0);
      const dailyRate = Number(set.daily_rate || 0);
      const hourlyRate = dailyRate / 8;

      const earnedSalary = totalDays * dailyRate;
      const monthOTSalary = totalDays * dailyRate * (monthlyCoeff - 1);
      const dayOTSalary = totalOT * hourlyRate;
      const netSalary = earnedSalary + monthOTSalary + dayOTSalary + totalAll - totalAdv - insuranceDeduction;

      setSelectedSalary({
        ...selectedSalary,
        totalDays,
        totalOT,
        earnedSalary,
        monthOTSalary,
        dayOTSalary,
        totalAdv,
        totalAll,
        insuranceDeduction,
        netSalary,
        dailyRate,
        monthlyCoeff,
        hourlyRate,
      });
    } catch (err) {
      console.error('Error recalculating:', err);
    }
  };

  const handleSaveImage = async () => {
    if (billRef.current === null) return;

    try {
      const dataUrl = await toPng(billRef.current, {
        cacheBust: true,
        backgroundColor: '#fff',
        quality: 1,
      });
      const link = document.createElement('a');
      link.download = `Phieu_Luong_${selectedSalary.full_name}_T${selectedMonth}_${selectedYear}.png`;
      link.href = dataUrl;
      link.click();
      if (addToast) addToast('Đã lưu ảnh phiếu lương thành công!', 'success');
    } catch (err) {
      console.error('Lỗi khi lưu ảnh:', err);
      if (addToast) addToast('Lỗi khi tạo ảnh phiếu lương', 'error');
    }
  };

  const totalDaysAll = salaries.reduce((sum, s) => sum + s.totalDays, 0);
  const totalOTAll = salaries.reduce((sum, s) => sum + s.totalOT, 0);
  const totalMonthOTAll = salaries.reduce((sum, s) => sum + s.monthOTSalary, 0);
  const earnedSalaryAll = salaries.reduce((sum, s) => sum + s.earnedSalary + s.dayOTSalary + s.monthOTSalary, 0);
  const totalAllAll = salaries.reduce((sum, s) => sum + s.totalAll, 0);
  const totalAdvAll = salaries.reduce((sum, s) => sum + s.totalAdv, 0);
  const insuranceDeductionAll = salaries.reduce((sum, s) => sum + s.insuranceDeduction, 0);
  const netSalaryAll = salaries.reduce((sum, s) => sum + s.netSalary, 0);

  const handleExportExcel = () => {
    const data = [
      [
        'Mã NV',
        'Họ tên',
        'Công',
        'TC Ngày (h)',
        'Lương/Ngày',
        'Hệ số',
        'TC Tháng',
        'Tổng Lương',
        'Phụ cấp',
        'Tạm ứng',
        'Bảo hiểm',
        'Thực lĩnh',
      ],
    ];

    salaries.forEach((s) => {
      data.push([
        s.code || s.id.slice(0, 8),
        s.full_name,
        Number(s.totalDays.toFixed(1)),
        `${s.totalOT.toFixed(1)}h`,
        s.dailyRate,
        s.monthlyCoeff,
        s.monthOTSalary,
        s.earnedSalary + s.monthOTSalary + s.dayOTSalary,
        s.totalAll,
        s.totalAdv,
        s.insuranceDeduction,
        s.netSalary,
      ]);
    });

    data.push([
      '',
      'TỔNG CỘNG',
      Number(totalDaysAll.toFixed(1)),
      `${totalOTAll.toFixed(1)}h`,
      '',
      '',
      salaries.reduce((sum, s) => sum + s.monthOTSalary, 0),
      salaries.reduce((sum, s) => sum + s.earnedSalary + s.dayOTSalary, 0),
      totalAllAll,
      totalAdvAll,
      insuranceDeductionAll,
      netSalaryAll,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Luong T${selectedMonth}-${selectedYear}`);
    XLSX.writeFile(wb, `Bang_Luong_Thang_${selectedMonth}_${selectedYear}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageBreadcrumb title="Bảng lương" onBack={onBack} />
        <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
          <MonthYearPicker
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
          <div className="flex items-center gap-2 justify-end flex-1">
            <ExcelButton onClick={handleExportExcel} loading={salaries.length === 0} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto custom-scrollbar pb-2">
        <table className="w-full text-left border-collapse min-w-[1100px] whitespace-nowrap">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                Mã bảng lương
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                Nhân viên
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">
                Công
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">
                TC h
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                Lương/Ngày
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                Hệ số
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                TC Tháng
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                TC Ngày
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                Lương Công
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                Phụ cấp
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                Tạm ứng
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                Bảo hiểm
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                Thực lĩnh
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 italic">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm">Đang tính toán...</p>
                  </div>
                </td>
              </tr>
            ) : salaries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 italic">
                  Không có dữ liệu bảng lương
                </td>
              </tr>
            ) : (
              salaries.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => {
                    setSelectedSalary(s);
                    const firstDay = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                    const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
                    setCustomRange({ start: firstDay, end: lastDay });
                    setIsCustomRange(false);
                    setShowDetailModal(true);
                  }}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 text-[10px] font-black text-primary uppercase shadow-inner italic inline-block">
                      SL-{slugify(s.full_name)}-{selectedMonth.toString().padStart(2, '0')}
                      {selectedYear.toString().slice(-2)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-800">{s.full_name}</p>
                    <p className="text-[9px] text-gray-400">{s.code || s.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-gray-600">
                    {s.totalDays.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-amber-600">
                    {s.totalOT.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-500 italic">
                    {formatCurrency(s.dailyRate)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-amber-600">
                    x{s.monthlyCoeff}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-black text-amber-600">
                    {formatCurrency(s.monthOTSalary)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-amber-600">
                    {formatCurrency(s.dayOTSalary)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-600">
                    {formatCurrency(s.earnedSalary + s.monthOTSalary + s.dayOTSalary)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-green-600">
                    +{formatCurrency(s.totalAll)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-red-600">
                    -{formatCurrency(s.totalAdv)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-red-600">
                    -{formatCurrency(s.insuranceDeduction)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-black text-primary">
                    {formatCurrency(s.netSalary)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && salaries.length > 0 && (
            <tfoot className="bg-gray-50/80 border-t-2 border-primary/20">
              <tr>
                <td className="px-4 py-4 text-xs font-black text-gray-800 uppercase" colSpan={2}>
                  Tổng cộng
                </td>
                <td className="px-4 py-4 text-center text-xs font-black text-gray-800">
                  {totalDaysAll.toFixed(1)}
                </td>
                <td className="px-4 py-4 text-center text-xs font-black text-amber-600">
                  {totalOTAll.toFixed(1)}h
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-gray-400">
                  -
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-gray-400">
                  -
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-amber-600">
                  {formatCurrency(salaries.reduce((sum, s) => sum + s.monthOTSalary, 0))}
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-amber-600">
                  {formatCurrency(salaries.reduce((sum, s) => sum + s.dayOTSalary, 0))}
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-gray-800">
                  {formatCurrency(salaries.reduce((sum, s) => sum + s.earnedSalary + s.monthOTSalary + s.dayOTSalary, 0))}
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-green-600">
                  +{formatCurrency(totalAllAll)}
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-red-600">
                  -{formatCurrency(totalAdvAll)}
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-red-600">
                  -{formatCurrency(insuranceDeductionAll)}
                </td>
                <td className="px-4 py-4 text-right text-base font-black text-primary">
                  {formatCurrency(netSalaryAll)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <AnimatePresence>
        {showDetailModal && selectedSalary && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden no-print"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-primary p-5 text-white flex items-center justify-between no-print">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => { setShowDetailModal(false); setIsCustomRange(false); }}
                  >
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">Phiếu lương — {selectedSalary.full_name}</h3>
                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">
                      {isCustomRange
                        ? `${customRange.start} → ${customRange.end}`
                        : `Tháng ${selectedMonth}/${selectedYear}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowDetailModal(false); setIsCustomRange(false); }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Custom date range controls */}
              <div className="px-5 pt-4 pb-2 no-print bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Khoảng ngày tính lương
                  </label>
                  <button
                    onClick={() => setIsCustomRange(!isCustomRange)}
                    className={`relative inline-flex items-center w-10 h-5 rounded-full transition-colors ${isCustomRange ? 'bg-primary' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform ${isCustomRange ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
                {isCustomRange && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">Từ ngày</label>
                      <input
                        type="date"
                        value={customRange.start}
                        onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">Đến ngày</label>
                      <input
                        type="date"
                        value={customRange.end}
                        onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bill table */}
              <div className="max-h-[55dvh] overflow-y-auto custom-scrollbar">
                <div ref={billRef} className="bg-white">
                  {/* Bill header for image */}
                  <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                    {/* Logo row */}
                    <div className="flex items-center gap-2 mb-3">
                      <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain rounded-lg flex-shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-gray-700 uppercase tracking-wider">CDX - CON ĐƯỜNG XANH</p>
                        <p className="text-[7px] text-gray-400 uppercase tracking-widest">Hệ thống quản lý kho và nhân sự</p>
                      </div>
                    </div>
                    {/* Title block */}
                    <h1 className="text-xl font-black text-primary uppercase tracking-tight leading-none">PHIẾU LƯƠNG</h1>
                    <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                      {isCustomRange
                        ? `${customRange.start} — ${customRange.end}`
                        : `Tháng ${selectedMonth}/${selectedYear}`}
                    </p>
                  </div>

                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      {/* Tên nhân viên */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium w-[48%]">Tên nhân viên:</td>
                        <td className="px-5 py-2.5 font-bold text-gray-900">{selectedSalary.full_name}</td>
                      </tr>
                      {/* Kỳ lương */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Kỳ lương:</td>
                        <td className="px-5 py-2.5 font-bold text-gray-900">
                          {isCustomRange
                            ? `từ ${customRange.start} → hết ${customRange.end}`
                            : `Tháng ${selectedMonth}/${selectedYear}`}
                        </td>
                      </tr>
                      {/* Giờ công */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Giờ công:</td>
                        <td className="px-5 py-2.5 text-gray-800">
                          {(selectedSalary.totalDays * 8).toFixed(0)} giờ{' '}
                          <span className="text-gray-400 text-xs">({selectedSalary.totalDays.toFixed(1)} Công)</span>
                        </td>
                      </tr>
                      {/* Tăng ca */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Tăng ca:</td>
                        <td className="px-5 py-2.5 text-gray-800">{selectedSalary.totalOT.toFixed(1)} giờ</td>
                      </tr>
                      {/* Lương cơ bản */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Lương cơ bản:</td>
                        <td className="px-5 py-2.5 text-gray-800">{formatCurrency(selectedSalary.earnedSalary)}</td>
                      </tr>
                      {/* Tiền tăng ca */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Tiền tăng ca:</td>
                        <td className="px-5 py-2.5 text-amber-600 font-medium">
                          {formatCurrency(selectedSalary.dayOTSalary + selectedSalary.monthOTSalary)}
                        </td>
                      </tr>
                      {/* Phụ cấp */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Phụ cấp:</td>
                        <td className="px-5 py-2.5 text-green-700 font-medium">{formatCurrency(selectedSalary.totalAll)}</td>
                      </tr>
                      {/* Thưởng */}
                      <tr className="border-b border-gray-200">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Thưởng:</td>
                        <td className="px-5 py-2.5 text-gray-800">0 đ</td>
                      </tr>
                      {/* TỔNG THU NHẬP */}
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <td className="px-5 py-3 font-black text-gray-900 uppercase text-xs tracking-wide">TỔNG THU NHẬP:</td>
                        <td className="px-5 py-3 font-black text-gray-900 text-sm">
                          {formatCurrency(selectedSalary.earnedSalary + selectedSalary.dayOTSalary + selectedSalary.monthOTSalary + selectedSalary.totalAll)}
                        </td>
                      </tr>
                      {/* Tạm ứng */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Tạm ứng:</td>
                        <td className="px-5 py-2.5 text-red-600 font-medium">{formatCurrency(selectedSalary.totalAdv)}</td>
                      </tr>
                      {/* Bảo hiểm */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Bảo hiểm:</td>
                        <td className="px-5 py-2.5 text-red-600 font-medium">{formatCurrency(selectedSalary.insuranceDeduction)}</td>
                      </tr>
                      {/* Giảm trừ */}
                      <tr className="border-b border-gray-200">
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Giảm trừ khác:</td>
                        <td className="px-5 py-2.5 text-gray-800">0 đ</td>
                      </tr>
                      {/* TỔNG GIẢM */}
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <td className="px-5 py-3 font-black text-gray-900 uppercase text-xs tracking-wide">TỔNG GIẢM:</td>
                        <td className="px-5 py-3 font-black text-red-600 text-sm">
                          {formatCurrency(selectedSalary.totalAdv + selectedSalary.insuranceDeduction)}
                        </td>
                      </tr>
                      {/* CÒN ĐƯỢC NHẬN */}
                      <tr className="border-b-2 border-primary/30 bg-primary/5">
                        <td className="px-5 py-3 font-black text-primary uppercase text-xs tracking-wide">CÒN ĐƯỢC NHẬN:</td>
                        <td className="px-5 py-3 font-black text-primary text-base">
                          {formatCurrency(selectedSalary.netSalary)}
                        </td>
                      </tr>
                      {/* Bằng chữ */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-2.5 text-gray-500 font-medium align-top">Bằng chữ:</td>
                        <td className="px-5 py-2.5 text-gray-600 italic text-xs leading-relaxed">
                          {numberToVietnamese(selectedSalary.netSalary)}
                        </td>
                      </tr>
                      {/* Ghi chú */}
                      <tr>
                        <td className="px-5 py-2.5 text-gray-500 font-medium">Ghi chú:</td>
                        <td className="px-5 py-2.5 text-gray-500 text-xs italic">
                          {isCustomRange
                            ? `${customRange.start} đến ${customRange.end}`
                            : `01/${selectedMonth}/${selectedYear} đến ${new Date(selectedYear, selectedMonth, 0).getDate()}/${selectedMonth}/${selectedYear}`}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex justify-between text-[8px] text-gray-300 font-bold uppercase tracking-widest px-5 py-3">
                    <span>CDX ERP SYSTEM © 2026</span>
                    <span>{new Date().toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 border-t border-gray-100 flex gap-3 no-print">
                <button
                  onClick={handleSaveImage}
                  className="flex-1 bg-gray-900 text-white font-black py-3 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 text-xs"
                >
                  <ImageIcon size={16} /> LƯU ẢNH
                </button>
                <button
                  onClick={() => { setShowDetailModal(false); setIsCustomRange(false); }}
                  className="flex-1 bg-primary/5 text-primary font-black py-3 rounded-xl hover:bg-primary/10 transition-all active:scale-95 border border-primary/10 text-xs"
                >
                  ĐÓNG
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

