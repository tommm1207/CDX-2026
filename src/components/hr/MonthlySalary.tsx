import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Wallet, X, Eye, Printer, Download, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { logoBase64 } from '../../utils/logoBase64';
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
        .neq('role', 'Develop')
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
          .sort(
            (a, b) => new Date(b.valid_from || 0).getTime() - new Date(a.valid_from || 0).getTime(),
          )
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
        const earnedSalary = totalDays * dailyRate; // Lương công gốc
        const monthOTSalary = totalDays * dailyRate * (monthlyCoeff - 1); // TC tháng (phần thưởng từ hệ số)
        const dayOTSalary = totalOT * hourlyRate; // TC ngày (giờ thực tế)
        const netSalary =
          earnedSalary + monthOTSalary + dayOTSalary + totalAll - totalAdv - insuranceDeduction;

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

      const set = settings?.find((s) => {
        if (s.employee_id !== selectedSalary.id) return false;
        const start = s.valid_from || '1900-01-01';
        const end = s.valid_to || '2099-12-31';
        return customRange.start >= start && customRange.start <= end;
      }) ||
        settings?.find((s) => s.employee_id === selectedSalary.id) || {
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
      const netSalary =
        earnedSalary + monthOTSalary + dayOTSalary + totalAll - totalAdv - insuranceDeduction;

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
      // Add a small delay to ensure all micro-layouts and heavy images are fully rendered
      await new Promise(resolve => setTimeout(resolve, 200));

      const dataUrl = await toPng(billRef.current, {
        cacheBust: true,
        backgroundColor: '#fff',
        quality: 1,
        pixelRatio: 3, // Premium 3x resolution for saved images
        skipFonts: false,
        fontEmbedCSS: '', 
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
  const earnedSalaryAll = salaries.reduce(
    (sum, s) => sum + s.earnedSalary + s.dayOTSalary + s.monthOTSalary,
    0,
  );
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
                    const lastDay = new Date(selectedYear, selectedMonth, 0)
                      .toISOString()
                      .split('T')[0];
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
                <td className="px-4 py-4 text-right text-xs font-black text-gray-400">-</td>
                <td className="px-4 py-4 text-right text-xs font-black text-gray-400">-</td>
                <td className="px-4 py-4 text-right text-xs font-black text-amber-600">
                  {formatCurrency(salaries.reduce((sum, s) => sum + s.monthOTSalary, 0))}
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-amber-600">
                  {formatCurrency(salaries.reduce((sum, s) => sum + s.dayOTSalary, 0))}
                </td>
                <td className="px-4 py-4 text-right text-xs font-black text-gray-800">
                  {formatCurrency(
                    salaries.reduce(
                      (sum, s) => sum + s.earnedSalary + s.monthOTSalary + s.dayOTSalary,
                      0,
                    ),
                  )}
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
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] w-full max-w-lg overflow-hidden relative border border-white/40"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-white flex items-center justify-between no-print relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="flex items-center gap-4 relative z-10">
                  <div
                    className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-2xl cursor-pointer hover:bg-white/30 transition-all active:scale-90 shadow-lg border border-white/20"
                    onClick={() => {
                      setShowDetailModal(false);
                      setIsCustomRange(false);
                    }}
                  >
                    <Wallet size={24} className="text-white drop-shadow-sm" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg leading-tight tracking-tight">
                      Phiếu lương — {selectedSalary.full_name}
                    </h3>
                    <p className="text-[10px] text-white/80 font-black uppercase tracking-widest bg-black/10 px-2 py-0.5 rounded-full w-fit mt-1">
                      {isCustomRange
                        ? `${customRange.start} → ${customRange.end}`
                        : `THÁNG ${selectedMonth}/${selectedYear}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setIsCustomRange(false);
                  }}
                  className="p-2.5 hover:bg-white/20 rounded-2xl transition-all active:scale-95 text-white/80 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Custom date range controls */}
              <div className="px-5 pt-4 pb-2 no-print bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      KHOẢNG NGÀY TÍNH LƯƠNG
                    </label>
                  </div>
                  <button
                    onClick={() => setIsCustomRange(!isCustomRange)}
                    className={`relative inline-flex items-center w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${isCustomRange ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`inline-block w-4.5 h-4.5 bg-white rounded-full shadow-lg transform transition-transform duration-300 flex items-center justify-center ${isCustomRange ? 'translate-x-6.5' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
                {isCustomRange && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">
                        Từ ngày
                      </label>
                      <input
                        type="date"
                        value={customRange.start}
                        onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">
                        Đến ngày
                      </label>
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
                  {/* Explicit style block for perfect image capture consistency (fixes missing bold/italic/colors) */}
                  <style>{`
                    .bill-capture { font-family: 'Inter', system-ui, sans-serif !important; }
                    .bill-capture .font-bold { font-weight: 700 !important; }
                    .bill-capture .font-black { font-weight: 900 !important; }
                    .bill-capture .font-extrabold { font-weight: 800 !important; }
                    .bill-capture .italic { font-style: italic !important; }
                    .bill-capture .uppercase { text-transform: uppercase !important; }
                    .bill-capture .text-primary { color: #2D5A27 !important; }
                    .bill-capture .text-gray-400 { color: #9CA3AF !important; }
                    .bill-capture .text-gray-500 { color: #6B7280 !important; }
                    .bill-capture .text-gray-700 { color: #374151 !important; }
                    .bill-capture .text-gray-800 { color: #1F2937 !important; }
                    .bill-capture .text-gray-900 { color: #111827 !important; }
                    .bill-capture .bg-primary\\/5 { background-color: rgba(45, 90, 39, 0.05) !important; }
                    .bill-capture .bg-gray-50\\/30 { background-color: rgba(249, 250, 251, 0.3) !important; }
                    .bill-capture .border-gray-100 { border-color: #F3F4F6 !important; }
                    .bill-capture .border-primary\\/20 { border-color: rgba(45, 90, 39, 0.2) !important; }
                    .bill-capture .whitespace-nowrap { white-space: nowrap !important; }
                  `}</style>
                  
                  <div className="bill-capture">
                    {/* Bill header for image */}
                  <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                    {/* Logo row */}
                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src={logoBase64}
                        alt="Logo"
                        className="w-9 h-9 object-contain rounded-lg flex-shrink-0"
                      />
                      <div>
                        <p className="text-[9px] font-black text-gray-700 uppercase tracking-wider">
                          CDX - CON ĐƯỜNG XANH
                        </p>
                        <p className="text-[7px] text-gray-400 uppercase tracking-widest">
                          Hệ thống quản lý kho và nhân sự
                        </p>
                      </div>
                    </div>
                    {/* Title block */}
                    <h1 
                      className="text-xl font-black uppercase leading-none"
                      style={{ 
                        color: '#2D5A27', 
                        fontWeight: 900, 
                        letterSpacing: '-0.05em',
                        fontFamily: "'Inter', sans-serif" 
                      }} // Explicit styling for perfect image capture consistency
                    >
                      BẢNG TÍNH LƯƠNG
                    </h1>
                    <p className="text-[11px] font-bold text-gray-500 mt-0.5 whitespace-nowrap">
                      {isCustomRange
                        ? `Kỳ lương: ${customRange.start} — ${customRange.end}`
                        : (() => {
                            const dates = (selectedSalary.attendanceDetails || [])
                              .map((a: any) => a.date)
                              .filter(Boolean)
                              .sort();
                            const firstDate = dates[0];
                            const lastDate = dates[dates.length - 1];
                            const fmt = (d: string) => {
                              const [y, m, day] = d.split('-');
                              return `${parseInt(day)}/${parseInt(m)}`;
                            };
                            const range =
                              firstDate && lastDate
                                ? ` (${fmt(firstDate)} - ${fmt(lastDate)})`
                                : '';
                            return `Kỳ lương: Tháng ${selectedMonth}/${selectedYear}${range}`;
                          })()}
                    </p>
                    {/* Employee name row */}
                    <div className="flex justify-between items-center mt-3 gap-2">
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Tên nhân viên:</span>
                      <span className="text-base font-black text-gray-900 whitespace-nowrap">
                        {selectedSalary.full_name}
                      </span>
                    </div>
                  </div>

                  <div className="px-5 pb-6">
                    {/* Minimalist Bill List */}
                    <div className="border-t border-gray-100">
                      {/* Attendance rows */}
                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Giờ công:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                          {(selectedSalary.totalDays * 8).toFixed(0)} giờ ({selectedSalary.totalDays.toFixed(1)} công)
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Tăng ca:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                          {selectedSalary.totalOT.toFixed(1)} giờ
                        </span>
                      </div>

                      {/* Financial rows */}
                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Lương cơ bản:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                          {formatCurrency(selectedSalary.earnedSalary)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Tiền tăng ca:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                          {formatCurrency(selectedSalary.dayOTSalary + selectedSalary.monthOTSalary)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Phụ cấp:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                          {formatCurrency(selectedSalary.totalAll)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Thưởng:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">0 đ</span>
                      </div>

                      {/* Total Earnings */}
                      <div className="flex justify-between items-center py-3 border-b border-gray-100 gap-2 bg-gray-50/30 px-2 -mx-2">
                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-wide whitespace-nowrap">TỔNG THU NHẬP:</span>
                        <span className="text-[11px] font-black text-gray-900 whitespace-nowrap">
                          {formatCurrency(
                            selectedSalary.earnedSalary +
                              selectedSalary.dayOTSalary +
                              selectedSalary.monthOTSalary +
                              selectedSalary.totalAll,
                          )}
                        </span>
                      </div>

                      {/* Deductions rows */}
                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Tạm ứng:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                          -{formatCurrency(selectedSalary.totalAdv)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Bảo hiểm:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                          -{formatCurrency(selectedSalary.insuranceDeduction)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Giảm trừ:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">0 đ</span>
                      </div>

                      {/* Total Deductions */}
                      <div className="flex justify-between items-center py-3 border-b border-gray-100 gap-2 bg-gray-50/30 px-2 -mx-2">
                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-wide whitespace-nowrap">TỔNG GIẢM:</span>
                        <span className="text-[11px] font-black text-gray-900 whitespace-nowrap">
                          -{formatCurrency(selectedSalary.totalAdv + selectedSalary.insuranceDeduction)}
                        </span>
                      </div>

                      {/* Net Pay (RENAMED) */}
                      <div className="flex justify-between items-center py-4 border-b-2 border-primary/20 gap-2 bg-primary/5 px-2 -mx-2">
                        <span className="text-xs font-black text-primary uppercase tracking-wider whitespace-nowrap italic">CÒN ĐƯỢC NHẬN:</span>
                        <span className="text-sm font-black text-primary whitespace-nowrap">
                          {formatCurrency(selectedSalary.netSalary)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Bằng chữ:</span>
                        <span className="text-[11px] font-extrabold italic text-gray-700 leading-relaxed text-right">
                          {numberToVietnamese(selectedSalary.netSalary)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2.5 gap-2">
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Ghi chú:</span>
                        <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                          {isCustomRange ? `${customRange.start} đến ${customRange.end}` : `Tháng ${selectedMonth}/${selectedYear}`}
                        </span>
                      </div>
                    </div>


                    {/* Footer */}
                    <div className="pt-2 flex justify-between items-center">
                      <div className="flex items-center gap-1.5 opacity-30">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                          CDX ERP System
                        </span>
                      </div>
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-30">
                        {new Date().toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              {/* Actions */}
              <div className="p-6 bg-white border-t border-gray-100 flex gap-3 no-print">
                <button
                  onClick={handleSaveImage}
                  className="flex-1 bg-gray-900 text-white font-black py-3.5 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 text-[11px] uppercase tracking-wider"
                >
                  <ImageIcon size={18} /> LƯU ẢNH PHIẾU
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setIsCustomRange(false);
                  }}
                  className="px-6 bg-gray-100 text-gray-600 font-black py-3.5 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 text-[11px] uppercase tracking-wider"
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
