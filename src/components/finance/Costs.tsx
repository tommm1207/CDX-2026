import { exportTableImage } from '../../utils/reportExport';
import { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  PackageOpen,
  Download,
  Upload,
  AlertCircle,
  Edit,
  Trash2,
  Settings,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
  Wallet,
  XCircle,
  CheckCircle,
  Calculator,
  CreditCard,
  RefreshCw,
  X,
  Check,
  ChevronDown,
  FileSpreadsheet,
  ArrowDownCircle,
  ArrowUpCircle,
  Info,
  Navigation,
  Image as LucideImageIcon,
  Share2,
} from 'lucide-react';

import { SaveImageButton } from '../shared/SaveImageButton';
import { motion, AnimatePresence } from 'motion/react';
import { utils, writeFile } from 'xlsx';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { ToastType } from '../shared/Toast';
import { FAB } from '../shared/FAB';
import { ExcelButton } from '../shared/ExcelButton';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
import { isUUID, getAllowedWarehouses } from '@/utils/helpers';
import { isActiveWarehouse } from '@/utils/inventory';
import { Button } from '../shared/Button';
import { SortButton, SortOption } from '../shared/SortButton';
import { generateSmartCode } from '@/utils/codeGenerator';
import { checkUsage } from '@/utils/dataIntegrity';
import { ReportPreviewModal } from '../shared/ReportPreviewModal';

const initialFormState = {
  date: new Date().toISOString().split('T')[0],
  cost_code: '',
  employee_id: '',
  transaction_type: 'Chi',
  cost_type: 'Chi phí',
  content: '',
  warehouse_id: '',
  material_id: null,
  quantity: 1,
  unit: 'Lần',
  unit_price: 0,
  total_amount: 0,
  notes: '',
  status: 'Chờ duyệt',
  stock_status: 'Chưa nhập',
};

