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
} from 'lucide-react';
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
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [showFilter, setShowFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_costs_${user.id}`) as SortOption) || 'newest',
  );

  const [employees, setEmployees] = useState<any[]>([]);
  const [costItems, setCostItems] = useState<any[]>([]);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'Chi',
    cost_type: '', // Group
    content: '', // Item
    notes: '', // Free text
    warehouse_id: '',
    warehouse_name: '',
    quantity: 1,
    unit: '',
    total_amount: 0,
  };

  const [formData, setFormData] = useState<any>(initialFormState);

  useEffect(() => {
    fetchCosts();
  }, [statusFilter]);

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

  const fetchCostTypes = async () => {
    const { data } = await supabase.from('costs').select('cost_type');
    if (data) {
      const uniqueTypes = Array.from(new Set(data.map((item) => item.cost_type)))
        .filter(Boolean)
        .map((name) => ({ id: name as string, name: name as string }));
      setCostTypes(uniqueTypes);
    }
  };

  const fetchUnits = async () => {
    const { data } = await supabase.from('costs').select('unit');
    if (data) {
      const uniqueUnits = Array.from(new Set(data.map((item) => item.unit)))
        .filter(Boolean)
        .map((name) => ({ id: name, name }));
      setUnits(uniqueUnits);
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

      const payload = {
        cost_code: isEditing
          ? formData.cost_code
          : `CP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        date: formData.date,
        transaction_type: formData.transaction_type,
        cost_type: formData.cost_type, // Nhóm
        content: formData.content, // Chi tiết
        notes: formData.notes, // Ghi chú tự do
        warehouse_id,
        quantity: formData.quantity,
        unit: formData.unit,
        total_amount: formData.total_amount,
        employee_id: user.id,
        status: isEditing ? (formData.status === 'Đã duyệt' ? 'Đã duyệt' : 'Chờ duyệt') : 'Chờ duyệt',
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteClick = (item: any) => {
    setItemToDelete(item.id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await supabase.from('costs').update({ status: 'Đã xóa' }).eq('id', itemToDelete);
      fetchCosts();
      if (addToast) addToast('Đã chuyển vào thùng rác', 'success');
      setShowDeleteModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
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
      return 0;
    });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Quản lý Chi phí" onBack={onBack} />
        <div className="flex items-center gap-2">
          <ExcelButton onClick={exportToExcel} />
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => setSortBy(val)}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'price', label: 'Thành tiền' },
              { value: 'date', label: 'Ngày chi' },
            ]}
          />
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter(!showFilter)}
            icon={Search}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Tổng Thu',
            val: formatCurrency(
              filteredCosts
                .filter((c) => c.transaction_type === 'Thu')
                .reduce((s, c) => s + Number(c.total_amount), 0),
            ),
            color: 'green',
            icon: ArrowDownCircle,
          },
          {
            label: 'Tổng Chi',
            val: formatCurrency(
              filteredCosts
                .filter((c) => c.transaction_type !== 'Thu')
                .reduce((s, c) => s + Number(c.total_amount), 0),
            ),
            color: 'red',
            icon: ArrowUpCircle,
          },
          {
            label: 'Lợi Nhuận',
            val: formatCurrency(
              filteredCosts
                .filter((c) => c.transaction_type === 'Thu')
                .reduce((s, c) => s + Number(c.total_amount), 0) -
                filteredCosts
                  .filter((c) => c.transaction_type !== 'Thu')
                  .reduce((s, c) => s + Number(c.total_amount), 0),
            ),
            color: 'blue',
            icon: Wallet,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-white p-4 rounded-2xl shadow-sm border border-${stat.color}-100 flex items-center gap-4`}
          >
            <div
              className={`w-12 h-12 bg-${stat.color}-50 text-${stat.color}-600 rounded-full flex items-center justify-center shrink-0`}
            >
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">{stat.label}</p>
              <p className={`text-xl font-black text-${stat.color}-600`}>{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-3 py-2 rounded-lg border text-xs"
              />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-3 py-2 rounded-lg border text-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border text-xs"
              >
                {['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã xóa'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm..."
                className="px-3 py-2 rounded-lg border text-xs"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white text-[10px] font-bold uppercase">
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Hạng mục</th>
                <th className="px-4 py-3">Nội dung</th>
                <th className="px-4 py-3 text-right">Số tiền</th>
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
                  <td className="px-4 py-3">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3 font-bold text-primary">{item.cost_code}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full ${item.transaction_type === 'Thu' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                    >
                      {item.transaction_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.cost_type}</td>
                  <td className="px-4 py-3">{item.content}</td>
                  <td
                    className={`px-4 py-3 font-bold text-right ${item.transaction_type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}
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
                  <span className="font-medium">{new Date(selectedCost.date).toLocaleDateString('vi-VN')}</span>
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
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Nội dung thu chi:</span>
                  <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded-lg">{selectedCost.notes || 'Không có ghi chú'}</p>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400">Số tiền:</span>
                  <span className={`font-black text-lg ${selectedCost.transaction_type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedCost.total_amount)}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button fullWidth variant="danger" onClick={() => handleDeleteClick(selectedCost)}>
                  Xóa
                </Button>
                <Button fullWidth variant="primary" onClick={() => handleEdit(selectedCost)}>
                  Sửa
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-3xl p-6 shadow-2xl z-10 text-center"
            >
              <h3 className="font-bold text-lg mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-gray-500 mb-6">Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <Button onClick={() => setShowDeleteModal(false)}>Hủy</Button>
                <Button variant="danger" onClick={confirmDelete}>
                  Xóa
                </Button>
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
                      {(formData as any).cost_code ||
                        `CP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-001`}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    label="Số tiền *"
                    required
                    value={formData.total_amount}
                    onChange={(val) => setFormData({ ...formData, total_amount: val })}
                  />
                  <textarea
                    rows={3}
                    placeholder="Ghi chú..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border resize-none"
                  ></textarea>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowModal(false)}>
                      Hủy
                    </Button>
                    <Button type="submit" variant="primary" isLoading={submitting}>
                      Lưu bản ghi
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FAB
        onClick={() => {
          setIsEditing(false);
          setFormData(initialFormState);
          setShowModal(true);
        }}
        label="Thêm chi phí"
        color="bg-primary"
      />
    </div>
  );
};
