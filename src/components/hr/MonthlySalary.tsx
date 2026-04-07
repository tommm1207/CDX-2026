import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Wallet, X, Eye, Printer, Download, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { formatCurrency, formatDate } from '../../utils/format';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { Button } from '../shared/Button';
import { ExcelButton } from '../shared/ExcelButton';

export const MonthlySalary = ({ user, onBack, addToast }: { 
  user: Employee, 
  onBack?: () => void,
  addToast?: (message: string, type?: ToastType) => void
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
      const { data: employees } = await supabase.from('users').select('*').neq('status', 'Nghỉ việc').neq('role', 'Admin App').eq('has_salary', true).order('code');
      if (!employees) return;

      const { data: settings } = await supabase.from('salary_settings').select('*');

      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      const { data: att } = await supabase.from('attendance').select('*').gte('date', startDate).lte('date', endDate);

      const { data: adv } = await supabase.from('advances').select('*').gte('date', startDate).lte('date', endDate);
      const { data: all } = await supabase.from('allowances').select('*').gte('date', startDate).lte('date', endDate);

      const calculated = employees.map(emp => {
        const set = settings?.find(s => s.employee_id === emp.id) || { base_salary: 0, daily_rate: 0 };
        const empAtt = att?.filter(a => a.employee_id === emp.id) || [];
        const empAdv = adv?.filter(a => a.employee_id === emp.id) || [];
        const empAll = all?.filter(a => a.employee_id === emp.id) || [];

        const totalDays = empAtt.reduce((sum, a) => sum + Number(a.hours_worked || 0), 0) / 8;
        const totalOT = empAtt.reduce((sum, a) => sum + Number(a.overtime_hours || 0), 0);
        const totalAdv = empAdv.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const totalAll = empAll.reduce((sum, a) => sum + Number(a.amount || 0), 0);

        const insuranceDeduction = Number(set.insurance_deduction || 0);

        const hourlyRate = Number(set.daily_rate || 0) / 8;
        const earnedSalary = totalDays * Number(set.daily_rate || 0);
        const otSalary = totalOT * hourlyRate;
        const netSalary = earnedSalary + otSalary + totalAll - totalAdv - insuranceDeduction;

        return {
          ...emp,
          totalDays,
          totalOT,
          earnedSalary,
          otSalary,
          totalAdv,
          totalAll,
          insuranceDeduction,
          netSalary,
          dailyRate: Number(set.daily_rate || 0),
          hourlyRate,
          attendanceDetails: empAtt,
          advancesDetails: empAdv,
          allowancesDetails: empAll
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
  const billRef = useRef<HTMLDivElement>(null);

  const handleSaveImage = async () => {
    if (billRef.current === null) return;
    
    try {
      const dataUrl = await toPng(billRef.current, { cacheBust: true, backgroundColor: '#fff', quality: 1 });
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
  const earnedSalaryAll = salaries.reduce((sum, s) => sum + s.earnedSalary + s.otSalary, 0);
  const totalAllAll = salaries.reduce((sum, s) => sum + s.totalAll, 0);
  const totalAdvAll = salaries.reduce((sum, s) => sum + s.totalAdv, 0);
  const insuranceDeductionAll = salaries.reduce((sum, s) => sum + s.insuranceDeduction, 0);
  const netSalaryAll = salaries.reduce((sum, s) => sum + s.netSalary, 0);

  const handleExportExcel = () => {
    const data = [
      ['Mã NV', 'Họ tên', 'Công', 'Tăng ca', 'Lương công', 'Phụ cấp', 'Tạm ứng', 'Bảo hiểm', 'Thực lĩnh']
    ];

    salaries.forEach(s => {
      data.push([
        s.code || s.id.slice(0, 8),
        s.full_name,
        Number(s.totalDays.toFixed(1)),
        `${s.totalOT.toFixed(1)}h`,
        s.earnedSalary + s.otSalary,
        s.totalAll,
        s.totalAdv,
        s.insuranceDeduction,
        s.netSalary
      ]);
    });

    data.push([
      '',
      'TỔNG CỘNG',
      Number(totalDaysAll.toFixed(1)),
      `${totalOTAll.toFixed(1)}h`,
      earnedSalaryAll,
      totalAllAll,
      totalAdvAll,
      insuranceDeductionAll,
      netSalaryAll
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Luong T${selectedMonth}-${selectedYear}`);
    XLSX.writeFile(wb, `Bang_Luong_Thang_${selectedMonth}_${selectedYear}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Tổng hợp lương" onBack={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="text-primary" /> Tổng hợp lương tháng
          </h2>
          <p className="text-xs text-gray-500 mt-1">Bảng lương chi tiết dựa trên công và các khoản phụ phí</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthYearPicker
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
          <ExcelButton onClick={handleExportExcel} loading={salaries.length === 0} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto custom-scrollbar pb-2">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Nhân viên</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Công</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Tăng ca</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Lương công</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Phụ cấp</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Tạm ứng</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Bảo hiểm</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Thực lĩnh</th>
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
                <tr key={s.id} onClick={() => { setSelectedSalary(s); setShowDetailModal(true); }} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-800">{s.full_name}</p>
                    <p className="text-[9px] text-gray-400">{s.code || s.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-gray-600">{s.totalDays.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-amber-600">{s.totalOT.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-600">{formatCurrency(s.earnedSalary + s.otSalary)}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-green-600">+{formatCurrency(s.totalAll)}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-red-600">-{formatCurrency(s.totalAdv)}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-red-600">-{formatCurrency(s.insuranceDeduction)}</td>
                  <td className="px-4 py-3 text-right text-xs font-black text-primary">{formatCurrency(s.netSalary)}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && salaries.length > 0 && (
            <tfoot className="bg-gray-50/80 border-t-2 border-primary/20">
              <tr>
                <td className="px-4 py-4 text-xs font-black text-gray-800 uppercase">Tổng cộng</td>
                <td className="px-4 py-4 text-center text-xs font-black text-gray-800">{totalDaysAll.toFixed(1)}</td>
                <td className="px-4 py-4 text-center text-xs font-black text-amber-600">{totalOTAll.toFixed(1)}h</td>
                <td className="px-4 py-4 text-right text-xs font-black text-gray-800">{formatCurrency(earnedSalaryAll)}</td>
                <td className="px-4 py-4 text-right text-xs font-black text-green-600">+{formatCurrency(totalAllAll)}</td>
                <td className="px-4 py-4 text-right text-xs font-black text-red-600">-{formatCurrency(totalAdvAll)}</td>
                <td className="px-4 py-4 text-right text-xs font-black text-red-600">-{formatCurrency(insuranceDeductionAll)}</td>
                <td className="px-4 py-4 text-right text-base font-black text-primary">{formatCurrency(netSalaryAll)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <AnimatePresence>
        {showDetailModal && selectedSalary && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto no-print"
            onClick={() => setShowDetailModal(false)}
          >
            <style>
              {`
                @media print {
                  .no-print { display: none !important; }
                  .print-only { display: block !important; }
                  body { background: white !important; margin: 0; padding: 0; }
                  @page { margin: 1cm; }
                }
              `}
            </style>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl my-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 pb-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-800">Phiếu lương chi tiết</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Tháng {selectedMonth} năm {selectedYear}</p>
                </div>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all no-print"
                >
                  <X size={20} />
                </button>
              </div>

              <div ref={billRef} className="p-8 space-y-8 bg-white rounded-[2.5rem] print-only">
                {/* Bill Header */}
                <div className="text-center space-y-4 pt-4">
                   <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary font-black text-2xl mx-auto shadow-sm">
                    {selectedSalary.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-gray-800">{selectedSalary.full_name}</h4>
                    <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em]">Mã nhân viên: {selectedSalary.code || selectedSalary.id.slice(0, 8)}</p>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-100 relative">
                  <div className="absolute -left-10 -top-2 w-4 h-4 bg-gray-100 rounded-full no-print" />
                  <div className="absolute -right-10 -top-2 w-4 h-4 bg-gray-100 rounded-full no-print" />
                </div>

                {/* Calculation Details */}
                <div className="space-y-6">
                  <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100/50 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Lương cơ bản (8h)</span>
                      <span className="font-black text-gray-800">{formatCurrency(selectedSalary.dailyRate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Lương tăng ca (1h)</span>
                      <span className="font-black text-gray-800">{formatCurrency(selectedSalary.hourlyRate)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 px-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium text-xs">Lương ngày công ({selectedSalary.totalDays.toFixed(1)} ngày)</span>
                      <span className="font-bold text-gray-800">{formatCurrency(selectedSalary.earnedSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium text-xs">Lương tăng ca ({selectedSalary.totalOT.toFixed(1)} giờ)</span>
                      <span className="font-bold text-amber-600">+{formatCurrency(selectedSalary.otSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium text-xs">Các khoản phụ cấp</span>
                      <span className="font-bold text-green-600">+{formatCurrency(selectedSalary.totalAll)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium text-xs">Tạm ứng trong tháng</span>
                      <span className="font-bold text-red-500">-{formatCurrency(selectedSalary.totalAdv)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium text-xs">Khấu trừ bảo hiểm</span>
                      <span className="font-bold text-red-500">-{formatCurrency(selectedSalary.insuranceDeduction)}</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t-4 border-double border-gray-100 flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Tổng thực lĩnh</p>
                      <h4 className="text-sm font-black text-gray-800 uppercase leading-none">Net Salary</h4>
                    </div>
                    <span className="text-3xl font-black text-primary leading-none tracking-tight">{formatCurrency(selectedSalary.netSalary)}</span>
                  </div>
                </div>

                {/* Footer Notes */}
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/30">
                  <p className="text-[9px] text-amber-700/80 leading-relaxed text-center font-medium italic">
                    * Bảng lương này được tính toán tự động dựa trên dữ liệu chấm công thực tế. 
                    Mọi thắc mắc vui lòng phản hồi bộ phận kế toán trước ngày 05 hàng tháng.
                  </p>
                </div>
              </div>

              <div className="p-8 pt-0 flex flex-col gap-3 no-print">
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveImage}
                    className="flex-1 bg-gray-900 text-white font-black py-3.5 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ImageIcon size={18} /> LƯU ẢNH
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 bg-white text-gray-700 border-2 border-gray-100 font-black py-3.5 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer size={18} /> IN PHIẾU
                  </button>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full bg-primary/5 text-primary font-black py-3.5 rounded-2xl hover:bg-primary/10 transition-all"
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
