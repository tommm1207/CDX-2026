import { useState, useEffect, FormEvent } from 'react';
import { Plus, Search, ChevronRight, X, ArrowUpCircle, Edit, Navigation, Trash2, PackagePlus, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { ToastType } from '../shared/Toast';
import { ConfirmModal } from '../shared/ConfirmModal';
import { QuickAddMaterialModal } from '../shared/QuickAddMaterialModal';
import { FAB } from '../shared/FAB';
import { useInventoryData } from '@/hooks/useInventoryData';
import { formatDate, formatCurrency, formatNumber } from '@/utils/format';
import { isUUID, generateCode, getAllowedWarehouses } from '@/utils/helpers';
import { Button } from '../shared/Button';
import { getAvailableStock } from '@/utils/inventory';

export const StockOut = ({ user, onBack, addToast, initialAction }: { 
  user: Employee, 
  onBack?: () => void,
  addToast?: (message: string, type?: ToastType) => void,
  initialAction?: string 
}) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(initialAction === 'add');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Tất cả');

  const { warehouses, materials, groups, refreshAll, fetchWarehouses } = useInventoryData(user.data_view_permission);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    material_id: '',
    quantity: 0,
    unit_price: 0,
    notes: '',
    status: 'Chờ duyệt',
    export_code: generateCode('XK')
  };

  const [stockLoading, setStockLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
  }, [statusFilter]);

  useEffect(() => {
    if (formData.warehouse_id && formData.material_id && formData.date) {
      checkStock();
    } else {
      setAvailableStock(null);
    }
  }, [formData.warehouse_id, formData.material_id, formData.date, editingId]);

  const checkStock = async () => {
    const wh = warehouses.find(w => w.name === formData.warehouse_id || w.id === formData.warehouse_id);
    const mat = materials.find(m => m.name === formData.material_id || m.id === formData.material_id);

    if (!wh?.id || !mat?.id || !formData.date) return;

    setStockLoading(true);
    try {
      // Lấy tồn kho tích lũy đến đúng ngày của phiếu xuất.
      // Truyền editingId để loại trừ phiếu đang sửa khỏi tongXuat (tránh double-count).
      const stock = await getAvailableStock(mat.id, wh.id, formData.date, editingId || undefined);
      setAvailableStock(stock);
    } catch (err) {
      console.error('Error checking stock:', err);
    } finally {
      setStockLoading(false);
    }
  };

  const fetchSlips = async () => {
    setLoading(true);
    try {
      let query = supabase.from('stock_out').select('*, warehouses(name, code), materials(name, code, unit)');
      
      if (statusFilter !== 'Tất cả') {
        query = query.eq('status', statusFilter);
      }

      const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
      if (allowedWhIds) {
        query = query.in('warehouse_id', allowedWhIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching stock_out:', error);
        const { data: fallbackData, error: fallbackError } = await supabase.from('stock_out').select('*').order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        setSlips(fallbackData || []);
      } else {
        setSlips(data || []);
      }
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải phiếu xuất kho: ' + err.message, 'error');
      else alert('Lỗi tải phiếu xuất kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Explicit validation since custom components don't always trigger HTML5 forms properly
    if (!formData.warehouse_id) {
      if (addToast) addToast("Vui lòng chọn hoặc nhập Kho xuất.", "error");
      else alert("Vui lòng chọn hoặc nhập Kho xuất.");
      return;
    }
    if (!formData.material_id) {
      if (addToast) addToast("Vui lòng chọn hoặc nhập Vật tư xuất.", "error");
      else alert("Vui lòng chọn hoặc nhập Vật tư xuất.");
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      if (addToast) addToast("Vui lòng nhập số lượng xuất hợp lệ (lớn hơn 0).", "error");
      else alert("Vui lòng nhập số lượng xuất hợp lệ (lớn hơn 0).");
      return;
    }

    setSubmitting(true);
    try {
      let finalWarehouseId = formData.warehouse_id;
      if (formData.warehouse_id && !isUUID(formData.warehouse_id)) {
        const whByName = warehouses.find(w => w.name.toLowerCase() === formData.warehouse_id.toLowerCase());
        if (whByName) {
          finalWarehouseId = whByName.id;
        } else {
          const random = Math.floor(100 + Math.random() * 900);
          const code = `K${(warehouses.length + 1).toString().padStart(2, '0')}-${random}`;
          const { data: newWh, error: whErr } = await supabase.from('warehouses').insert([{ name: formData.warehouse_id, code }]).select();
          if (whErr) throw whErr;
          if (newWh) {
            finalWarehouseId = newWh[0].id;
            fetchWarehouses();
          }
        }
      }

      let finalMaterialId = formData.material_id;
      if (formData.material_id && !isUUID(formData.material_id)) {
        const matByName = materials.find(m => m.name.toLowerCase() === formData.material_id.toLowerCase());
        if (matByName) {
          finalMaterialId = matByName.id;
        } else {
          throw new Error('Bạn phải chọn vật tư từ Danh mục, không được tự nhập mới!');
        }
      }

      // Kiểm tra tồn kho tại ngày của phiếu xuất.
      // Loại trừ phiếu đang sửa (editingId) để không bị trừ double.
      const wh = warehouses.find(w => w.name === finalWarehouseId || w.id === finalWarehouseId);
      const stockAtDate = await getAvailableStock(
        finalMaterialId,
        wh?.id || finalWarehouseId,
        formData.date,
        isEditing && selectedSlip ? selectedSlip.id : undefined
      );
      if (Number(formData.quantity) > stockAtDate) {
        throw new Error(`Không đủ tồn kho tại ngày ${formData.date}! Tồn hiện có: ${stockAtDate}, cần xuất: ${formData.quantity}.`);
      }

      const payload = {
        ...formData,
        warehouse_id: finalWarehouseId,
        material_id: finalMaterialId,
        employee_id: user.id,
        status: 'Chờ duyệt',
        total_amount: formData.quantity * formData.unit_price,
        export_code: formData.export_code || generateCode('XK'),
        notes: isEditing 
          ? `[SỬA lúc ${new Date().toLocaleString('vi-VN')}] ${formData.notes.replace(/^\[SỬA lúc .*?\]\s*/, '')}` 
          : formData.notes
      };

      if (isEditing && selectedSlip) {
        const { error } = await supabase.from('stock_out').update(payload).eq('id', selectedSlip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stock_out').insert([payload]);
        if (error) throw error;

      }

      setShowModal(false);
      fetchSlips();
      setFormData(initialFormState);
      setIsEditing(false);
      setEditingId(null);
      setSelectedSlip(null);
      if (addToast) addToast(isEditing ? 'Đã cập nhật phiếu xuất!' : 'Đã lưu phiếu xuất kho!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('stock_out').update({ status }).eq('id', id);
      if (error) throw error;
      
      if (status === 'Đã duyệt') {
        const { data: slip } = await supabase.from('stock_out').select('*, users(id)').eq('id', id).maybeSingle();
        if (slip && (slip as any).total_amount > 0) {
          // Check if cost already exists to prevent duplicates
          const { data: existingCost } = await supabase
            .from('costs')
            .select('id')
            .ilike('content', `%${slip.export_code || slip.id.slice(0,8)}%`)
            .maybeSingle();

          if (!existingCost) {
            const dateObj = new Date(slip.date);
            const d = String(dateObj.getDate()).padStart(2, '0');
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const y = String(dateObj.getFullYear()).slice(-2);
            const random = Math.floor(1000 + Math.random() * 9000);
            const userPrefix = (slip as any).users?.id?.slice(0, 4) || 'SYS';
            const costCode = `CP-${userPrefix.toUpperCase()}-${d}${m}${y}-${random}`;

            await supabase.from('costs').insert([{
              transaction_type: 'Thu',
              cost_code: costCode,
              date: slip.date,
              employee_id: user.id,
              cost_type: 'Doanh thu',
              content: `Xuất kho từ phiếu ${slip.export_code || slip.id.slice(0,8)}`,
              material_id: slip.material_id,
              warehouse_id: slip.warehouse_id,
              quantity: slip.quantity,
              unit: (slip as any).unit,
              unit_price: (slip as any).unit_price,
              total_amount: (slip as any).total_amount,
              notes: 'Tự động tạo từ hệ thống Xuất Kho'
            }]);
          }
        }
      }

      fetchSlips();
      setShowDetailModal(false);
      if (addToast) addToast('Cập nhật trạng thái thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    }
  };

  const handleDelete = () => {
    if (!selectedSlip) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from('stock_out').update({ status: 'Đã xóa' }).eq('id', selectedSlip.id);
      if (error) throw error;

      // Also void associated cost
      await supabase.from('costs')
        .update({ status: 'Đã xóa' })
        .ilike('content', `%${selectedSlip.export_code || selectedSlip.id.slice(0,8)}%`);
      
      if (addToast) addToast('Đã chuyển phiếu vào thùng rác', 'success');
      setShowDetailModal(false);
      setShowDeleteConfirm(false);
      fetchSlips();
    } catch (err: any) {
      const msg = err.message.includes('foreign key constraint') 
        ? 'Không thể xóa phiếu này vì đang có dữ liệu liên quan khác.' 
        : err.message;
      if (addToast) addToast('Lỗi: ' + msg, 'error');
      else alert('Lỗi: ' + msg);
    }
  };

  const handleRowClick = (slip: any) => {
    setSelectedSlip(slip);
    setShowDetailModal(true);
  };

  const handleEdit = () => {
    setFormData({
      date: selectedSlip.date,
      warehouse_id: selectedSlip.warehouse_id,
      material_id: selectedSlip.material_id,
      quantity: selectedSlip.quantity,
      unit_price: selectedSlip.unit_price || 0,
      notes: selectedSlip.notes?.replace(/^\[SỬA lúc .*?\]\s*/, '') || '',
      export_code: selectedSlip.export_code || formData.export_code,
      status: 'Chờ duyệt'
    });
    setIsEditing(true);
    setEditingId(selectedSlip.id);  // lưu id để loại trừ khỏi tính tồn
    setShowDetailModal(false);
    setShowModal(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Xuất kho" onBack={onBack} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowUpCircle className="text-red-500" /> Xuất kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý phiếu xuất vật tư khỏi kho</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(f => !f)}
            className={`p-2.5 rounded-xl border transition-colors ${
              showFilter ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
            }`}
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Lọc theo trạng thái</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                {['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${statusFilter === status
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">SL</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : slips.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Chưa có phiếu xuất nào</td></tr>
              ) : (
                slips.map((item) => (
                  <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                      <p>{item.warehouses?.name}</p>
                      <p className="text-[10px] text-gray-400">#{item.warehouses?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{item.materials?.name}</p>
                      <p className="text-[10px] text-gray-400">#{item.materials?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 text-center font-bold">-{item.quantity}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Đã duyệt' ? 'bg-green-100 text-green-600' :
                            item.status === 'Từ chối' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                          {item.status || 'Chờ duyệt'}
                        </span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-primary transition-colors" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel — slide-up mobile, side panel desktop */}
      <AnimatePresence>
        {showDetailModal && selectedSlip && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailModal(false)}
              className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed inset-x-0 bottom-0 z-[111] bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90dvh]
                         md:inset-x-auto md:inset-y-0 md:right-0 md:w-[420px] md:rounded-t-none md:rounded-l-3xl md:max-h-full"
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            >
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowDetailModal(false)} className="w-9 h-9 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-200 transition-colors cursor-pointer">
                    <ArrowUpCircle size={18} />
                  </button>
                  <div>
                    <p className="text-sm font-black text-red-600">{selectedSlip.export_code}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Phiếu xuất kho</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {[
                  { label: 'Ngày xuất', value: formatDate(selectedSlip.date) },
                  { label: 'Kho xuất', value: selectedSlip.warehouses?.name, sub: `Mã: ${selectedSlip.warehouses?.code || '—'}` },
                  { label: 'Vật tư', value: selectedSlip.materials?.name, sub: `Mã: ${selectedSlip.materials?.code || '—'}` },
                  { label: 'Số lượng', value: `-${formatNumber(selectedSlip.quantity)}`, highlight: true },
                  { label: 'Đơn giá bán', value: formatCurrency(selectedSlip.unit_price || 0) },
                  { label: 'Thành tiền', value: formatCurrency(selectedSlip.total_amount || 0) },
                  { label: 'Ghi chú', value: selectedSlip.notes || '—' },
                  { label: 'Trạng thái', value: selectedSlip.status || 'Chờ duyệt' },
                ].map(({ label, value, sub, highlight }) => (
                  <div key={label} className="flex justify-between items-start border-b border-gray-50 pb-3 gap-4">
                    <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0">{label}</span>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${highlight ? 'text-red-600 font-bold' : 'text-gray-800'}`}>{value || '—'}</p>
                      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
                {selectedSlip.status !== 'Đã xóa' && (user.role === 'Admin' || user.role === 'Admin App') && selectedSlip.status === 'Chờ duyệt' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button fullWidth variant="danger" icon={X} onClick={() => handleApprove(selectedSlip.id, 'Từ chối')}>Từ chối</Button>
                    <Button fullWidth variant="success" icon={Check} onClick={() => handleApprove(selectedSlip.id, 'Đã duyệt')}>Duyệt</Button>
                  </div>
                )}
                {selectedSlip.status !== 'Đã xóa' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button fullWidth variant="outline" icon={Trash2} onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50">Thùng rác</Button>
                    <Button fullWidth variant="outline" icon={Edit} onClick={handleEdit} className="text-gray-700 hover:bg-gray-50">Sửa</Button>
                  </div>
                )}
                <Button fullWidth variant="outline" icon={ChevronDown} onClick={() => setShowDetailModal(false)} className="text-gray-600 hover:bg-gray-50">Đóng</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm h-[100dvh] w-full"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90dvh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-red-600 p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowModal(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer">
                    <ArrowUpCircle size={24} />
                  </button>
                  <h3 className="font-bold text-lg">{isEditing ? 'Sửa phiếu xuất kho' : 'Lập phiếu xuất kho'}</h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-32">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày xuất *</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.date} 
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-600/20" 
                      />
                      <p className="text-[10px] text-gray-400">Tồn kho sẽ được kiểm tra tại ngày này</p>
                    </div>

                    <CreatableSelect
                      label="Kho xuất *"
                      value={formData.warehouse_id}
                      options={warehouses}
                      onChange={(val) => setFormData({ ...formData, warehouse_id: val })}
                      onCreate={(val) => setFormData({ ...formData, warehouse_id: val })}
                      placeholder="Chọn kho..."
                      required
                    />

                    <div className="flex items-end gap-2 relative z-[120]">
                      <div className="flex-1">
                        <CreatableSelect
                          label="Vật tư *"
                          value={formData.material_id}
                          options={materials}
                          onChange={(val) => setFormData({ ...formData, material_id: val })}
                          onCreate={() => addToast?.('Vui lòng chọn vật tư có trong Danh mục. Hoặc click nút + bên cạnh để tạo mới.', 'error')}
                          placeholder="Chọn vật tư..."
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddMaterial(true)}
                        className="h-[42px] px-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center shrink-0 border border-blue-100"
                        title="Thêm vật tư nhanh"
                      >
                        <PackagePlus size={20} />
                      </button>
                    </div>

                    {stockLoading && (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase animate-pulse">Đang kiểm tra tồn kho...</p>
                      </div>
                    )}
                    {!stockLoading && availableStock !== null && (
                      <div className={`p-3 rounded-xl border ${
                        availableStock <= 0
                          ? 'bg-red-50 border-red-100'
                          : availableStock <= 5
                          ? 'bg-amber-50 border-amber-100'
                          : 'bg-blue-50 border-blue-100'
                      }`}>
                        <p className={`text-[10px] font-bold uppercase ${
                          availableStock <= 0 ? 'text-red-400' : availableStock <= 5 ? 'text-amber-400' : 'text-blue-400'
                        }`}>Tồn kho tại ngày {formData.date}</p>
                        <p className={`text-sm font-bold ${
                          availableStock <= 0 ? 'text-red-600' : availableStock <= 5 ? 'text-amber-600' : 'text-blue-600'
                        }`}>
                          {formatNumber(availableStock)} {materials.find(m => m.id === formData.material_id || m.name === formData.material_id)?.unit}
                          {availableStock <= 0 && ' ⚠ Không đủ tồn kho!'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <NumericInput
                      label="Số lượng xuất *"
                      required
                      value={formData.quantity}
                      onChange={(val) => setFormData({ ...formData, quantity: val })}
                    />

                    <NumericInput
                      label="Đơn giá bán"
                      value={formData.unit_price}
                      onChange={(val) => setFormData({ ...formData, unit_price: val })}
                      step={1000}
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú / Mục đích xuất</label>
                      <textarea rows={4} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-600/20 resize-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                    <Button
                      type="submit"
                      variant="danger"
                      isLoading={submitting}
                      disabled={availableStock !== null && Number(formData.quantity) > availableStock}
                      title={availableStock !== null && Number(formData.quantity) > availableStock ? `Không đủ tồn kho (tồn: ${availableStock})` : undefined}
                      className="min-w-[120px]"
                    >
                      {isEditing ? 'Cập nhật' : 'Lưu phiếu xuất'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <QuickAddMaterialModal
        show={showAddMaterial}
        onClose={() => setShowAddMaterial(false)}
        groups={groups}
        addToast={addToast}
        onSuccess={(newMat) => {
          setFormData({ ...formData, material_id: newMat.id });
          refreshAll();
        }}
      />

      <ConfirmModal
        show={showDeleteConfirm}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn chuyển phiếu xuất kho này vào thùng rác? Hành động này cũng sẽ vô hiệu hóa bản ghi doanh thu liên quan."
        confirmText="Chuyển vào thùng rác"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* FAB — Lập phiếu xuất */}
      <FAB
        onClick={() => {
          setFormData({ ...initialFormState, export_code: generateCode('XK') });
          setIsEditing(false);
          setEditingId(null);
          setShowModal(true);
        }}
        label="Lập phiếu xuất"
      />
    </div>
  );
};
