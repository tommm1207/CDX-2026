import { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import { Wallet, Plus, Search, Edit, Trash2, X, FileSpreadsheet, Info, ChevronDown, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { utils, writeFile } from 'xlsx';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { ToastType } from '../shared/Toast';
import { formatCurrency, formatNumber, formatDate } from '../../utils/format';
import { isUUID, getAllowedWarehouses } from '../../utils/helpers';
import { isActiveWarehouse } from '../../utils/inventory';

export const Costs = ({ user, onBack, addToast }: { 
  user: Employee, 
  onBack?: () => void,
  addToast?: (message: string, type?: ToastType) => void
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
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

  const [employees, setEmployees] = useState<any[]>([]);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'Chi',
    cost_type: '',
    content: '',
    warehouse_name: '',
    quantity: 0,
    unit: '',
    total_amount: 0,
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchCosts();
    fetchMaterials();
    fetchWarehouses();
    fetchCostTypes();
    fetchUnits();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('users').select('id, full_name, code').neq('status', 'Nghỉ việc');
    if (data) setEmployees(data);
  };

  const fetchCosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('costs')
        .select('*, users(full_name), warehouses(name), materials(name)')
        .or('status.is.null,status.neq.Đã xóa');

      const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
      if (allowedWhIds) {
        query = query.in('warehouse_id', allowedWhIds);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        console.error('Error fetching costs:', error);
        const { data: fallbackData, error: fallbackError } = await supabase.from('costs').select('*').or('status.is.null,status.neq.Đã xóa').order('date', { ascending: false });
        if (fallbackError) throw fallbackError;
        setCosts(fallbackData || []);
      } else {
        setCosts(data || []);
      }
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải danh sách chi phí: ' + err.message, 'error');
      else alert('Lỗi tải danh sách chi phí: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('id, name').or('status.is.null,status.neq.Đã xóa');
    if (data) setMaterials(data);
  };

  const fetchWarehouses = async () => {
    let query = supabase.from('warehouses').select('id, name, status').or('status.is.null,status.neq.Đã xóa');
    
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
      const uniqueTypes = Array.from(new Set(data.map(item => item.cost_type)))
        .filter(Boolean)
        .map((name) => ({ id: name as string, name: name as string }));
      setCostTypes(uniqueTypes);
    }
  };

  const fetchUnits = async () => {
    const { data } = await supabase.from('costs').select('unit');
    if (data) {
      const uniqueUnits = Array.from(new Set(data.map(item => item.unit)))
        .filter(Boolean)
        .map((name) => ({ id: name, name }));
      setUnits(uniqueUnits);
    }
  };

  const ensureValueExists = async (table: string, name: string, currentList: any[], fetchFn: () => void) => {
    if (!name) return null;
    if (isUUID(name)) return name;

    if (table === 'costs') return null;

    const existing = currentList.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    let code = '';
    const random = Math.floor(100 + Math.random() * 900);
    if (table === 'warehouses') {
      code = `K${(currentList.length + 1).toString().padStart(2, '0')}-${random}`;
    } else if (table === 'materials') {
      code = `VT${(currentList.length + 1).toString().padStart(3, '0')}-${random}`;
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
      const warehouse_id = await ensureValueExists('warehouses', formData.warehouse_name, warehouses, fetchWarehouses);
      
      const isContentUuid = isUUID(formData.content);
      const finalContent = isContentUuid ? materials.find(m => m.id === formData.content)?.name || formData.content : formData.content;
      const material_id = await ensureValueExists('materials', finalContent, materials, fetchMaterials);

      const dateObj = new Date(formData.date);
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = String(dateObj.getFullYear()).slice(-2);
      const random = Math.floor(1000 + Math.random() * 9000);
      const userPrefix = user.code || user.id.slice(0, 4);
      const finalCode = `CP-${userPrefix.toUpperCase()}-${d}${m}${y}-${random}`;

      const payload: any = {
        date: formData.date,
        transaction_type: formData.transaction_type,
        cost_code: finalCode,
        employee_id: user.id,
        cost_type: formData.cost_type,
        content: finalContent,
        warehouse_id: warehouse_id,
        material_id: material_id,
        quantity: formData.quantity,
        unit: formData.unit,
        total_amount: formData.total_amount,
        notes: formData.notes,
        status: 'Đã duyệt'
      };

      let error;
      if (isEditing && editingId) {
        const { error: err } = await supabase.from('costs').update(payload).eq('id', editingId);
        error = err;
      } else {
        const { error: err } = await supabase.from('costs').insert([payload]);
        error = err;
      }

      if (error) throw error;

      setShowModal(false);
      setFormData(initialFormState);
      setIsEditing(false);
      setEditingId(null);
      fetchCosts();
      fetchCostTypes();
      fetchUnits();
      if (addToast) addToast(isEditing ? 'Cập nhật thành công!' : 'Nhập chi phí thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      date: item.date,
      transaction_type: item.transaction_type || 'Chi',
      cost_type: item.cost_type,
      content: item.content || '',
      warehouse_name: item.warehouses?.name || '',
      quantity: item.quantity,
      unit: item.unit || '',
      total_amount: item.total_amount,
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setIsEditing(true);
    setShowModal(true);
    setShowDetailModal(false);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('costs').update({ status: 'Đã xóa' }).eq('id', itemToDelete);
      if (error) throw error;
      fetchCosts();
      if (addToast) addToast('Đã chuyển vào thùng rác', 'success');
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      const msg = err.message.includes('foreign key constraint') 
        ? 'Không thể xóa vì đang có dữ liệu liên quan khác.' 
        : err.message;
      if (addToast) addToast('Lỗi: ' + msg, 'error');
      else alert('Lỗi khi xóa chi phí: ' + msg);
    }
  };

  const exportToExcel = () => {
    const data = costs.map(item => ({
      'Mã chứng từ': item.cost_code,
      'Ngày': item.date,
      'Loại giao dịch': item.transaction_type || 'Chi',
      'Người lập': item.users?.full_name || item.employee_id,
      'Hạng mục': item.cost_type,
      'Nội dung': item.content,
      'Vật tư': item.materials?.name || '',
      'Kho': item.warehouses?.name || '',
      'Số lượng': item.quantity,
      'ĐVT': item.unit,
      'Thành tiền': item.total_amount,
      'Ghi chú': item.notes
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Chi phí");
    writeFile(wb, `QuanLyChiPhi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredCosts = costs.filter(item => {
    let match = true;
    if (filterStartDate && item.date < filterStartDate) match = false;
    if (filterEndDate && item.date > filterEndDate) match = false;
    if (filterEmployeeId && item.employee_id !== filterEmployeeId) match = false;
    if (filterWarehouseId && item.warehouse_id !== filterWarehouseId) match = false;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const contentMatched = (item.content || '').toLowerCase().includes(lowerSearch);
      const codeMatched = (item.cost_code || '').toLowerCase().includes(lowerSearch);
      const notesMatched = (item.notes || '').toLowerCase().includes(lowerSearch);
      const matMatched = (item.materials?.name || '').toLowerCase().includes(lowerSearch);
      const typeMatched = (item.cost_type || '').toLowerCase().includes(lowerSearch);
      if (!contentMatched && !codeMatched && !notesMatched && !matMatched && !typeMatched) {
        match = false;
      }
    }
    return match;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Quản lý Chi phí" onBack={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="text-primary" /> Tiền vào - Tiền ra
          </h2>
          <p className="text-xs text-gray-500 mt-1">Theo dõi các khoản thu chi và lợi nhuận</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <FileSpreadsheet size={18} className="text-green-600" /> Xuất Excel
          </motion.button>
          <button
            onClick={() => { setIsEditing(false); setFormData(initialFormState); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
          >
            <Plus size={18} /> Nhập giao dịch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Tổng Thu</p>
            <p className="text-xl font-black text-green-600">
              {formatCurrency(filteredCosts.filter(c => c.transaction_type === 'Thu').reduce((sum, c) => sum + Number(c.total_amount || 0), 0))}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0">
            <ArrowUpCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Tổng Chi</p>
            <p className="text-xl font-black text-red-600">
              {formatCurrency(filteredCosts.filter(c => c.transaction_type !== 'Thu').reduce((sum, c) => sum + Number(c.total_amount || 0), 0))}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Lợi Nhuận Gộp</p>
            <p className="text-xl font-black text-blue-600">
              {formatCurrency(
                filteredCosts.filter(c => c.transaction_type === 'Thu').reduce((sum, c) => sum + Number(c.total_amount || 0), 0) -
                filteredCosts.filter(c => c.transaction_type !== 'Thu').reduce((sum, c) => sum + Number(c.total_amount || 0), 0)
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
          <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
          <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự</label>
          <select value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">-- Tất cả --</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.code})</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
          <select value={filterWarehouseId} onChange={(e) => setFilterWarehouseId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">-- Tất cả kho --</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Gõ để tìm..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Mã / Ngày</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Loại GD</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Tên kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Hạng mục</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Nội dung</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-center">SL</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-center">ĐVT</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-right">Số tiền</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Người lập</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredCosts.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 italic">Không tìm thấy chi phí phù hợp với bộ lọc</td></tr>
              ) : (
                filteredCosts.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => { setSelectedCost(item); setShowDetailModal(true); }}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-primary">{item.cost_code}</div>
                      <div className="text-[10px] text-gray-500">{new Date(item.date).toLocaleDateString('vi-VN')}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded-full ${item.transaction_type === 'Thu' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {item.transaction_type || 'Chi'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.warehouses?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.cost_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.materials?.name || item.content}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{item.unit}</td>
                    <td className={`px-4 py-3 text-xs font-bold text-right ${item.transaction_type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.transaction_type === 'Thu' ? '+' : '-'}{formatCurrency(item.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        item.status === 'Đã duyệt' ? 'bg-green-100 text-green-700' :
                        item.status === 'Từ chối' ? 'bg-red-100 text-red-700' :
                        item.status === 'Đã hoàn thành' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status || 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.users?.full_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showDetailModal && selectedCost && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Wallet size={24} /></div>
                  <h3 className="font-bold text-lg">Chi tiết chi phí</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Mã chứng từ</p>
                    <p className="font-bold text-primary">{selectedCost.cost_code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ngày chi</p>
                    <p className="font-medium">{new Date(selectedCost.date).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Người chi</p>
                    <p className="font-medium">{selectedCost.users?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Kho</p>
                    <p className="font-medium">{selectedCost.warehouses?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Loại chi phí</p>
                    <p className="font-medium">{selectedCost.cost_type}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Nội dung</p>
                    <p className="font-medium">{selectedCost.content}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Số lượng</p>
                    <p className="font-medium">{selectedCost.quantity} {selectedCost.unit}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Số tiền</p>
                    <p className="font-bold text-red-600 text-lg">{selectedCost.total_amount.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-1 ${
                      selectedCost.status === 'Đã duyệt' ? 'bg-green-100 text-green-700' :
                      selectedCost.status === 'Từ chối' ? 'bg-red-100 text-red-700' :
                      selectedCost.status === 'Đã hoàn thành' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedCost.status || 'Chờ duyệt'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</p>
                    <p className="text-gray-600 italic">{selectedCost.notes || 'Không có ghi chú'}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  {selectedCost.status !== 'Đã duyệt' && selectedCost.status !== 'Từ chối' && selectedCost.status !== 'Đã hoàn thành' && (
                    <button
                      onClick={() => handleEdit(selectedCost)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 transition-colors"
                    >
                      <Edit size={18} /> Sửa
                    </button>
                  )}
                  <button
                    onClick={() => { setShowDetailModal(false); handleDeleteClick(selectedCost.id); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} /> Chuyển vào thùng rác
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Chuyển vào thùng rác?</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn chuyển bản ghi này vào thùng rác?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
                  >
                    Di chuyển
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Wallet size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật chi phí' : 'Nhập chi phí'}</h3>
                    <p className="text-xs text-white/70">Vui lòng điền đầy đủ thông tin chi phí</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit}>
                  <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex items-start gap-3 border border-blue-100">
                    <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Sử dụng form này để nhập tay các khoản <strong>Thu</strong> (doanh thu, thanh lý) hoặc khoản <strong>Chi</strong> (mua sắm ngoài hệ thống kho).
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Loại giao dịch *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer bg-green-50 px-4 py-2 rounded-xl text-sm font-bold text-green-700 border border-green-200">
                        <input type="radio" name="transType" checked={formData.transaction_type === 'Thu'} onChange={() => setFormData({ ...formData, transaction_type: 'Thu' })} className="accent-green-600 w-4 h-4 cursor-pointer" />
                        Khoản Thu (Tiền vào)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-red-50 px-4 py-2 rounded-xl text-sm font-bold text-red-700 border border-red-200">
                        <input type="radio" name="transType" checked={formData.transaction_type === 'Chi'} onChange={() => setFormData({ ...formData, transaction_type: 'Chi' })} className="accent-red-600 w-4 h-4 cursor-pointer" />
                        Khoản Chi (Tiền ra)
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày chi *</label>
                          <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Người lập</label>
                          <input
                            type="text"
                            readOnly
                            value={user.full_name}
                            className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 outline-none"
                          />
                        </div>
                      </div>

                      <CreatableSelect
                        label="Loại chi phí *"
                        value={formData.cost_type}
                        options={costTypes}
                        onChange={(val) => setFormData({ ...formData, cost_type: val })}
                        onCreate={(val) => setFormData({ ...formData, cost_type: val })}
                        placeholder="Chọn loại chi phí..."
                        required
                      />

                      <CreatableSelect
                        label="Tên kho *"
                        value={formData.warehouse_name}
                        options={warehouses}
                        onChange={(val) => setFormData({ ...formData, warehouse_name: val })}
                        onCreate={(val) => setFormData({ ...formData, warehouse_name: val })}
                        placeholder="Chọn kho..."
                        required
                      />

                      <CreatableSelect
                        label={formData.transaction_type === 'Thu' ? "Nội dung thu *" : "Nội dung chi *"}
                        value={formData.content}
                        options={materials}
                        onChange={(val) => setFormData({ ...formData, content: val })}
                        onCreate={(val) => setFormData({ ...formData, content: val })}
                        placeholder="Chọn nội dung..."
                        required
                      />
                    </div>

                    <div className="space-y-4">
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
                          placeholder="Chọn/Nhập..."
                        />
                      </div>

                      <NumericInput
                        label="Số tiền *"
                        required
                        value={formData.total_amount}
                        onChange={(val) => setFormData({ ...formData, total_amount: val })}
                        inputClassName="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold text-primary"
                      />

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                        <textarea
                          rows={3}
                          placeholder="Ghi chú thêm..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu chi phí'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
