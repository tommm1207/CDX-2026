import { useState, useEffect } from 'react';
import { Wallet, X, Eye, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { formatCurrency, formatDate } from '../../utils/format';

export const MonthlySalary = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
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

        const hourlyRate = Number(set.daily_rate || 0) / 8;
        const earnedSalary = totalDays * Number(set.daily_rate || 0);
        const otSalary = totalOT * hourlyRate;
        const netSalary = earnedSalary + otSalary + totalAll - totalAdv;

        return {
          ...emp,
          totalDays,
          totalOT,
          earnedSalary,
          otSalary,
          totalAdv,
          totalAll,
          netSalary,
          dailyRate: Number(set.daily_rate || 0),
          hourlyRate,
          attendanceDetails: empAtt,
          advancesDetails: empAdv,
          allowancesDetails: empAll
        };
      });

      setSalaries(calculated);
    } catch (err) {
      console.error('Error calculating salaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-3 py-1.5 rounded-xl border-none text-sm font-bold text-gray-700 outline-none">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-1.5 rounded-xl border-none text-sm font-bold text-gray-700 outline-none">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Nhân viên</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Công</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Tăng ca</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Lương công</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Phụ cấp</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Tạm ứng</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Thực lĩnh</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 italic">Đang tính toán...</td></tr>
            ) : (
              salaries.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-800">{s.full_name}</p>
                    <p className="text-[9px] text-gray-400">{s.code || s.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-gray-600">{s.totalDays.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-amber-600">{s.totalOT.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-600">{formatCurrency(s.earnedSalary + s.otSalary)}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-green-600">+{formatCurrency(s.totalAll)}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-red-600">-{formatCurrency(s.totalAdv)}</td>
                  <td className="px-4 py-3 text-right text-xs font-black text-primary">{formatCurrency(s.netSalary)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setSelectedSalary(s); setShowDetailModal(true); }}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showDetailModal && selectedSalary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Chi tiết lương cá nhân</h3>
                  <p className="text-xs text-gray-500">Tháng {selectedMonth} năm {selectedYear}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8">
                {/* Header Info */}
                <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black text-xl">
                    {selectedSalary.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-800">{selectedSalary.full_name}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Mã NV: {selectedSalary.code || selectedSalary.id.slice(0, 8)}</p>
                  </div>
                </div>

                {/* Calculation Table */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi tiết tính toán</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Lương ngày (8h)</span>
                      <span className="font-bold text-gray-800">{formatCurrency(selectedSalary.dailyRate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Lương giờ (Tăng ca)</span>
                      <span className="font-bold text-gray-800">{formatCurrency(selectedSalary.hourlyRate)}</span>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng công ({selectedSalary.totalDays.toFixed(1)} ngày)</span>
                      <span className="font-bold text-gray-800">{formatCurrency(selectedSalary.earnedSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng tăng ca ({selectedSalary.totalOT.toFixed(1)} giờ)</span>
                      <span className="font-bold text-amber-600">+{formatCurrency(selectedSalary.otSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng phụ cấp</span>
                      <span className="font-bold text-green-600">+{formatCurrency(selectedSalary.totalAll)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng tạm ứng</span>
                      <span className="font-bold text-red-600">-{formatCurrency(selectedSalary.totalAdv)}</span>
                    </div>
                    <div className="pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                      <span className="text-lg font-black text-gray-800 uppercase">Thực lĩnh</span>
                      <span className="text-2xl font-black text-primary">{formatCurrency(selectedSalary.netSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Notes */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[10px] text-amber-700 leading-relaxed italic">
                    * Bảng lương này được tính toán tự động dựa trên dữ liệu chấm công và các khoản phát sinh trong tháng.
                    Mọi thắc mắc vui lòng liên hệ bộ phận kế toán.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors">
                    <Printer size={18} /> In bảng lương
                  </button>
                  <button onClick={() => setShowDetailModal(false)} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">
                    Đóng
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
