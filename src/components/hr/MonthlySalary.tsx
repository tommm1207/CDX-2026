import { CanvasLogo } from '@/components/shared/ReportExportHeader';
import { useState, useEffect, useRef, useCallback } from 'react';

import { Wallet, X, Image as ImageIcon, Camera, Search } from 'lucide-react';
import { toPng } from 'html-to-image';
import { logoBase64 } from '../../utils/logoBase64';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { formatCurrency, formatNumber } from '@/utils/format';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { Button } from '../shared/Button';
import { SortOption } from '../shared/SortButton';
import { slugify, numberToVietnamese } from '@/utils/helpers';
import { ReportImagePreviewModal } from '../shared/ReportImagePreviewModal';
import {
  PageToolbar,
  FilterPanel,
  HideZeroToggle,
  FilterSearchInput,
  DateRangeFilter,
} from '../shared/PageToolbar';

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
  const [isCapturing, setIsCapturing] = useState(false);
  const [billScale, setBillScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [billNote, setBillNote] = useState('');
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customRange, setCustomRange] = useState({
    start: '',
    end: '',
  });

  // Auto-scale bill to fit container width (mainly for mobile)
  useEffect(() => {
    if (!showDetailModal) return;

    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const availableWidth = containerWidth - 32; // Increased padding for safer mobile display
        if (availableWidth < 380) {
          setBillScale(availableWidth / 380);
        } else {
          setBillScale(1);
        }
      }
    };

    // Small delay to ensure modal is fully rendered
    const timer = setTimeout(updateScale, 100);
    window.addEventListener('resize', updateScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScale);
    };
  }, [showDetailModal]);

  const [hideZero, setHideZero] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [isMainCustomRange, setIsMainCustomRange] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Refs
  const mainTableRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(d)}/${parseInt(m)}/${y}`;
  };

  useEffect(() => {
    fetchSalaries();
  }, [selectedMonth, selectedYear, isMainCustomRange, filterStartDate, filterEndDate]);

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

      let queryStart = '';
      let queryEnd = '';

      if (isMainCustomRange && filterStartDate && filterEndDate) {
        queryStart = filterStartDate;
        queryEnd = filterEndDate;
      } else {
        queryStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        queryEnd = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      }

      let attQuery = supabase
        .from('attendance')
        .select('*')
        .gte('date', queryStart)
        .lte('date', queryEnd);
      let advQuery = supabase
        .from('advances')
        .select('*')
        .gte('date', queryStart)
        .lte('date', queryEnd);
      let allQuery = supabase
        .from('allowances')
        .select('*')
        .gte('date', queryStart)
        .lte('date', queryEnd);

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

  useEffect(() => {
    if (showDetailModal && selectedSalary) {
      if (!billNote) {
        const firstDay = `01/${String(selectedMonth).padStart(2, '0')}`;
        const lastDay = `${new Date(selectedYear, selectedMonth, 0).getDate()}/${String(selectedMonth).padStart(2, '0')}`;
        const defaultNote = isCustomRange
          ? `Kỳ lương: ${formatDate(customRange.start)} — ${formatDate(customRange.end)}`
          : `Tháng ${selectedMonth}/${selectedYear} (${firstDay} - ${lastDay})`;
        setBillNote(defaultNote);
      }
    } else {
      setBillNote('');
    }
  }, [showDetailModal, selectedSalary, isCustomRange, customRange]);

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
      setIsCapturing(true);
      // Wait for React to finish updating the 'isCapturing' state
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Force logo decoding (especially on iOS) to prevent blank logo on capture
      const logoImg = billRef.current?.querySelector('img.logo-img');
      if (logoImg) {
        try {
          await (logoImg as HTMLImageElement).decode();
        } catch (e) {
          console.warn('[handleSaveImage] Logo decode failed, proceeding anyway:', e);
        }
      }

      // Final short wait to ensure everything is painted
      await new Promise((resolve) => setTimeout(resolve, 500));

      const fileName = `Phieu_Luong_${selectedSalary.full_name}_T${selectedMonth}_${selectedYear}.png`;
      const scale = 4; // High resolution for premium quality

      // Capture the bill - it might have a blank logo if Safari is being difficult
      const capturedDataUrl = await toPng(billRef.current, {
        cacheBust: true,
        backgroundColor: '#FCFCFC',
        quality: 1,
        pixelRatio: scale,
        skipFonts: false,
        style: {
          transform: 'scale(1)',
          WebkitTransform: 'scale(1)',
          margin: '0',
          padding: '0',
        },
      });

      // Step 2.5: MANUALLY INJECT THE LOGO (Bullet-proof fix for iOS/Safari)
      // This ensures the logo is NEVER missing or grayed out, even on the very first try.
      const { injectLogoToImage } = await import('@/utils/logoCompositor');
      const finalDataUrl = await injectLogoToImage(capturedDataUrl, {
        x: 20, // px-5 = 20px
        y: 20, // pt-5 = 20px
        size: 44, // size={44}
        pixelRatio: scale,
      });

      // Step 3: Share (Mobile) or Download (Desktop)
      if (navigator.share) {
        try {
          const res = await fetch(finalDataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Phiếu Lương',
              text: `Phiếu lương tháng ${selectedMonth}/${selectedYear} của ${selectedSalary.full_name}`,
            });
            addToast?.('Đã mở bảng chia sẻ!', 'success');
            return;
          }
        } catch (shareErr) {
          console.error('Share failed:', shareErr);
        }
      }

      // Traditional Download Fallback
      const link = document.createElement('a');
      link.download = fileName;
      link.href = finalDataUrl;
      link.click();
      addToast?.('Đã lưu ảnh phiếu lương thành công!', 'success');
    } catch (err) {
      console.error('Lỗi khi lưu ảnh:', err);
      addToast?.('Lỗi khi tạo ảnh phiếu lương', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  // --- Computed display data ---
  const displaySalaries = salaries
    .filter((s) => {
      if (hideZero && s.netSalary === 0) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return (
          (s.full_name || '').toLowerCase().includes(t) || (s.code || '').toLowerCase().includes(t)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.full_name || '').localeCompare(a.full_name || '');
      if (sortBy === 'price') return b.netSalary - a.netSalary;
      if (sortBy === 'date') return a.netSalary - b.netSalary;
      if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
      return 0;
    });

  const totalDaysAll = displaySalaries.reduce((sum, s) => sum + s.totalDays, 0);
  const totalOTAll = displaySalaries.reduce((sum, s) => sum + s.totalOT, 0);
  const totalMonthOTAll = displaySalaries.reduce((sum, s) => sum + s.monthOTSalary, 0);
  const earnedSalaryAll = displaySalaries.reduce(
    (sum, s) => sum + s.earnedSalary + s.dayOTSalary + s.monthOTSalary,
    0,
  );
  const totalAllAll = displaySalaries.reduce((sum, s) => sum + s.totalAll, 0);
  const totalAdvAll = displaySalaries.reduce((sum, s) => sum + s.totalAdv, 0);
  const insuranceDeductionAll = displaySalaries.reduce((sum, s) => sum + s.insuranceDeduction, 0);
  const netSalaryAll = displaySalaries.reduce((sum, s) => sum + s.netSalary, 0);

  // Excel always exports full data (not affected by hideZero)
  // Excel always exports full data (not affected by hideZero)
  const handleExportExcel = () => {
    const allTotal = {
      days: salaries.reduce((sum, s) => sum + s.totalDays, 0),
      ot: salaries.reduce((sum, s) => sum + s.totalOT, 0),
      monthOT: salaries.reduce((sum, s) => sum + s.monthOTSalary, 0),
      dayOT: salaries.reduce((sum, s) => sum + s.dayOTSalary, 0),
      earned: salaries.reduce(
        (sum, s) => sum + s.earnedSalary + s.monthOTSalary + s.dayOTSalary,
        0,
      ),
      all: salaries.reduce((sum, s) => sum + s.totalAll, 0),
      adv: salaries.reduce((sum, s) => sum + s.totalAdv, 0),
      ins: salaries.reduce((sum, s) => sum + s.insuranceDeduction, 0),
      net: salaries.reduce((sum, s) => sum + s.netSalary, 0),
    };
    import('@/utils/excelExport').then(({ exportToExcel }) => {
      exportToExcel({
        title: `Bảng Lương Tháng ${selectedMonth}/${selectedYear}`,
        sheetName: `Lương T${selectedMonth}-${selectedYear}`,
        columns: [
          'Mã NV',
          'Họ tên',
          'Công',
          'TC Ngày (h)',
          'Lương/Ngày',
          'Hệ số',
          'TC Tháng',
          'TC Ngày',
          'Lương Công',
          'Phụ cấp',
          'Tạm ứng',
          'Bảo hiểm',
          'Thực lĩnh',
        ],
        rows: [
          ...salaries.map((s) => [
            s.code || s.id.slice(0, 8),
            s.full_name,
            Number(s.totalDays.toFixed(1)),
            Number(s.totalOT.toFixed(1)),
            s.dailyRate,
            s.monthlyCoeff,
            s.monthOTSalary,
            s.dayOTSalary,
            s.earnedSalary + s.monthOTSalary + s.dayOTSalary,
            s.totalAll,
            s.totalAdv,
            s.insuranceDeduction,
            s.netSalary,
          ]),
          [
            '',
            'TỔNG CỘNG',
            Number(allTotal.days.toFixed(1)),
            Number(allTotal.ot.toFixed(1)),
            '',
            '',
            allTotal.monthOT,
            allTotal.dayOT,
            allTotal.earned,
            allTotal.all,
            allTotal.adv,
            allTotal.ins,
            allTotal.net,
          ],
        ],
        fileName: `CDX_BangLuong_T${selectedMonth}_${selectedYear}.xlsx`,
        addToast,
      });
    });
  };

  // Note: image capture handled by PageToolbar via captureOptions

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      {/* Header + Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <PageBreadcrumb title="Bảng lương" onBack={onBack} />
        <PageToolbar
          tableRef={mainTableRef}
          captureOptions={{
            reportTitle: 'BẢNG TÍNH LƯƠNG',
            subtitle:
              isMainCustomRange && filterStartDate && filterEndDate
                ? `Kỳ lương: ${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}`
                : `Kỳ lương: Tháng ${selectedMonth}/${selectedYear}`,
            showNetSalary: true,
          }}
          onImageCaptured={setPreviewImageUrl}
          onExportExcel={handleExportExcel}
          sortOptions={[
            { value: 'code', label: 'Mã NV (A→Z)' },
            { value: 'newest', label: 'Tên (A→Z)' },
            { value: 'price', label: 'Thực lĩnh (cao→thấp)' },
            { value: 'date', label: 'Thực lĩnh (thấp→cao)' },
          ]}
          currentSort={sortBy}
          onSortChange={(v) => setSortBy(v as SortOption)}
          showFilter={showFilter}
          onFilterToggle={() => setShowFilter((f) => !f)}
        />
      </div>

      <FilterPanel
        show={showFilter}
        onReset={() => {
          setSearchTerm('');
          setHideZero(false);
          setIsMainCustomRange(false);
          setFilterStartDate('');
          setFilterEndDate('');
          setSelectedMonth(new Date().getMonth() + 1);
          setSelectedYear(new Date().getFullYear());
        }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Khoảng ngày tùy chọn
          </label>
          <button
            onClick={() => setIsMainCustomRange(!isMainCustomRange)}
            className={`relative inline-flex items-center w-11 h-6 rounded-full transition-all duration-300 shadow-inner ${isMainCustomRange ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <span
              className={`inline-block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ml-1 ${isMainCustomRange ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {isMainCustomRange ? (
          <DateRangeFilter
            startDate={filterStartDate}
            endDate={filterEndDate}
            onStartChange={setFilterStartDate}
            onEndChange={setFilterEndDate}
          />
        ) : (
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">
              Kỳ lương:
            </label>
            <MonthYearPicker
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </div>
        )}
        <HideZeroToggle value={hideZero} onChange={setHideZero} label="Ẩn dòng thực lĩnh = 0" />
        <FilterSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Tìm theo tên, mã NV..."
        />
      </FilterPanel>

      <div
        ref={mainTableRef}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto custom-scrollbar pb-2"
      >
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
              displaySalaries.map((s) => (
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
          {!loading && displaySalaries.length > 0 && (
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
                <td className="px-4 py-4 text-right text-lg font-black text-primary">
                  <span className="underline decoration-double decoration-primary decoration-1 underline-offset-2">
                    {formatCurrency(netSalaryAll)}
                  </span>
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
                    <h3 className="font-extrabold text-[13px] xs:text-sm sm:text-lg leading-tight tracking-tight whitespace-nowrap">
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
              <div className="px-5 pb-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                  CÀI ĐẶT GHI CHÚ TRÊN PHIẾU
                </label>
                <textarea
                  value={billNote}
                  onChange={(e) => setBillNote(e.target.value)}
                  placeholder="Nhập ghi chú cho phiếu lương..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm transition-all resize-none"
                />
              </div>

              <div
                ref={containerRef}
                className="max-h-[55dvh] overflow-y-auto overflow-x-hidden custom-scrollbar bg-gray-100/30 flex flex-col items-center p-4 sm:p-6"
              >
                <div
                  style={{
                    width: '380px',
                    transform: `scale(${isCapturing ? 1 : billScale})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                  }}
                >
                  <div ref={billRef} className="bg-white shadow-sm">
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
                    .bill-capture .logo-img { width: 44px !important; height: 44px !important; opacity: 1 !important; display: block !important; background-color: #ffffff !important; transform: translateZ(0) !important; -webkit-transform: translateZ(0) !important; object-fit: contain !important; border-radius: 9px !important; }
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
                          <CanvasLogo
                            size={44}
                            className={`logo-img w-11 h-11 rounded-xl object-contain shadow-sm ${isCapturing ? 'invisible' : ''}`}
                          />
                          <div>
                            <p className="text-[9px] font-black text-gray-700 uppercase tracking-wider">
                              CON ĐƯỜNG XANH
                            </p>
                            <p className="text-[7px] text-gray-400 uppercase tracking-widest leading-tight">
                              CỘNG TÁC ĐỂ VƯƠN XA
                            </p>
                            <p className="text-[6.5px] text-gray-400 uppercase tracking-wider mt-0.5 leading-tight">
                              Hệ thống quản lý kho & nhân sự CDX
                            </p>
                          </div>
                        </div>
                        {/* Title block */}
                        <h1
                          className="text-xl uppercase leading-none main-title italic whitespace-nowrap"
                          style={{
                            color: '#2D5A27',
                            fontWeight: 900,
                          }}
                        >
                          BẢNG TÍNH LƯƠNG
                        </h1>
                        <p className="text-[11px] font-bold text-gray-500 mt-0.5 whitespace-nowrap">
                          {isCustomRange
                            ? `Kỳ lương: ${formatDate(customRange.start)} — ${formatDate(customRange.end)}`
                            : (() => {
                                const firstDay = `01/${String(selectedMonth).padStart(2, '0')}`;
                                const lastDay = `${new Date(selectedYear, selectedMonth, 0).getDate()}/${String(selectedMonth).padStart(2, '0')}`;
                                return `Kỳ lương: Tháng ${selectedMonth}/${selectedYear} (${firstDay} - ${lastDay})`;
                              })()}
                        </p>
                        {/* Employee name row with Autofit logic */}
                        <div className="flex justify-between items-center mt-3 gap-2">
                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                            Tên nhân viên:
                          </span>
                          <span
                            className="font-black text-red-600 whitespace-nowrap text-right"
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
                              Tổng ngày công:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              {selectedSalary.totalDays.toFixed(1)} công (
                              {(selectedSalary.totalDays * 8).toFixed(0)} giờ)
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                              Tổng số giờ tăng ca:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              {selectedSalary.totalOT.toFixed(1)} giờ
                            </span>
                          </div>

                          {/* Financial rows */}
                          <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                              Tổng tiền Lương ngày công:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              {formatNumber(selectedSalary.earnedSalary)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                              Tổng tiền tăng ca:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              {formatNumber(
                                selectedSalary.dayOTSalary + selectedSalary.monthOTSalary,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                              Cộng thêm Phụ cấp:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              {formatNumber(selectedSalary.totalAll)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                              Cộng thêm tiền Thưởng:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              0
                            </span>
                          </div>

                          {/* Total Earnings */}
                          <div className="flex justify-between items-center py-3 border-b border-gray-100 gap-2 bg-gray-50/30 px-2 -mx-2">
                            <span className="text-[11px] font-black text-gray-900 uppercase tracking-wide whitespace-nowrap">
                              Tổng cộng tiền Lương :
                            </span>
                            <span className="text-[11px] font-black text-gray-900 whitespace-nowrap">
                              {formatNumber(
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
                              Trừ số tiền Đã tạm ứng:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              -{formatNumber(selectedSalary.totalAdv)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                              Trừ % số tiền BHXH, BHYT phải nộp:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              -{formatNumber(selectedSalary.insuranceDeduction)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2.5 border-b border-gray-100 gap-2">
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                              Giảm trừ lý do khác:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              0
                            </span>
                          </div>

                          {/* Total Deductions */}
                          <div className="flex justify-between items-center py-3 border-b border-gray-100 gap-2 bg-gray-50/30 px-2 -mx-2">
                            <span className="text-[11px] font-black text-gray-900 uppercase tracking-wide whitespace-nowrap">
                              Tổng số tiền Giảm, trừ:
                            </span>
                            <span className="text-[11px] font-black text-gray-900 whitespace-nowrap">
                              -
                              {formatNumber(
                                selectedSalary.totalAdv + selectedSalary.insuranceDeduction,
                              )}
                            </span>
                          </div>

                          {/* Net Pay (RENAMED) */}
                          <div className="flex justify-between items-center pt-4 pb-1 border-primary/20 bg-primary/5 px-2 -mx-2">
                            <span className="text-xs font-black text-red-600 uppercase tracking-wider whitespace-nowrap italic">
                              Số tiền Còn được nhận là:
                            </span>
                            <span className="text-sm font-black text-red-600 whitespace-nowrap">
                              {formatNumber(selectedSalary.netSalary)}
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

                          <div className="flex justify-between items-start py-2.5 gap-2">
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap mt-0.5">
                              Ghi chú:
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 text-right break-words max-w-[280px]">
                              {billNote}
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

      {/* Preview modal */}
      {previewImageUrl && (
        <ReportImagePreviewModal
          imageDataUrl={previewImageUrl}
          fileName={`CDX_BangLuong_T${selectedMonth}_${selectedYear}.png`}
          onClose={() => setPreviewImageUrl(null)}
        />
      )}
    </div>
  );
};
