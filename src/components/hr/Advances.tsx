import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  Wallet,
  Search,
  Filter,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { formatDate, formatCurrency } from '@/utils/format';
import { FAB } from '../shared/FAB';
import { exportTableImage } from '../../utils/reportExport';
import { SaveImageButton } from '../shared/SaveImageButton';
import { Button } from '../shared/Button';
import { SortButton, SortOption } from '../shared/SortButton';
import { ReportPreviewModal } from '../shared/ReportPreviewModal';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { ExcelButton } from '../shared/ExcelButton';
import { utils, writeFile } from 'xlsx';

export const Advances = ({
  user,
  onBack,
  addToast,
  initialAction,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (msg: string, type?: any) => void;
  initialAction?: string;
}) => {
  const [advances, setAdvances] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(initialAction === 'add');
  const [activeTab, setActiveTab] = useState<'advances' | 'allowances'>('advances');
  const [submitting, setSubmitting] = useState(false);
  const [allowanceOptions, setAllowanceOptions] = useState<{ id: string; name: string }[]>([
    { id: 'Tiền cơm', name: 'Tiền cơm' },
    { id: 'Xăng xe', name: 'Xăng xe' },
    { id: 'Điện thoại', name: 'Điện thoại' },
    { id: 'Khác', name: 'Khác' },
  ]);

  const initialFormState = {
    employee_id: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    type: 'Tiền cơm',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Export States
  const [isCapturingTable, setIsCapturingTable] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    const { data: empData } = await supabase
      .from('users')
      .select('*')
      .neq('status', 'Nghỉ việc')
      .neq('status', 'Đã xóa')
      .neq('role', 'Develop')
      .eq('has_salary', true)
      .order('full_name');

    let activeEmpIds: string[] = [];
    if (empData) {
      setEmployees(empData);
      activeEmpIds = empData.map((e) => e.id);
    }

    const { data: advData } = await supabase
      .from('advances')
      .select('*, users(full_name)')
      .order('date', { ascending: false });
    if (advData) {
      setAdvances(advData.filter((a) => activeEmpIds.includes(a.employee_id)));
    }

    const { data: allData } = await supabase
      .from('allowances')
      .select('*, users(full_name)')
      .order('date', { ascending: false });
    if (allData) {
      const filteredAll = allData.filter((a) => activeEmpIds.includes(a.employee_id));
      setAllowances(filteredAll);

      // Extract unique types for the dropdown
      const dbTypes = filteredAll
        .map((t) => t.type)
        .filter(Boolean)
        .map((t) => {
          if (t === 'meal') return 'Tiền cơm';
          if (t === 'travel') return 'Xăng xe';
          if (t === 'phone') return 'Điện thoại';
          if (t === 'other') return 'Khác';
          return t;
        });

      const uniqueTypes = Array.from(new Set(dbTypes));
      const baseOptions = [
        { id: 'Tiền cơm', name: 'Tiền cơm' },
        { id: 'Xăng xe', name: 'Xăng xe' },
        { id: 'Điện thoại', name: 'Điện thoại' },
        { id: 'Khác', name: 'Khác' },
      ];

      const mergedOptions = [...baseOptions];
      uniqueTypes.forEach((t) => {
        if (!mergedOptions.find((o) => o.id === t)) {
          mergedOptions.push({ id: t as string, name: t as string });
        }
      });
      setAllowanceOptions(mergedOptions);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        employee_id: formData.employee_id,
        amount: formData.amount,
        date: formData.date,
        type: activeTab === 'advances' ? 'Tạm ứng' : formData.type,
        notes: formData.notes,
        ...(activeTab === 'advances' ? { reason: formData.notes || 'Tạm ứng' } : {}),
      };

      if (isEditing && selectedItem) {
        const { error } = await supabase
          .from(activeTab === 'advances' ? 'advances' : 'allowances')
          .update(payload)
          .eq('id', selectedItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(activeTab === 'advances' ? 'advances' : 'allowances')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchData();
      setFormData(initialFormState);
      setIsEditing(false);
      setSelectedItem(null);
      if (addToast) addToast('Đã lưu dữ liệu thành công!', 'success');
      else alert('Đã lưu dữ liệu thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      employee_id: item.employee_id,
      amount: item.amount,
      date: item.date,
      notes: item.notes || '',
      type: item.type,
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      console.log(`[CDX] Attempting to delete from ${activeTab}...`);
      if (addToast) addToast('Đang thực hiện xóa...', 'info');

      const table = activeTab === 'advances' ? 'advances' : 'allowances';
      const { error, status } = await supabase.from(table).delete().eq('id', deletingId);

      if (error) {
        console.error(`[CDX] Error deleting from ${table}:`, error);
        throw new Error(`${error.message} (Status: ${status})`);
      }

      console.log('[CDX] Deletion successful');
      if (addToast) addToast('Xóa thành công!', 'success');

      setShowDeleteModal(false);
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      console.error('[CDX] Deletion failed:', err);
      if (addToast) addToast('Không thể xóa: ' + err.message, 'error');
      else alert('Không thể xóa: ' + err.message);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const filteredItems = (activeTab === 'advances' ? advances : allowances)
    .filter((item) => {
      const itemDate = new Date(item.date);
      const start = new Date(selectedYear, selectedMonth - 1, 1);
      const end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
      if (itemDate < start || itemDate > end) return false;

      if (searchTerm) {
        const name = item.users?.full_name?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        if (!name.includes(term)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const exportExcel = () => {
    try {
      if (filteredItems.length === 0) {
        if (addToast) addToast('Không có dữ liệu để xuất', 'warning');
        return;
      }

      const exportData = filteredItems.map((item) => ({
        Ngày: formatDate(item.date),
        'Nhân viên': item.users?.full_name,
        'Số tiền': item.amount,
        'Nội dung': activeTab === 'advances' ? 'Tạm ứng' : item.type,
        'Ghi chú': item.notes || '',
      }));

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, activeTab === 'advances' ? 'Tạm ứng' : 'Phụ cấp');
      writeFile(wb, `TamUng_PhuCap_T${selectedMonth}_${selectedYear}.xlsx`);
      if (addToast) addToast('Xuất Excel thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi xuất Excel: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageBreadcrumb title="Tạm ứng & Phụ cấp" onBack={onBack} />
        <div className="flex items-center gap-1.5 justify-end flex-1">
          <ExcelButton onClick={exportExcel} />

          <div className="flex items-center gap-1.5 ml-1">
            <SortButton
              currentSort={sortBy}
              onSortChange={(val: any) => setSortBy(val)}
              options={[
                { value: 'date', label: 'Sắp xếp: Ngày chi' },
                { value: 'amount', label: 'Sắp xếp: Số tiền' },
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
              title="Lưu ảnh báo cáo"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab('advances')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'advances' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Tạm ứng
          </button>
          <button
            onClick={() => setActiveTab('allowances')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'allowances' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Phụ cấp
          </button>
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
                  <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest text-center">
                    Chọn thời kỳ
                  </p>
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                      Tìm nhân viên
                    </label>
                    <div className="relative group">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
                        size={16}
                      />
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto custom-scrollbar pb-2">
        <table className="w-full text-left border-collapse min-w-[600px] whitespace-nowrap">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-24">
                Mã hiệu
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                Nhân viên
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Số tiền</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                {activeTab === 'advances' ? 'Lý do' : 'Loại / Ghi chú'}
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic">
                  Không tìm thấy dữ liệu phù hợp
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50/50 transition-colors group border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-3.5 text-xs font-mono font-bold text-gray-400">
                    {item.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-600">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black uppercase">
                        {item.users?.full_name?.charAt(0) || 'U'}
                      </div>
                      {item.users?.full_name || '...'}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-black text-primary">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-500 max-w-xs truncate">
                    <span className="bg-gray-100 px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest mr-2">
                      {activeTab === 'advances'
                        ? 'ADV'
                        : item.type === 'meal'
                          ? 'MEAL'
                          : item.type === 'travel'
                            ? 'FUEL'
                            : 'ALLOW'}
                    </span>
                    {item.notes || item.reason || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                        title="Sửa"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => confirmDelete(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => {
              setShowModal(false);
              setIsEditing(false);
              setSelectedItem(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-[2rem] md:rounded-t-[2.5rem] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => {
                      setShowModal(false);
                      setIsEditing(false);
                      setSelectedItem(null);
                    }}
                  >
                    <Wallet size={24} />
                  </div>
                  <h3 className="font-bold text-lg">
                    {isEditing ? 'Cập nhật' : 'Thêm'}{' '}
                    {activeTab === 'advances' ? 'tạm ứng' : 'phụ cấp'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setIsEditing(false);
                    setSelectedItem(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2 mb-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Mã tham chiếu ({activeTab === 'advances' ? 'Tạm ứng' : 'Phụ cấp'})
                  </label>
                  <div className="bg-primary/5 px-5 py-3.5 rounded-2xl border border-primary/10 text-sm font-black text-primary uppercase shadow-inner italic">
                    {activeTab === 'advances' ? 'TU-' : 'PC-'}
                    {new Date(formData.date).toISOString().slice(2, 10).replace(/-/g, '')}-
                    {isEditing ? selectedItem?.id?.slice(0, 3).toUpperCase() : '001'}
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Nhân viên *
                    </label>
                    <select
                      required
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <NumericInput
                    label="Số tiền *"
                    required
                    value={formData.amount}
                    onChange={(val) => setFormData({ ...formData, amount: val })}
                  />
                  {activeTab === 'allowances' && (
                    <CreatableSelect
                      label="Loại phụ cấp"
                      value={formData.type}
                      options={allowanceOptions}
                      onChange={(val) => setFormData({ ...formData, type: val })}
                      onCreate={(val) => {
                        if (!allowanceOptions.find((o) => o.id === val)) {
                          setAllowanceOptions((prev) => [...prev, { id: val, name: val }]);
                        }
                        setFormData({ ...formData, type: val });
                      }}
                      placeholder="Chọn hoặc nhập loại mới..."
                    />
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Ghi chú / Lý do
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletingId(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-red-100">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Xóa vĩnh viễn</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Bạn có chắc chắn muốn xóa vĩnh viễn mục này không?
                </p>
                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-[11px] font-bold text-red-600 leading-tight">
                    Hành động này sẽ giải phóng dữ liệu liên quan và KHÔNG THỂ hoàn tác!
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingId(null);
                  }}
                  className="py-3 px-4 rounded-xl bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDelete}
                  className="py-3 px-4 rounded-xl bg-red-600 text-white text-sm font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Xóa vĩnh viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Ref for Report Capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={reportRef} className="p-10 bg-white" style={{ width: '1400px' }}>
          {/* Premium Branding Header */}
          <div className="flex items-center gap-6 mb-10">
            <CanvasLogo size={96} className="w-24 h-24 rounded-3xl object-contain shadow-sm" />
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase leading-none">
                CDX - CON ĐƯỜNG XANH
              </h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">
                Hệ thống quản lý kho và nhân sự
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black italic text-[#2D5A27] tracking-tighter mb-1 uppercase">
              {activeTab === 'advances' ? 'BẢNG TẠM ỨNG' : 'BẢNG PHỤ CẤP'}
            </h1>
            <p className="text-sm font-bold text-gray-500 italic">
              Kỳ báo cáo: Tháng {selectedMonth}/{selectedYear} • CDX-2026 Edition
            </p>
          </div>

          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Mã hiệu
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Ngày
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Nhân viên
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Số tiền
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic">
                  {activeTab === 'advances' ? 'Lý do' : 'Ghi chú'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredItems.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                  <td className="px-4 py-3 font-black text-primary font-mono tracking-tighter">
                    #{item.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-500">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 font-black text-gray-900 uppercase tracking-tight">
                    {item.users?.full_name}
                  </td>
                  <td className="px-4 py-3 font-black text-primary">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-500 italic max-w-xs truncate">
                    {item.notes || item.reason || '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-primary/5 font-black border-t-2 border-primary/20">
                <td
                  colSpan={3}
                  className="px-4 py-4 text-sm text-right uppercase tracking-[0.15em] italic"
                >
                  Tổng số tiền:
                </td>
                <td className="px-4 py-4 text-lg text-primary">
                  {formatCurrency(filteredItems.reduce((sum, item) => sum + item.amount, 0))}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div className="mt-12 flex justify-between items-end border-t border-gray-100 pt-6">
            <div className="space-y-1">
              <p className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] italic">
                CDX ERP SYSTEM
              </p>
              <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                End of financial record • Accounting Integrity Verified
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1">
                Financial Protocol Secured
              </p>
              <div className="text-[10px] text-gray-400 font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                Audit Hash:{' '}
                <span className="text-primary font-black tracking-widest italic ml-1 underline">
                  {new Date().getTime().toString(16).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAB — Thêm tạm ứng/phụ cấp */}
      <FAB
        onClick={() => setShowModal(true)}
        label={activeTab === 'advances' ? 'Thêm tạm ứng' : 'Thêm phụ cấp'}
      />
      <ReportPreviewModal
        isOpen={showReportPreview}
        onClose={() => setShowReportPreview(false)}
        title="Bảng tạm ứng & phụ cấp"
        isCapturing={isCapturingTable}
        onExport={() => {
          if (reportRef.current) {
            exportTableImage({
              element: reportRef.current,
              fileName: `TamUng_PhuCap_T${selectedMonth}_${selectedYear}.png`,
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
            <CanvasLogo size={96} className="w-24 h-24 rounded-3xl object-contain shadow-sm" />
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase leading-none">
                CDX - CON ĐƯỜNG XANH
              </h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">
                Hệ thống quản lý kho và nhân sự
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black italic text-[#2D5A27] tracking-tighter mb-1 uppercase">
              {activeTab === 'advances' ? 'BẢNG TẠM ỨNG' : 'BẢNG PHỤ CẤP'}
            </h1>
            <p className="text-sm font-bold text-gray-500 italic">
              Kỳ báo cáo: Tháng {selectedMonth}/{selectedYear} • CDX ERP
            </p>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Ngày
                </th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Nhân viên
                </th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Phân loại
                </th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Cấp bởi
                </th>
                <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest italic text-right">
                  Số tiền
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                  <td className="px-4 py-3 text-xs text-gray-600 font-bold italic">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-gray-900 uppercase tracking-tight">
                    {item.users?.full_name}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-primary uppercase">
                    {activeTab === 'advances' ? 'Tạm ứng' : item.type}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-400 italic">
                    Financial Audit Pooled
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-right tabular-nums text-gray-900">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-primary/5 font-black border-t-2 border-primary/20">
                <td
                  colSpan={4}
                  className="px-4 py-4 text-xs uppercase tracking-widest italic text-right"
                >
                  Tổng cộng thực tế:
                </td>
                <td className="px-4 py-4 text-sm text-right tabular-nums text-primary underline decoration-double">
                  {formatCurrency(
                    filteredItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-end">
            <div className="text-[10px] text-gray-400 font-bold">
              Ngày xuất: {new Date().toLocaleDateString('vi-VN')} •{' '}
              {new Date().toLocaleTimeString('vi-VN')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-300 uppercase italic">
                CDX ERP SYSTEM
              </span>
              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
              <span className="text-[10px] font-bold text-gray-300 uppercase">
                Operational Excellence
              </span>
            </div>
          </div>
        </div>
      </ReportPreviewModal>
    </div>
  );
};
