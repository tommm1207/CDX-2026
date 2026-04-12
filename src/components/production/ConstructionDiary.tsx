import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Calendar,
  Cloud,
  Users,
  Settings2,
  AlertCircle,
  MessageSquare,
  MapPin,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee, ConstructionDiary, Warehouse } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { FAB } from '../shared/FAB';
import { Button } from '../shared/Button';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ImageCapture } from '../shared/ImageCapture';
import { WEATHER_OPTIONS } from '../notes/Notes';
import { SortButton, SortOption } from '../shared/SortButton';
import { ExcelButton } from '../shared/ExcelButton';
import { formatDate, formatNumber } from '@/utils/format';
import ExcelJS from 'exceljs';
import { formatDataForExcel } from '@/utils/excelHelper';

const CODE_PREFIX = 'NKTC-';

export const ConstructionDiaryComponent = ({
  user,
  onBack,
  addToast,
  setHideBottomNav,
}: {
  user: Employee;
  onBack: () => void;
  addToast?: (msg: string, type?: ToastType) => void;
  setHideBottomNav?: (hide: boolean) => void;
}) => {
  const [diaries, setDiaries] = useState<ConstructionDiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedDiary, setSelectedDiary] = useState<ConstructionDiary | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_diary_${user.id}`) as SortOption) || 'newest',
  );

  const initialFormState: Partial<ConstructionDiary> = {
    date: new Date().toISOString().split('T')[0],
    weather: 'pleasant',
    temperature: '',
    labor_info: '',
    equipment_info: '',
    work_progress: '',
    quality_issues: '',
    supervision_comments: '',
    image_urls: [],
    warehouse_id: '',
    diary_code: '',
  };

  const [formData, setFormData] = useState<Partial<ConstructionDiary>>(initialFormState);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: diaryData } = await supabase
        .from('construction_diaries')
        .select('*, warehouses(id, name, code)')
        .or('trang_thai.is.null,trang_thai.neq.Đã xóa')
        .order('date', { ascending: false });
      if (diaryData) setDiaries(diaryData);

      const { data: whData } = await supabase
        .from('warehouses')
        .select('*')
        .neq('status', 'Đã xóa')
        .order('name');
      if (whData) setWarehouses(whData);
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const d = new Date();
    const dateStr = d.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${CODE_PREFIX}${dateStr}-${random}`;
  };

  const handleSave = async () => {
    if (!formData.work_progress || !formData.warehouse_id) {
      if (addToast) addToast('Vui lòng nhập nội dung thi công và chọn địa điểm', 'warning');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('construction_diaries')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (error) throw error;
        if (addToast) addToast('Đã cập nhật nhật ký thi công', 'success');
      } else {
        const code = generateCode();
        const { error } = await supabase.from('construction_diaries').insert([
          {
            ...formData,
            diary_code: code,
            created_by: user.id,
          },
        ]);
        if (error) throw error;
        if (addToast) addToast('Đã thêm mới nhật ký thi công: ' + code, 'success');
      }
      setShowAddNew(false);
      setEditingId(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
  };

  const handleEdit = (diary: ConstructionDiary) => {
    setEditingId(diary.id);
    setFormData(diary);
    setShowAddNew(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase
        .from('construction_diaries')
        .update({ trang_thai: 'Đã xóa' })
        .eq('id', deletingId);
      if (error) throw error;
      if (addToast) addToast('Đã chuyển nhật ký vào thùng rác', 'success');
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const filteredDiaries = diaries
    .filter((item) => {
      if (filterStartDate && item.date < filterStartDate) return false;
      if (filterEndDate && item.date > filterEndDate) return false;
      if (filterWarehouseId && item.warehouse_id !== filterWarehouseId) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          item.work_progress.toLowerCase().includes(s) ||
          item.labor_info?.toLowerCase().includes(s) ||
          item.diary_code?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.diary_code || '').localeCompare(a.diary_code || '');
      if (sortBy === 'code') return (a.diary_code || '').localeCompare(b.diary_code || '');
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      return 0;
    });

  const handleExportExcel = async () => {
    if (filteredDiaries.length === 0) {
      addToast?.('Không có dữ liệu để xuất!', 'warning');
      return;
    }

    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Nhật ký thi công');

      const lookupData = {
        warehouses: warehouses,
        users: [{ id: user.id, full_name: user.full_name }], // Minimal for helper
      };

      const formattedData = formatDataForExcel(filteredDiaries, lookupData);
      const columns = Object.keys(formattedData[0]);

      // Set header
      const headerRow = worksheet.addRow(columns);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D5A27' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data
      formattedData.forEach((item) => {
        worksheet.addRow(Object.values(item));
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLen = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 10;
          if (len > maxLen) maxLen = len;
        });
        column.width = Math.min(maxLen + 2, 50);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Nhat_ky_thi_cong_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      addToast?.('Xuất Excel thành công!', 'success');
    } catch (err: any) {
      addToast?.('Lỗi xuất Excel: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (setHideBottomNav) setHideBottomNav(showAddNew || showDetail);
  }, [showAddNew, showDetail, setHideBottomNav]);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 max-w-[100vw] overflow-x-hidden">
      {/* Header Section */}
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Nhật ký thi công" onBack={onBack} />
        <div className="flex items-center gap-2">
          <ExcelButton onClick={handleExportExcel} loading={exporting} />
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_diary_${user.id}`, val);
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'code', label: 'Mã nhật ký' },
              { value: 'date', label: 'Ngày lập' },
            ]}
          />
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter((f) => !f)}
            icon={Search}
          />
        </div>
      </div>

      {/* Advanced Filter Bar (Glassmorphism inspired) */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-gray-100 mb-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-white/50 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-white/50 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Địa điểm / Kho
                  </label>
                  <select
                    value={filterWarehouseId}
                    onChange={(e) => setFilterWarehouseId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-white/50 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  >
                    <option value="">Tất cả địa điểm</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Tìm kiếm
                  </label>
                  <input
                    type="text"
                    placeholder="Mã, nội dung, nhân sự..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-white/50 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area - Table for Desktop, Cards for Mobile */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile View - Cards */}
        <div className="grid grid-cols-1 md:hidden overflow-y-auto no-scrollbar">
          {loading ? (
            Array(5)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-50/50 animate-pulse border-b border-gray-50 last:border-0"
                />
              ))
          ) : filteredDiaries.length === 0 ? (
            <div className="p-10 text-center text-gray-400 italic text-sm">Chưa có nhật ký nào</div>
          ) : (
            filteredDiaries.map((diary) => (
              <div
                key={diary.id}
                onClick={() => {
                  setSelectedDiary(diary);
                  setShowDetail(true);
                }}
                className="p-4 border-b border-gray-50 last:border-0 flex items-center justify-between group active:bg-gray-50"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-gray-900">{formatDate(diary.date)}</p>
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md uppercase">
                      {diary.diary_code}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase truncate">
                    {(diary as any).warehouses?.name}
                  </p>
                  <p className="text-[11px] text-gray-600 line-clamp-1 italic">
                    {diary.work_progress}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {diary.image_urls && diary.image_urls.length > 0 && (
                    <div className="text-gray-300">
                      <ImageIcon size={14} />
                    </div>
                  )}
                  <ChevronRight
                    size={16}
                    className="text-gray-300 group-hover:text-primary transition-colors"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View - Professional Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10">
                  Ngày
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10 text-center">
                  Mã hiệu
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10">
                  Địa điểm / Dự án
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10">
                  Nhân sự chính
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10">
                  Diễn biến thi công
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">
                  Ảnh
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array(6)
                        .fill(0)
                        .map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-gray-100 rounded-lg" />
                          </td>
                        ))}
                    </tr>
                  ))
              ) : filteredDiaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">
                    Chưa có nhật ký nào được ghi nhận
                  </td>
                </tr>
              ) : (
                filteredDiaries.map((diary) => (
                  <tr
                    key={diary.id}
                    onClick={() => {
                      setSelectedDiary(diary);
                      setShowDetail(true);
                    }}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 text-[11px] font-bold text-gray-600">
                      {formatDate(diary.date)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-full border border-primary/10">
                        {diary.diary_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-gray-800 uppercase tracking-tight">
                      {(diary as any).warehouses?.name}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 italic truncate max-w-[200px]">
                      {diary.labor_info || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-600 truncate max-w-[350px]">
                        {diary.work_progress}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {diary.image_urls && diary.image_urls.length > 0 ? (
                          <div className="relative group/img">
                            <div className="p-1.5 bg-gray-50 rounded-lg text-primary border border-gray-100 group-hover/img:bg-primary group-hover/img:text-white transition-all">
                              <ImageIcon size={14} />
                            </div>
                            <span className="absolute -top-2 -right-2 bg-red-500 text-[8px] font-black text-white px-1 py-0.5 rounded-full ring-2 ring-white">
                              {diary.image_urls.length}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tight">
                            Ko có
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAB - Nhật ký mới */}
      <FAB
        onClick={() => {
          const newForm = { ...initialFormState, diary_code: generateCode() };
          setFormData(newForm);
          setShowAddNew(true);
        }}
        icon={Plus}
        label="Nhật ký mới"
        color="bg-primary"
      />

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedDiary && (
          <div
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <ClipboardList size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl leading-tight">Chi tiết Nhật ký</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                      {selectedDiary.diary_code} • {formatDate(selectedDiary.date)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(selectedDiary)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                    title="Sửa nhật ký"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => setShowDetail(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 bg-white">
                {/* Summary Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                      <Cloud size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">
                        Thời tiết
                      </p>
                      <p className="text-sm font-black text-gray-800">
                        {WEATHER_OPTIONS.find((w) => w.value === selectedDiary.weather)?.label}
                        {selectedDiary.temperature && ` - ${selectedDiary.temperature}°C`}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100 flex items-center gap-4 lg:col-span-2">
                    <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">
                        Địa điểm / Dự án
                      </p>
                      <p className="text-sm font-black text-gray-800 uppercase">
                        {(selectedDiary as any).warehouses?.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <section className="space-y-3">
                    <div className="flex items-center gap-3 ml-2">
                      <Users size={16} className="text-primary" />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Nhân sự & Tổ đội công trường
                      </h4>
                    </div>
                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedDiary.labor_info || 'Không có ghi nhận đặc biệt'}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center gap-3 ml-2">
                      <Settings2 size={16} className="text-amber-500" />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Máy móc thiết bị hoạt động
                      </h4>
                    </div>
                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedDiary.equipment_info || 'Trống'}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center gap-3 ml-2">
                      <ClipboardList size={16} className="text-indigo-500" />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Diễn biến và Nội dung thi công
                      </h4>
                    </div>
                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 text-sm text-gray-800 font-black leading-relaxed whitespace-pre-wrap shadow-inner shadow-primary/5">
                      {selectedDiary.work_progress}
                    </div>
                  </section>

                  <section className="space-y-3 text-red-600">
                    <div className="flex items-center gap-3 ml-2">
                      <AlertCircle size={16} />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Vấn đề chất lượng / An toàn
                      </h4>
                    </div>
                    <div className="bg-red-50/30 p-6 rounded-3xl border border-red-50 text-sm text-red-800 font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedDiary.quality_issues || 'Mọi thứ đều ổn định'}
                    </div>
                  </section>

                  <section className="space-y-3 text-green-700">
                    <div className="flex items-center gap-3 ml-2">
                      <MessageSquare size={16} />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Ý kiến Giám sát / Ban QLDA
                      </h4>
                    </div>
                    <div className="bg-green-50/30 p-6 rounded-3xl border border-green-50 text-sm text-green-900 font-medium italic leading-relaxed whitespace-pre-wrap">
                      {selectedDiary.supervision_comments || 'Chưa có nhận xét'}
                    </div>
                  </section>

                  {(selectedDiary.image_urls?.length || 0) > 0 && (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between ml-2">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                          Hình ảnh minh chứng ({selectedDiary.image_urls?.length})
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedDiary.image_urls?.map((url, i) => (
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            key={i}
                            className="rounded-3xl overflow-hidden shadow-lg border-4 border-white"
                          >
                            <img
                              src={url}
                              alt="Site work"
                              className="w-full aspect-video object-cover"
                            />
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                <Button
                  variant="danger"
                  variantType="outline"
                  icon={Trash2}
                  onClick={() => {
                    setShowDetail(false);
                    setDeletingId(selectedDiary.id);
                  }}
                >
                  Xóa nhật ký
                </Button>
                <Button variant="primary" onClick={() => setShowDetail(false)}>
                  Đóng
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal (Sync with other features) */}
      <AnimatePresence>
        {showAddNew && (
          <div
            className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md overflow-hidden no-print"
            onClick={() => {
              setShowAddNew(false);
              setEditingId(null);
              resetForm();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[96dvh] md:max-h-[90dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-4 sm:p-6 text-white flex items-center justify-between flex-shrink-0 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                    {editingId ? <Edit size={24} /> : <Plus size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black text-lg sm:text-xl leading-tight">
                      {editingId ? 'Sửa Nhật ký' : 'Nhật ký Thi công Mới'}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                      Mẫu hồ sơ xây dựng điện tử
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddNew(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar space-y-8 bg-gray-50/50 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Mã tham chiếu
                    </label>
                    <div className="bg-primary/5 px-5 py-3.5 rounded-2xl border border-primary/10 text-sm font-black text-primary uppercase shadow-inner italic">
                      {formData.diary_code || '(Hệ thống tự tạo)'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Ngày nhật ký *
                    </label>
                    <input
                      type="date"
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-bold shadow-sm"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Dự án thi công / Địa điểm *
                  </label>
                  <select
                    className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-bold shadow-sm"
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  >
                    <option value="">-- Chọn công trình / địa điểm --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Thời tiết hiện tại
                    </label>
                    <select
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-bold shadow-sm"
                      value={formData.weather}
                      onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                    >
                      {WEATHER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Nhiệt độ trung bình (°C)
                    </label>
                    <input
                      type="number"
                      placeholder="Nhập nhiệt độ..."
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-bold shadow-sm"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Nhân sự & Tổ đội công trường
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Số lượng công nhân, kỹ thuật, các đội thầu phụ..."
                      className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-medium shadow-sm resize-none"
                      value={formData.labor_info}
                      onChange={(e) => setFormData({ ...formData, labor_info: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Máy móc hoạt động
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Các loại máy thi công, trạng thái hoạt động..."
                      className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-medium shadow-sm resize-none"
                      value={formData.equipment_info}
                      onChange={(e) => setFormData({ ...formData, equipment_info: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-2">
                    Tiến độ & Diễn biến thi công chính *{' '}
                    <span className="text-[8px] bg-primary/10 px-1.5 py-0.5 rounded italic">
                      Rất quan trọng
                    </span>
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Ghi nhận chi tiết tất cả hạng mục đã thực hiện trong ngày hôm nay..."
                    className="w-full px-6 py-5 rounded-[2rem] border-2 border-primary/10 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-black text-gray-900 shadow-sm resize-none leading-relaxed transition-all"
                    value={formData.work_progress}
                    onChange={(e) => setFormData({ ...formData, work_progress: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">
                      Vấn đề chất lượng / An toàn
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Các lỗi thi công, sự cố an toàn (nếu có)..."
                      className="w-full px-5 py-4 rounded-3xl border border-red-100 bg-white focus:ring-4 focus:ring-red-100 focus:border-red-400 outline-none text-sm font-medium shadow-sm resize-none"
                      value={formData.quality_issues}
                      onChange={(e) => setFormData({ ...formData, quality_issues: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-green-600 uppercase tracking-widest ml-1">
                      Ghi nhận của Giám sát
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Phát đạo, chỉ đạo hoặc các thay đổi thiết kế..."
                      className="w-full px-5 py-4 rounded-3xl border border-green-100 bg-white focus:ring-4 focus:ring-green-100 focus:border-green-400 outline-none text-sm font-medium shadow-sm italic resize-none"
                      value={formData.supervision_comments}
                      onChange={(e) =>
                        setFormData({ ...formData, supervision_comments: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <ImageCapture
                    existingImages={formData.image_urls}
                    onUpload={(urls) => setFormData({ ...formData, image_urls: urls })}
                    label="Ảnh chụp hiện trường & Hồ sơ"
                    maxImages={10}
                  />
                </div>
              </div>

              <div className="p-8 bg-white border-t border-gray-100 flex gap-4 flex-shrink-0 shadow-2xl">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setShowAddNew(false);
                    setEditingId(null);
                    resetForm();
                  }}
                >
                  Huỷ bỏ
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSave}
                  className="shadow-lg shadow-primary/20"
                >
                  {editingId ? 'Cập nhật bản ghi' : 'Xác nhận Lưu Nhật ký'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        show={!!deletingId}
        title="Xóa nhật ký này?"
        message="Hành động này sẽ xóa vĩnh viễn bản ghi nhật ký. Hãy chắc chắn bạn đã sao lưu dữ liệu này."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