export const Costs = ({
  user,
  onBack,
  addToast,
  initialAction,
  setHideBottomNav,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
  initialAction?: string;
  setHideBottomNav?: (hide: boolean) => void;
}) => {
  const [showModal, setShowModal] = useState(initialAction === 'add');
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (setHideBottomNav) {
      setHideBottomNav(showModal || showDetailModal);
    }
  }, [showModal, showDetailModal, setHideBottomNav]);

  const [selectedCost, setSelectedCost] = useState<any>(null);
  const [costs, setCosts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [costTypes, setCostTypes] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [isCapturingTable, setIsCapturingTable] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [showFilter, setShowFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_costs_${user.id}`) as SortOption) || 'newest',
  );

  const [employees, setEmployees] = useState<any[]>([]);
  const [costItems, setCostItems] = useState<any[]>([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<any>({ inUse: false, details: [] });

  const [formData, setFormData] = useState<any>(() => ({
    ...initialFormState,
    date: new Date().toISOString().split('T')[0],
  }));

  useEffect(() => {
    fetchCostGroups();
    fetchEmployees();
    fetchMaterials();
    fetchWarehouses();
    fetchUnits();
  }, []);

  const handleSaveTableImage = () => {
    setShowReportPreview(true);
  };

  useEffect(() => {
    fetchCosts();
  }, [statusFilter]);

  const fetchUnits = async () => {
    const { data } = await supabase.from('costs').select('unit');
    if (data) {
      const uniqueUnits = Array.from(new Set(data.map((item) => item.unit)))
        .filter(Boolean)
        .map((name) => ({ id: name as string, name: name as string }));
      setUnits(uniqueUnits);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchCostGroups();
    fetchCostItems();
    fetchUnits();
    fetchEmployees();
  }, []);

  const fetchCostGroups = async () => {
    const { data } = await supabase.from('costs').select('cost_type');
    if (data) {
      const unique = Array.from(new Set(data.map((item) => item.cost_type)))
        .filter(Boolean)
        .map((name) => ({ id: name as string, name: name as string }));
      setCostTypes(unique);
    }
  };

  const fetchCostItems = async (group?: string) => {
    let query = supabase.from('costs').select('content');
    if (group) {
      query = query.eq('cost_type', group);
    }
    const { data } = await query;
    if (data) {
      const unique = Array.from(new Set(data.map((item) => item.content)))
        .filter(Boolean)
        .map((name) => ({ id: name as string, name: name as string }));
      setCostItems(unique);
    }
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, code')
      .neq('status', 'Nghỉ việc');
    if (data) setEmployees(data);
  };

  const generateNextCostCode = async () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CP${yyyy}${mm}${dd}-${random}`;
  };

  useEffect(() => {
    if (initialAction === 'add') {
      generateNextCostCode().then((code) => {
        setFormData((prev: any) => ({ ...prev, cost_code: code }));
      });
    }
  }, [initialAction]);

  const fetchCosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('costs')
        .select('*, users(full_name), warehouses(name, code), materials(name, code)');

      if (statusFilter === 'Tất cả') {
        query = query.neq('status', 'Đã xóa');
      } else {
        query = query.eq('status', statusFilter);
      }

      const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
      if (allowedWhIds) {
        query = query.in('warehouse_id', allowedWhIds);
      }

      const { data, error } = await query.order('cost_code', { ascending: false });

      if (error) {
        setCosts([]);
      } else {
        setCosts(data || []);
      }
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải danh sách chi phí: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    const { data } = await supabase
      .from('materials')
      .select('id, name, group_id, unit')
      .or('status.is.null,status.neq.Đã xóa');
    if (data) setMaterials(data);
  };

  const fetchWarehouses = async () => {
    let query = supabase
      .from('warehouses')
      .select('id, name, status')
      .or('status.is.null,status.neq.Đã xóa');

    const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
    if (allowedWhIds) {
      query = query.in('id', allowedWhIds);
    }

    const { data } = await query;
    if (data) {
      setWarehouses(data.filter(isActiveWarehouse));
    }
  };

  const ensureValueExists = async (
    table: string,
    name: string,
    currentList: any[],
    fetchFn: () => void,
  ) => {
    if (!name) return null;
    if (isUUID(name)) return name;
    if (table === 'costs') return null;

    const existing = currentList.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    let code = '';
    const random = Math.floor(100 + Math.random() * 900);
    if (table === 'warehouses') {
      code = `KH${(currentList.length + 1).toString().padStart(2, '0')}-${random}`;
    } else if (table === 'materials') {
      code = `VAT${(currentList.length + 1).toString().padStart(3, '0')}-${random}`;
    }

    const { data, error } = await supabase.from(table).insert([{ name, code }]).select();
    if (!error && data && data[0]) {
      fetchFn();
      return data[0].id;
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const warehouse_id = await ensureValueExists(
        'warehouses',
        formData.warehouse_name,
        warehouses,
        fetchWarehouses,
      );

      const cost_code = isEditing ? formData.cost_code : await generateNextCostCode();

      const payload = {
        cost_code,
        transaction_type: formData.transaction_type,
        cost_type: formData.cost_type,
        content: formData.content,
        notes: formData.notes,
        warehouse_id,
        quantity: formData.quantity,
        unit: formData.unit,
        total_amount: formData.total_amount,
        employee_id: user.id,
        status: ['admin', 'develop'].includes(user.role?.toLowerCase() || '')
          ? isEditing
            ? formData.status
            : 'Chờ duyệt'
          : 'Chờ duyệt',
      };
      if (isEditing && editingId) {
        await supabase.from('costs').update(payload).eq('id', editingId);
      } else {
        await supabase.from('costs').insert([payload]);
      }

      setShowModal(false);
      setFormData(initialFormState);
      setIsEditing(false);
      setEditingId(null);
      fetchCosts();
      if (addToast) addToast(isEditing ? 'Cập nhật thành công!' : 'Lưu thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      date: item.date,
      transaction_type: item.transaction_type || 'Chi',
      cost_type: item.cost_type || '',
      content: item.content || '',
      warehouse_name: item.warehouses?.name || '',
      quantity: item.quantity,
      unit: item.unit || '',
      total_amount: item.total_amount,
      notes: item.notes || '',
      cost_code: item.cost_code,
      status: item.status,
    });
    setEditingId(item.id);
    setIsEditing(true);
    setShowModal(true);
    setShowDetailModal(false);
    fetchCostItems(item.cost_type);
  };

  const handleDeleteClick = async (item: any) => {
    setItemToDelete(item.id);
    setShowDeleteModal(true);
    try {
      // Costs usually haven't child dependencies but we check for consistency
      const usage = await checkUsage('material', item.material_id || item.id);
      setUsageInfo(usage);
    } catch (err) {
      console.error('Error checking usage:', err);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('costs')
        .update({ status: 'Đã xóa' })
        .eq('id', itemToDelete);
      if (error) throw error;
      fetchCosts();
      if (addToast) addToast('Đã chuyển vào thùng rác', 'success');
      setShowDeleteModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete || user.role !== 'Develop') return;
    if (
      !window.confirm('CẢNH BÁO: Hành động này sẽ xóa VĨNH VIỄN phiếu chi này. Bạn có chắc chắn?')
    )
      return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('costs').delete().eq('id', itemToDelete);
      if (error) throw error;
      if (addToast) addToast('Đã xóa vĩnh viễn phiếu chi', 'success');
      fetchCosts();
      setShowDeleteModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa vĩnh viễn: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const exportToExcel = () => {
    const data = costs.map((item) => ({
      Mã: item.cost_code,
      Ngày: item.date,
      Loại: item.transaction_type,
      'Người lập': item.users?.full_name,
      'Hạng mục': item.cost_type,
      'Nội dung': item.content,
      Kho: item.warehouses?.name,
      'Số lượng': item.quantity,
      ĐVT: item.unit,
      'Thành tiền': item.total_amount,
    }));
    utils.book_append_sheet(utils.book_new(), utils.json_to_sheet(data), 'Chi phí');
    writeFile(utils.book_new(), `Costs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredCosts = costs
    .filter((item) => {
      let match = true;
      if (filterStartDate && item.date < filterStartDate) match = false;
      if (filterEndDate && item.date > filterEndDate) match = false;
      if (filterEmployeeId && item.employee_id !== filterEmployeeId) match = false;
      if (filterWarehouseId && item.warehouse_id !== filterWarehouseId) match = false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        match =
          (item.content || '').toLowerCase().includes(s) ||
          (item.cost_code || '').toLowerCase().includes(s);
      }
      return match;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.cost_code || '').localeCompare(a.cost_code || '');
      if (sortBy === 'price') return (b.total_amount || 0) - (a.total_amount || 0);
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(b.date).getTime();
      return 0;
    });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageBreadcrumb title="Quản lý Chi phí" onBack={onBack} />
        <div className="flex items-center gap-1.5 justify-end flex-1">
          <ExcelButton onClick={exportToExcel} />
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
              onClick={handleSaveTableImage}
              isCapturing={isCapturingTable}
              title="Lưu ảnh báo cáo A4"
            />
          </div>
        </div>
      </div>

      {/* Dashboard cards removed - moved to CostReport for Admin only */}

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="z-20"
            style={{ overflow: showFilter ? 'visible' : 'hidden' }}
          >
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
                  <select
                    value={filterWarehouseId}
                    onChange={(e) => setFilterWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="">Tất cả kho</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Mã, nội dung..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">
                  Trạng thái
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                  {['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã xóa'].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={statusFilter === status ? 'primary' : 'outline'}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === 'Đã xóa' ? 'Thùng rác' : status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3 border-r border-white/10">Ngày</th>
                <th className="px-4 py-3 border-r border-white/10">Mã</th>
                <th className="px-4 py-3 border-r border-white/10 text-center">Loại</th>
                <th className="px-4 py-3 border-r border-white/10">Kho</th>
                <th className="px-4 py-3 border-r border-white/10">Hạng mục / Nội dung</th>
                <th className="px-4 py-3 border-r border-white/10 text-right">Số tiền</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCosts.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    setSelectedCost(item);
                    setShowDetailModal(true);
                  }}
                  className="hover:bg-gray-50 cursor-pointer text-xs"
                >
                  <td className="px-4 py-3">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 font-bold text-primary">{item.cost_code}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full font-bold text-[10px] ${item.transaction_type === 'Thu' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}
                    >
                      {item.transaction_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-medium">
                    {item.warehouses?.name || '---'}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-bold text-gray-700 truncate">{item.cost_type}</p>
                    <p className="text-[10px] text-gray-400 truncate italic">{item.content}</p>
                  </td>
                  <td
                    className={`px-4 py-3 font-black text-right ${item.transaction_type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(item.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${item.status === 'Đã duyệt' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {item.status || 'Chờ duyệt'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showDetailModal && selectedCost && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl z-10 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-primary">{selectedCost.cost_code}</h3>
                <button onClick={() => setShowDetailModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400">Ngày:</span>
                  <span className="font-medium">{formatDate(selectedCost.date)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400">Nhóm:</span>
                  <span className="font-bold text-gray-700">{selectedCost.cost_type}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400">Chi tiết:</span>
                  <span className="font-bold text-primary">{selectedCost.content}</span>
                </div>
                <div className="space-y-1 border-b border-gray-50 pb-2">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">
                    Nội dung thu chi:
                  </span>
                  <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded-lg">
                    {selectedCost.notes || 'Không có ghi chú'}
                  </p>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400">Số tiền:</span>
                  <span
                    className={`font-black text-lg ${selectedCost.transaction_type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(selectedCost.total_amount)}
                  </span>
                </div>
              </div>
              {/* Chỉ cho phép Sửa/Xóa nếu là Admin, hoặc User thì chỉ với phiếu của mình */}
              {(['admin', 'develop'].includes(user.role?.toLowerCase() || '') ||
                selectedCost.employee_id === user.id) && (
                <div className="mt-6 flex gap-2">
                  <Button
                    fullWidth
                    variant="danger"
                    onClick={() => handleDeleteClick(selectedCost)}
                  >
                    Xóa
                  </Button>
                  <Button fullWidth variant="primary" onClick={() => handleEdit(selectedCost)}>
                    Sửa
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full text-center relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <div className="text-sm text-gray-500 mb-6 text-left bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <p>
                  Mã phiếu:{' '}
                  <strong className="text-primary uppercase">
                    {costs.find((c) => c.id === itemToDelete)?.cost_code}
                  </strong>
                </p>
                {usageInfo.inUse ? (
                  <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 uppercase tracking-tighter">
                    <AlertCircle size={12} /> Có dữ liệu liên quan - Cân nhắc kỹ
                  </p>
                ) : (
                  <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 uppercase tracking-widest">
                    <CheckCircle size={12} /> Sẵn sàng để xóa
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button fullWidth variant="outline" onClick={() => setShowDeleteModal(false)}>
                    Hủy bỏ
                  </Button>
                  <Button fullWidth variant="danger" onClick={confirmDelete} isLoading={submitting}>
                    Thùng rác
                  </Button>
                </div>
                {/* XÓA VĨNH VIỄN removed from main list - use Trash module instead */}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col z-10"
            >
              <div className="bg-primary p-6 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">{isEditing ? 'Sửa chi phí' : 'Nhập chi phí'}</h3>
                <button onClick={() => setShowModal(false)}>
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">
                      Mã tham chiếu
                    </p>
                    <p className="font-black text-primary uppercase italic">
                      {formData.cost_code || 'Tự động tạo khi lưu'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Loại giao dịch *
                      </label>
                      <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                        {(['Thu', 'Chi'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, transaction_type: type })}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                              formData.transaction_type === type
                                ? type === 'Thu'
                                  ? 'bg-green-500 text-white shadow-sm'
                                  : 'bg-red-500 text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {type === 'Thu' ? '↓ THU' : '↑ CHI'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Ngày *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CreatableSelect
                      label="Nhóm chi phí *"
                      value={formData.cost_type}
                      options={costTypes}
                      onChange={(val) => {
                        setFormData({ ...formData, cost_type: val, content: '' });
                        fetchCostItems(val);
                      }}
                      onCreate={(val) => {
                        setFormData({ ...formData, cost_type: val, content: '' });
                      }}
                      required
                    />
                    <CreatableSelect
                      label="Chi tiết chi phí *"
                      value={formData.content}
                      options={costItems}
                      onChange={(val) => setFormData({ ...formData, content: val })}
                      onCreate={(val) => setFormData({ ...formData, content: val })}
                      required
                    />
                  </div>

                  <CreatableSelect
                    label="Tên kho *"
                    value={formData.warehouse_name}
                    options={warehouses}
                    onChange={(val) => setFormData({ ...formData, warehouse_name: val })}
                    onCreate={(val) => setFormData({ ...formData, warehouse_name: val })}
                    required
                  />

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Nội dung thu chi (Ghi chú tự do)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                      placeholder="Gõ nội dung chi tiết tại đây..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <NumericInput
                      label="Số lượng"
                      value={formData.quantity}
                      onChange={(val) => setFormData({ ...formData, quantity: val })}
                    />
                    <CreatableSelect
                      label="Đơn vị tính"
                      value={formData.unit}
                      options={units}
                      onChange={(val) => setFormData({ ...formData, unit: val })}
                      onCreate={(val) => setFormData({ ...formData, unit: val })}
                    />
                  </div>

                  <NumericInput
                    label="Thành tiền *"
                    value={formData.total_amount}
                    onChange={(val) => setFormData({ ...formData, total_amount: val })}
                    required
                  />

                  {/* Admin Status Toggle */}
                  {['admin', 'develop'].includes(user.role?.toLowerCase() || '') && (
                    <div className="space-y-1 mb-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Trạng thái duyệt
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-amber-50 text-amber-700 outline-none focus:ring-2 focus:ring-amber-200"
                      >
                        <option value="Chờ duyệt">Chờ duyệt</option>
                        <option value="Đã duyệt">Đã duyệt</option>
                        <option value="Từ chối">Từ chối</option>
                      </select>
                    </div>
                  )}

                  <div className="mt-8 flex justify-end gap-3 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95"
                    >
                      {submitting ? 'Đang xử lý...' : isEditing ? 'Cập nhật' : 'Xác nhận tạo'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FAB
        onClick={async () => {
          const nextCode = await generateNextCostCode();
          setFormData({
            ...initialFormState,
            date: new Date().toISOString().split('T')[0],
            cost_code: nextCode,
          });
          setIsEditing(false);
          setShowModal(true);
        }}
      />

      <ReportPreviewModal
        isOpen={showReportPreview}
        onClose={() => setShowReportPreview(false)}
        title="Báo cáo chi phí vận hành"
        isCapturing={isCapturingTable}
        onExport={() => {
          if (reportRef.current) {
            exportTableImage({
              element: reportRef.current,
              fileName: `Bao_Cao_Chi_Phi_${new Date().toISOString().slice(0, 10)}.png`,
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
        <div ref={reportRef} className="p-12 bg-white" style={{ width: '1400px' }}>
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
            <h1 className="text-3xl font-black italic text-primary tracking-tighter mb-1 uppercase">
              BÁO CÁO CHI PHÍ
            </h1>
            <p className="text-sm font-bold text-gray-500 italic uppercase">
              Operational Cost Summary • {new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>

          {/* Filters Info */}
          <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                  Cấu hình báo cáo
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold">Từ ngày:</p>
                  <p className="text-sm font-black text-gray-900">
                    {filterStartDate ? formatDate(filterStartDate) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-bold">Đến ngày:</p>
                  <p className="text-sm font-black text-gray-900">
                    {filterEndDate ? formatDate(filterEndDate) : '—'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-gray-800 rounded-full" />
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                  Thông tin chung
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold">Tổng mục:</p>
                  <p className="text-sm font-black text-primary italic uppercase tracking-widest">
                    {filteredCosts.length} bản ghi
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-bold">Người xuất:</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{user.full_name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Ngày
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Mã phiếu
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Loại chi
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Nội dung
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic text-right">
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredCosts.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-primary/5'}>
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium italic">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-primary tracking-tight">
                    {item.cost_code}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-gray-900 uppercase tracking-tight">
                    {item.cost_type}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-500 max-w-[250px] truncate">
                    {item.content}
                  </td>
                  <td
                    className={`px-4 py-3 text-xs font-black text-right tabular-nums ${item.transaction_type === 'Thu' ? 'text-green-600' : 'text-rose-600'}`}
                  >
                    {item.transaction_type === 'Thu' ? '+' : '-'}
                    {formatCurrency(item.total_amount || 0)}
                  </td>
                </tr>
              ))}
              <tr className="bg-primary/5 font-black border-t-2 border-primary/20">
                <td
                  colSpan={4}
                  className="px-4 py-4 text-[11px] text-primary uppercase text-right italic tracking-[0.1em]"
                >
                  Tổng số dư phát sinh:
                </td>
                <td className="px-4 py-4 text-lg text-right tabular-nums text-primary underline decoration-double">
                  {formatCurrency(
                    filteredCosts.reduce(
                      (sum, item) =>
                        sum +
                        (item.transaction_type === 'Thu'
                          ? item.total_amount || 0
                          : -(item.total_amount || 0)),
                      0,
                    ),
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer Branding */}
          <div className="mt-12 flex justify-between items-end border-t border-gray-100 pt-6">
            <div className="space-y-1">
              <p className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] italic">
                CDX ERP SYSTEM
              </p>
              <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                End of financial report • Accounting Integrity Verified
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1">
                Financial Protocol Secured
              </p>
              <div className="text-[10px] text-gray-400 font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                Verif-ID:{' '}
                <span className="text-primary font-black tracking-widest italic ml-1 underline">
                  {new Date().getTime().toString(16).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ReportPreviewModal>
    </div>
  );
};
