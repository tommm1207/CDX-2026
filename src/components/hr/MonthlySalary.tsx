import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Wallet, X, Eye, Printer, Download, Image as ImageIcon, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import { exportTableImage } from '../../utils/reportExport';
import { SaveImageButton } from '../shared/SaveImageButton';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { formatCurrency, formatDate } from '@/utils/format';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { Button } from '../shared/Button';
import { ExcelButton } from '../shared/ExcelButton';
import { slugify, numberToVietnamese } from '@/utils/helpers';
import { SortButton, SortOption } from '../shared/SortButton';
import { ReportPreviewModal } from '../shared/ReportPreviewModal';

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
  const [isCapturingTable, setIsCapturingTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [hideZero, setHideZero] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_monthly_salary_${user.id}`) as SortOption) || 'newest',
  );
  const [showReportPreview, setShowReportPreview] = useState(false);
  
  const logoBase64 = '/logo.png';
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [showSlipPreview, setShowSlipPreview] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);
  
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(lastDayOfMonth);
  
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSalaries();
  }, [selectedMonth, selectedYear, isCustomRange, startDate, endDate]);

  const fetchSalaries = async () => {
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

      const { data: employees } = await query.order('code');
      if (!employees) return;

      const { data: settings } = await supabase.from('salary_settings').select('*');

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
      let advQuery = supabase
        .from('advances')
        .select('*')
        .gte('date', fetchStartDate)
        .lte('date', fetchEndDate);
      let allQuery = supabase
        .from('allowances')
        .select('*')
        .gte('date', fetchStartDate)
        .lte('date', fetchEndDate);

      if (!isAdmin) {
        attQuery = attQuery.eq('employee_id', user.id);
        advQuery = advQuery.eq('employee_id', user.id);
        allQuery = allQuery.eq('employee_id', user.id);
      }

      const { data: att } = await attQuery;
      const { data: adv } = await advQuery;
      const { data: all } = await allQuery;

      const calculated = employees.map((emp) => {
        const set = settings
          ?.filter((s) => s.employee_id === emp.id)
          .sort(
            (a, b) => new Date(b.valid_from || 0).getTime() - new Date(a.valid_from || 0).getTime(),
          )
          .find((s) => {
            const start = s.valid_from || '1900-01-01';
            const end = s.valid_to || '2099-12-31';
            // Use middle of range or specific date for setting lookup
            const checkDate = isCustomRange ? startDate : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-15`;
            return checkDate >= start && checkDate <= end;
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
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showDetailModal && selectedSalary && isCustomRange) {
      recalculateIndividual();
    }
  }, [startDate, endDate, isCustomRange]);

  const recalculateIndividual = async () => {
    if (!selectedSalary || !startDate || !endDate) return;

    try {
      const { data: settings } = await supabase.from('salary_settings').select('*');
      const { data: att } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', selectedSalary.id)
        .gte('date', startDate)
        .lte('date', endDate);
      const { data: adv } = await supabase
        .from('advances')
        .select('*')
        .eq('employee_id', selectedSalary.id)
        .gte('date', startDate)
        .lte('date', endDate);
      const { data: all } = await supabase
        .from('allowances')
        .select('*')
        .eq('employee_id', selectedSalary.id)
        .gte('date', startDate)
        .lte('date', endDate);

      const set = settings?.find((s) => {
        if (s.employee_id !== selectedSalary.id) return false;
        const start = s.valid_from || '1900-01-01';
        const end = s.valid_to || '2099-12-31';
        return startDate >= start && startDate <= end;
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

  const handleSaveImage = () => {
    if (billRef.current) {
      exportTableImage({
        element: billRef.current,
        fileName: `Phieu_Luong_${selectedSalary.full_name}_T${selectedMonth}_${selectedYear}.png`,
        addToast,
        onStart: () => setIsCapturingTable(true),
        onEnd: () => setIsCapturingTable(false),
      });
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
    xlsx.writeFile(wb, `Bang_Luong_Thang_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const filteredSalaries = salaries.filter(s => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const nameMatch = (s.full_name || '').toLowerCase().includes(term);
      const codeMatch = (s.code || '').toLowerCase().includes(term);
      const slugMatch = (slugify(s.full_name) || '').toLowerCase().includes(term);
      if (!nameMatch && !codeMatch && !slugMatch) return false;
    }
    
    // Zero value filter
    if (hideZero && s.netSalary === 0 && s.totalDays === 0) return false;
    
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageBreadcrumb title="Bảng lương" onBack={onBack} />
        <div className="flex flex-nowrap items-center gap-1.5 justify-end flex-1 whitespace-nowrap">
          <ExcelButton onClick={handleExportExcel} loading={salaries.length === 0} />
          
            <div className="flex items-center gap-1.5 ml-1">
              <SortButton
                currentSort={sortBy}
                onSortChange={(val) => setSortBy(val)}
                options={[
                  { value: 'newest', label: 'Sắp xếp: Mới nhất' },
                  { value: 'price', label: 'Sắp xếp: Thành tiền' },
                  { value: 'date', label: 'Sắp xếp: Ngày chi' },
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
                title="Lưu ảnh bảng lương" 
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
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4 space-y-5">
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tìm kiếm nhân viên</label>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={16} />
                      <input
                        id="monthly-salary-search"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nhập tên hoặc mã nhân viên..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Tùy chọn hiển thị */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tùy chọn hiển thị</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setHideZero(!hideZero)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                        hideZero ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-500'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">Ẩn thực lĩnh = 0</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${hideZero ? 'bg-amber-400' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hideZero ? 'left-4.5' : 'left-0.5'}`} />
                      </div>
                    </button>

                    <button
                      onClick={() => setIsCustomRange(!isCustomRange)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                        isCustomRange ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">Khoảng ngày tùy chỉnh</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${isCustomRange ? 'bg-blue-400' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isCustomRange ? 'left-4.5' : 'left-0.5'}`} />
                      </div>
                    </button>
                  </div>

                  {isCustomRange && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100"
                    >
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-blue-400 uppercase">Từ ngày</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-blue-200 text-xs outline-none bg-white font-mono"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-blue-400 uppercase">Đến ngày</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-blue-200 text-xs outline-none bg-white font-mono"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              filteredSalaries.map((s) => (
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
                    .bill-capture { font-family: 'Inter', system-ui, sans-serif !important; width: 380px !important; margin: 0 auto !important; background: #FCFCFC !important; position: relative !important; }
                    .bill-capture.is-capturing { border: none !important; box-shadow: none !important; overflow: visible !important; }
                    .bill-capture .font-bold { font-weight: 700 !important; }
                    .bill-capture .font-black { font-weight: 900 !important; }
                    .bill-capture .font-extrabold { font-weight: 800 !important; }
                    .bill-capture .italic { font-style: italic !important; }
                    .bill-capture .uppercase { text-transform: uppercase !important; }
                    .bill-capture .text-primary { color: #2D5A27 !important; }
                    .bill-capture .logo-img { width: 42px !important; height: 42px !important; border-radius: 10px !important; opacity: 1 !important; visibility: visible !important; display: block !important; background-color: transparent !important; transform: translateZ(0) !important; -webkit-transform: translateZ(0) !important; }
                    .bill-capture .main-title { color: #2D5A27 !important; font-weight: 900 !important; letter-spacing: -0.02em !important; text-shadow: none !important; }
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

                  <div className={`bill-capture ${isCapturing ? 'is-capturing' : ''}`}>
                    {/* Bill header for image */}
                    <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                      {/* Logo row */}
                      <div className="flex items-center gap-2 mb-3">
                        <img
                          src={logoBase64}
                          alt="Logo"
                          className="logo-img rounded-lg flex-shrink-0"
                          style={{ objectFit: 'contain' }}
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
                        className="text-xl uppercase leading-none main-title italic"
                        style={{
                          color: '#2D5A27',
                          fontWeight: 900,
                        }}
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
                      {/* Employee name row with Autofit logic */}
                      <div className="flex justify-between items-center mt-3 gap-2">
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                          Tên nhân viên:
                        </span>
                        <span
                          className="font-black text-gray-900 whitespace-nowrap text-right"
                          style={{
                            fontSize: selectedSalary.full_name?.length > 20 ? '13px' : '16px',
                            maxWidth: '220px',
                            overflow: 'hidden',
                          }}
                        >
                          {selectedSalary.full_name}
                        </span>
                      </div>
                    </div>

                    <div className="px-5 pb-6">
                      {/* Minimalist Bill List */}
                      <div className="border-t border-gray-100">
                        {/* Attendance rows */}
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Giờ công:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            {(selectedSalary.totalDays * 8).toFixed(0)} giờ (
                            {selectedSalary.totalDays.toFixed(1)} công)
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Tăng ca:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            {selectedSalary.totalOT.toFixed(1)} giờ
                          </span>
                        </div>

                        {/* Financial rows */}
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Lương cơ bản:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            {formatCurrency(selectedSalary.earnedSalary)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Tiền tăng ca:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            {formatCurrency(
                              selectedSalary.dayOTSalary + selectedSalary.monthOTSalary,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Phụ cấp:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            {formatCurrency(selectedSalary.totalAll)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Thưởng:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            0 đ
                          </span>
                        </div>

                        {/* Total Earnings */}
                        <div className="flex justify-between items-center py-3 border-b border-gray-100 gap-2 bg-gray-50/30 px-2 -mx-2">
                          <span className="text-[11px] font-black text-gray-900 uppercase tracking-wide whitespace-nowrap">
                            TỔNG THU NHẬP:
                          </span>
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
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Tạm ứng:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            -{formatCurrency(selectedSalary.totalAdv)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Bảo hiểm:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            -{formatCurrency(selectedSalary.insuranceDeduction)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Giảm trừ:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            0 đ
                          </span>
                        </div>

                        {/* Total Deductions */}
                        <div className="flex justify-between items-center py-3 border-b border-gray-100 gap-2 bg-gray-50/30 px-2 -mx-2">
                          <span className="text-[11px] font-black text-gray-900 uppercase tracking-wide whitespace-nowrap">
                            TỔNG GIẢM:
                          </span>
                          <span className="text-[11px] font-black text-gray-900 whitespace-nowrap">
                            -
                            {formatCurrency(
                              selectedSalary.totalAdv + selectedSalary.insuranceDeduction,
                            )}
                          </span>
                        </div>

                        {/* Net Pay (RENAMED) */}
                        <div className="flex justify-between items-center pt-4 pb-1 border-primary/20 bg-primary/5 px-2 -mx-2">
                          <span className="text-xs font-black text-primary uppercase tracking-wider whitespace-nowrap italic">
                            CÒN ĐƯỢC NHẬN:
                          </span>
                          <span className="text-sm font-black text-primary whitespace-nowrap">
                            {formatCurrency(selectedSalary.netSalary)}
                          </span>
                        </div>
                        <div className="bg-primary/5 px-2 -mx-2 pb-3 border-b-2 border-primary/20">
                          <p className="text-[8px] font-black text-gray-900/40 uppercase tracking-[0.2em] leading-none">
                            NET SALARY DETAILS
                          </p>
                        </div>

                        <div className="flex justify-between items-start py-4 border-b border-gray-100 gap-2">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter whitespace-nowrap mt-0.5">
                            Bằng chữ:
                          </span>
                          <span className="text-[11px] font-extrabold italic text-gray-700 leading-normal text-right pl-4">
                            {numberToVietnamese(selectedSalary.netSalary)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2.5 gap-2">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                            Ghi chú:
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                            {isCustomRange
                              ? `${customRange.start} — ${customRange.end}`
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
                                  return `Tháng ${selectedMonth}/${selectedYear}${range}`;
                                })()}
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-3 flex justify-between items-center whitespace-nowrap">
                        <div className="flex items-center gap-1.5 opacity-30 flex-shrink-0">
                          <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                            CDX ERP System
                          </span>
                        </div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-30 flex-shrink-0">
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
      {/* Preview Modal removed in favor of direct share */}

      {/* Hidden Ref for Report Capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={reportRef} className="p-10 bg-white" style={{ width: '1400px' }}>
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
            <h1 className="text-3xl font-black italic text-[#2D5A27] tracking-tighter mb-1">BẢNG TÍNH LƯƠNG</h1>
            <p className="text-sm font-bold text-gray-500 italic">
              Kỳ lương: Tháng {selectedMonth}/{selectedYear} {isCustomRange ? `(${formatDate(startDate)} - ${formatDate(endDate)})` : ''}
            </p>
          </div>

          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Mã bảng lương</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Nhân viên</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Công</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Tăng ca</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Lương cơ bản</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">PC Lương</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Lương TC</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Thu nhập</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Phụ cấp</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Tạm ứng</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right text-red-100">BHXH</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Thực lĩnh</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalaries.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-mono font-bold text-gray-400">
                    {s.code || s.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-extrabold text-gray-800">{s.full_name}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-600 text-center">
                    {Number(s.totalDays.toFixed(1))}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-600 text-center">
                    {s.totalOT.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-700 text-right">
                    {formatCurrency(s.dailyRate)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-700 text-right">
                    {formatCurrency(s.monthlyCoeff)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-700 text-right">
                    {formatCurrency(s.monthOTSalary)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-blue-600 text-right bg-blue-50/30">
                    {formatCurrency(s.earnedSalary + s.dayOTSalary + s.monthOTSalary)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-green-600 text-right">
                    {formatCurrency(s.totalAll)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-red-600 text-right">
                    {formatCurrency(s.totalAdv)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-400 text-right">
                    {formatCurrency(s.insuranceDeduction)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-black text-primary text-right bg-primary/5">
                    {formatCurrency(s.netSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
            {filteredSalaries.length > 0 && (
              <tfoot className="bg-primary/5 font-black border-t-2 border-primary/20">
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-xs uppercase tracking-widest italic">Tổng cộng hệ thống:</td>
                  <td className="px-4 py-4 text-center text-xs">
                    {filteredSalaries.reduce((sum, s) => sum + s.totalDays, 0).toFixed(1)}
                  </td>
                  <td className="px-4 py-4 text-center text-xs">
                    {filteredSalaries.reduce((sum, s) => sum + s.totalOT, 0).toFixed(1)}h
                  </td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-4 text-right text-xs text-blue-600">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.earnedSalary + s.dayOTSalary + s.monthOTSalary, 0))}
                  </td>
                  <td className="px-4 py-4 text-right text-xs text-green-600">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.totalAll, 0))}
                  </td>
                  <td className="px-4 py-4 text-right text-xs text-red-600">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.totalAdv, 0))}
                  </td>
                  <td className="px-4 py-4 text-right text-xs text-gray-400">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.insuranceDeduction, 0))}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-primary underline decoration-double">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.netSalary, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

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
      <ReportPreviewModal
        isOpen={showReportPreview}
        onClose={() => setShowReportPreview(false)}
        title="Bảng lương tháng"
        isCapturing={isCapturingTable}
        onExport={() => {
          if (reportRef.current) {
            exportTableImage({
              element: reportRef.current,
              fileName: `Bang_Luong_T${selectedMonth}_${selectedYear}.png`,
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
            <h1 className="text-3xl font-black italic text-[#2D5A27] tracking-tighter mb-1 uppercase">BẢNG TÍNH LƯƠNG</h1>
            <p className="text-sm font-bold text-gray-500 italic uppercase">
              Kỳ lương: {isCustomRange ? `${startDate} - ${endDate}` : `Tháng ${selectedMonth}/${selectedYear}`} • CDX-2026 Edition
            </p>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Mã bảng lương</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Nhân viên</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Công</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Tăng ca</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Lương cơ bản</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">PC Lương</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Lương TC</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Thu nhập</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Phụ cấp</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Tạm ứng</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right text-red-100">BHXH</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Thực lĩnh</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalaries.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-mono font-bold text-gray-400">
                    {s.code || s.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-extrabold text-gray-800">{s.full_name}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-600 text-center">
                    {Number(s.totalDays.toFixed(1))}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-600 text-center">
                    {s.totalOT.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-700 text-right">
                    {formatCurrency(s.dailyRate)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-700 text-right">
                    {formatCurrency(s.monthlyCoeff)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-700 text-right">
                    {formatCurrency(s.monthOTSalary)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-blue-600 text-right bg-blue-50/30">
                    {formatCurrency(s.earnedSalary + s.dayOTSalary + s.monthOTSalary)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-green-600 text-right">
                    {formatCurrency(s.totalAll)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-red-600 text-right">
                    {formatCurrency(s.totalAdv)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-400 text-right">
                    {formatCurrency(s.insuranceDeduction)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-black text-primary text-right bg-primary/5">
                    {formatCurrency(s.netSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
            {filteredSalaries.length > 0 && (
              <tfoot className="bg-primary/5 font-black border-t-2 border-primary/20">
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-xs uppercase tracking-widest italic">Tổng cộng hệ thống:</td>
                  <td className="px-4 py-4 text-center text-xs">
                    {filteredSalaries.reduce((sum, s) => sum + s.totalDays, 0).toFixed(1)}
                  </td>
                  <td className="px-4 py-4 text-center text-xs">
                    {filteredSalaries.reduce((sum, s) => sum + s.totalOT, 0).toFixed(1)}h
                  </td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-4 text-right text-xs text-blue-600">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.earnedSalary + s.dayOTSalary + s.monthOTSalary, 0))}
                  </td>
                  <td className="px-4 py-4 text-right text-xs text-green-600">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.totalAll, 0))}
                  </td>
                  <td className="px-4 py-4 text-right text-xs text-red-600">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.totalAdv, 0))}
                  </td>
                  <td className="px-4 py-4 text-right text-xs text-gray-400">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.insuranceDeduction, 0))}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-primary underline decoration-double">
                    {formatCurrency(filteredSalaries.reduce((sum, s) => sum + s.netSalary, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

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

      {/* Individual Salary Slip (Pay Stub) Preview */}
      <ReportPreviewModal
        isOpen={showSlipPreview}
        onClose={() => setShowSlipPreview(false)}
        title={`Phiếu lương: ${selectedSlip?.full_name}`}
        isCapturing={isCapturingTable}
        onExport={() => {
          if (slipRef.current) {
            exportTableImage({
              element: slipRef.current,
              fileName: `Phieu_Luong_${slugify(selectedSlip?.full_name || '')}_T${selectedMonth}_${selectedYear}.png`,
              addToast,
              onStart: () => setIsCapturingTable(true),
              onEnd: () => {
                setIsCapturingTable(false);
                setShowSlipPreview(false);
              },
            });
          }
        }}
      >
        <div ref={slipRef} className="p-16 bg-white w-[800px] mx-auto flex flex-col font-sans text-gray-900 border border-gray-100 shadow-sm relative overflow-hidden">
          {/* Header Branding */}
          <div className="flex items-start gap-4 mb-8">
            <img 
              src={logoBase64} 
              alt="Logo" 
              className="w-16 h-16 rounded-2xl object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')} 
            />
            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase leading-none">CDX - CON ĐƯỜNG XANH</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Hệ thống quản lý kho và nhân sự</p>
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-5xl font-black italic text-[#05503b] tracking-tighter mb-2 uppercase">BẢNG TÍNH LƯƠNG</h1>
            <p className="text-lg font-bold text-gray-500">
              Kỳ lương: Tháng {selectedMonth}/{selectedYear} {isCustomRange ? `(${new Date(startDate).getDate()}/${new Date(startDate).getMonth()+1} - ${new Date(endDate).getDate()}/${new Date(endDate).getMonth()+1})` : ''}
            </p>
          </div>

          {/* Employee Info Row */}
          <div className="flex justify-between items-baseline mb-12 border-b border-gray-50 pb-6">
             <p className="text-xl font-medium text-gray-500">Tên nhân viên:</p>
             <p className="text-4xl font-black text-gray-900 tracking-tight">{selectedSlip?.full_name}</p>
          </div>

          {/* Detailed Breakdown - Match Image exactly */}
          <div className="flex-1 space-y-0 border-t border-gray-100">
             <BillRow label="Giờ công:" value={`${selectedSlip?.totalOT?.toFixed(1)} giờ (${selectedSlip?.totalDays?.toFixed(1)} công)`} />
             <BillRow label="Tăng ca:" value={`${selectedSlip?.totalOT?.toFixed(1)} giờ`} />
             <div className="h-4" /> {/* Spacer */}
             <BillRow label="Lương cơ bản:" value={formatCurrency(selectedSlip?.earnedSalary)} />
             <BillRow label="Tiền tăng ca:" value={formatCurrency(selectedSlip?.dayOTSalary)} />
             <BillRow label="Phụ cấp:" value={formatCurrency(selectedSlip?.totalAll)} />
             <BillRow label="Thưởng:" value="0 đ" />
             
             <div className="flex justify-between items-center py-6 border-b border-gray-100 group transition-colors">
                <p className="text-2xl font-black text-gray-900 uppercase tracking-tight">TỔNG THU NHẬP:</p>
                <p className="text-2xl font-black text-gray-900 tabular-nums">
                   {formatCurrency(selectedSlip?.earnedSalary + selectedSlip?.monthOTSalary + selectedSlip?.dayOTSalary + selectedSlip?.totalAll)}
                </p>
             </div>

             <div className="h-4" />
             <BillRow label="Tạm ứng:" value={'- ' + formatCurrency(selectedSlip?.totalAdv)} />
             <BillRow label="Bảo hiểm:" value={'- ' + formatCurrency(selectedSlip?.insuranceDeduction)} />
             <BillRow label="Giảm trừ:" value="0 đ" />

             <div className="flex justify-between items-center py-6 border-b border-gray-100 group transition-colors mb-8">
                <p className="text-2xl font-black text-gray-900 uppercase tracking-tight">TỔNG GIẢM:</p>
                <p className="text-2xl font-black text-gray-900 tabular-nums">
                   {'- ' + formatCurrency(selectedSlip?.totalAdv + selectedSlip?.insuranceDeduction)}
                </p>
             </div>
          </div>

          {/* NET PAY SUMMARY - GREEN BOX */}
          <div className="mt-8 bg-[#f5f8f5] p-10 rounded-2xl flex justify-between items-center relative overflow-hidden ring-1 ring-[#e6eee6]">
             <div>
                <p className="text-2xl font-black text-[#05503b] uppercase tracking-tight mb-1">CÒN ĐƯỢC NHẬN:</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#05503b]/50">NET SALARY DETAILS</p>
             </div>
             <div className="text-right">
                <h2 className="text-5xl font-black tracking-tighter tabular-nums text-[#05503b]">
                   {formatCurrency(selectedSlip?.netSalary)}
                </h2>
             </div>
          </div>

          {/* Footer details */}
          <div className="mt-12 space-y-8">
             <div className="flex gap-4 items-baseline">
                <p className="text-lg font-bold text-gray-400 uppercase tracking-widest shrink-0">BẰNG CHỮ:</p>
                <p className="text-xl font-black text-gray-700 italic leading-snug">
                   {numberToVietnamese(selectedSlip?.netSalary || 0)}
                </p>
             </div>

             <div className="flex justify-between items-baseline">
                <p className="text-lg font-bold text-gray-500">Ghi chú:</p>
                <p className="text-lg font-black text-gray-700">Tháng {selectedMonth}/{selectedYear}</p>
             </div>
          </div>

          <div className="mt-20 pt-8 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">
             <div>CDX ERP SYSTEM</div>
             <div>{new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}</div>
          </div>

          {/* Logo watermark subtle */}
          <div className="absolute -bottom-10 -right-10 opacity-[0.03] select-none pointer-events-none transform rotate-12">
             <img src={logoBase64} alt="" className="w-64 h-64 object-contain" />
          </div>
        </div>
      </ReportPreviewModal>
    </div>
  );
};

const BillRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0 group transition-colors">
     <p className="text-xl font-bold text-gray-500 group-hover:text-gray-700 transition-colors uppercase tracking-tight">{label}</p>
     <p className="text-xl font-black text-gray-900 tabular-nums tracking-tight">{value}</p>
  </div>
);
