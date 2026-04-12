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
import { slugify } from '@/utils/helpers';

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
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between no-print transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => {
                      setShowDetailModal(false);
                      setIsCustomRange(false);
                    }}
                  >
                    <Wallet size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">Phiếu lương chi tiết</h3>
                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">
                      {isCustomRange
                        ? `${formatDate(customRange.start)} - ${formatDate(customRange.end)}`
                        : `Tháng ${selectedMonth}/${selectedYear}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setIsCustomRange(false);
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="max-h-[70dvh] overflow-y-auto overflow-x-hidden custom-scrollbar bg-gray-50/50">
                <div ref={billRef} className="bg-white mx-auto shadow-sm w-full max-w-[600px]">
                  <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                    {/* Professional Header for Image/Print */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-primary/10 pb-4 sm:pb-6 gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
                          <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                        <div className="flex-shrink-0">
                          <h2 className="text-xs sm:text-sm font-black text-gray-900 uppercase whitespace-nowrap">
                            CDX - CON ĐƯỜNG XANH
                          </h2>
                          <p className="text-[7px] sm:text-[8px] text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">
                            Hệ thống quản lý Kho và nhân sự
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end w-full sm:w-auto border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                          <h1 className="text-lg sm:text-xl font-black text-primary uppercase tracking-tighter whitespace-nowrap text-right">
                            PHIẾU LƯƠNG
                          </h1>
                          <p className="text-[10px] sm:text-xs text-gray-500 font-black tracking-widest whitespace-nowrap text-right">
                            {isCustomRange
                              ? `${formatDate(customRange.start)} — ${formatDate(customRange.end)}`
                              : `Tháng ${selectedMonth}/${selectedYear}`}
                          </p>
                        </div>
                    </div>

                    {/* Bill Content Header */}
                    <div className="flex items-center gap-6 py-4">
                      <div className="space-y-1">
                        <h4 className="text-2xl font-black text-gray-900 tracking-tight">
                          {selectedSalary.full_name}
                        </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            ID: {selectedSalary.code || selectedSalary.id.slice(0, 8)}
                          </span>
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            {selectedSalary.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-px bg-gray-100 relative">
                      <div className="absolute -left-10 -top-2 w-4 h-4 bg-gray-100 rounded-full no-print" />
                      <div className="absolute -right-10 -top-2 w-4 h-4 bg-gray-100 rounded-full no-print" />
                    </div>

                    {/* Calculation Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-3 bg-primary rounded-full" /> Chi phí cơ bản
                        </p>
                        <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-medium italic">
                              Đơn giá ngày công (8h)
                            </span>
                            <span className="font-bold text-gray-800">
                              {formatCurrency(selectedSalary.dailyRate)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-medium italic">
                              Đơn giá tăng ca (1h)
                            </span>
                            <span className="font-bold text-gray-800">
                              {formatCurrency(selectedSalary.hourlyRate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-3 bg-amber-500 rounded-full" /> Thu nhập & Khấu trừ
                        </p>
                        <div className="space-y-3 px-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 text-xs">
                              Lương ngày công ({selectedSalary.totalDays.toFixed(1)} ngày)
                            </span>
                            <span className="font-bold text-gray-800">
                              {formatCurrency(selectedSalary.earnedSalary)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 text-xs">
                              TC Ngày ({selectedSalary.totalOT.toFixed(1)} giờ)
                            </span>
                            <span className="font-bold text-amber-600">
                              +{formatCurrency(selectedSalary.dayOTSalary)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 text-xs">
                              TC Tháng (Hệ số x{selectedSalary.monthlyCoeff})
                            </span>
                            <span className="font-bold text-amber-600">
                              +{formatCurrency(selectedSalary.monthOTSalary)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 text-xs">Các khoản phụ cấp</span>
                            <span className="font-bold text-green-600">
                              +{formatCurrency(selectedSalary.totalAll)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 text-xs">Tạm ứng trong tháng</span>
                            <span className="font-bold text-red-500">
                              -{formatCurrency(selectedSalary.totalAdv)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 text-xs">Khấu trừ bảo hiểm</span>
                            <span className="font-bold text-red-500">
                              -{formatCurrency(selectedSalary.insuranceDeduction)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t-2 border-dashed border-gray-100 flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">
                          Tổng thực lĩnh
                        </p>
                        <h4 className="text-sm font-black text-gray-900 uppercase leading-none">
                          Net Salary Details
                        </h4>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-2xl sm:text-3xl font-black text-primary leading-none tracking-tighter whitespace-nowrap">
                          {formatCurrency(selectedSalary.netSalary)}
                        </span>
                        <p className="text-[8px] text-gray-400 font-bold mt-1 italic uppercase underline decoration-primary/30 underline-offset-4 whitespace-nowrap">
                          Đã bao gồm các khoản thuế phí
                        </p>
                      </div>
                    </div>

                    {/* Footer Notes */}
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                      <p className="text-[10px] text-gray-500 leading-relaxed text-center font-medium italic">
                        "Bảng lương này được tính toán tự động dựa trên dữ liệu chấm công thực tế."
                      </p>
                    </div>

                    <div className="flex justify-between text-[8px] text-gray-300 font-bold uppercase tracking-widest pt-4">
                      <span>CDX ERP SYSTEM © 2026</span>
                      <span>{new Date().toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex flex-col gap-4 no-print mt-2">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tùy chỉnh khoảng ngày</label>
                    <button
                      onClick={() => setIsCustomRange(!isCustomRange)}
                      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isCustomRange ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${isCustomRange ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                  
                  {isCustomRange && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-400 uppercase">Từ ngày</label>
                        <input
                          type="date"
                          value={customRange.start}
                          onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-400 uppercase">Đến ngày</label>
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

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveImage}
                    className="flex-1 bg-gray-900 text-white font-black py-3 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 text-xs"
                  >
                    <ImageIcon size={16} /> LƯU ẢNH
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setIsCustomRange(false);
                    }}
                    className="flex-1 bg-primary/5 text-primary font-black py-3 rounded-xl hover:bg-primary/10 transition-all active:scale-95 border border-primary/10 text-xs"
                  >
                    ĐÓNG
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
