import { useState, useEffect, FormEvent } from 'react';
import { Search, Plus, ArrowLeftRight, Edit, Trash2, ChevronDown, X, PackagePlus, ArrowDownCircle } from 'lucide-react';
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
import { formatDate, formatNumber } from '@/utils/format';
import { isUUID, generateCode, getAllowedWarehouses } from '@/utils/helpers';
import { getAvailableStock } from '@/utils/inventory';
import { Button } from '../shared/Button';

export const Transfer = ({ user, onBack, addToast, initialAction }: { 
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
  const [stockLoading, setStockLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  const { warehouses, materials, groups, refreshAll, fetchWarehouses } = useInventoryData(user.data_view_permission);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Tất cả');


  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    from_warehouse_id: '',
    to_warehouse_id: '',
    material_id: '',
    quantity: 0,
    notes: '',
    status: 'Chờ duyệt',
    transfer_code: generateCode('LC')
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
  }, [statusFilter]);

  useEffect(() => {
    if (formData.from_warehouse_id && formData.material_id && formData.date) {
      checkStock();
    } else {
      setAvailableStock(null);
    }
  }, [formData.from_warehouse_id, formData.material_id, formData.date, editingId]);

  const checkStock = async () => {
    try {
      const fromWh = warehouses.find(w => w.name === formData.from_warehouse_id || w.id === formData.from_warehouse_id);
      const mat = materials.find(m => m.name === formData.material_id || m.id === formData.material_id);

      if (!fromWh?.id || !mat?.id || !formData.date) return;

      setStockLoading(true);
      const stock = await getAvailableStock(mat.id, fromWh.id, formData.date, editingId || undefined);
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
      let query = supabase.from('transfers').select('*, from_wh:warehouses!from_warehouse_id(name, code), to_wh:warehouses!to_warehouse_id(name, code), materials(name, code, unit)');
      
      if (statusFilter !== 'Tất cả') {
        query = query.eq('status', statusFilter);
      }

      const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
      if (allowedWhIds) {
        query = query.or(`from_warehouse_id.in.(${allowedWhIds.join(',')}),to_warehouse_id.in.(${allowedWhIds.join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching transfers:', error);
        const { data: fallbackData, error: fallbackError } = await supabase.from('transfers').select('*').order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        setSlips(fallbackData || []);
      } else {
        setSlips(data || []);
      }
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải phiếu luân chuyển: ' + err.message, 'error');
      else alert('Lỗi tải phiếu luân chuyển: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.from_warehouse_id === formData.to_warehouse_id && formData.from_warehouse_id !== '') {
      if (addToast) addToast('Kho nguồn và kho đích không được trùng nhau!', 'error');
      else alert('Kho nguồn và kho đích không được trùng nhau!');
      return;
    }

    setSubmitting(true);
    try {
      let finalFromWhId = formData.from_warehouse_id;
      if (formData.from_warehouse_id && !isUUID(formData.from_warehouse_id)) {
        const whByName = warehouses.find(w => w.name.toLowerCase() === formData.from_warehouse_id.toLowerCase());
        if (whByName) finalFromWhId = whByName.id;
        else {
          const random = Math.floor(100 + Math.random() * 900);
          const code = `K${(warehouses.length + 1).toString().padStart(2, '0')}-${random}`;
          const { data: newWh } = await supabase.from('warehouses').insert([{ name: formData.from_warehouse_id, code }]).select();
          if (newWh) finalFromWhId = newWh[0].id;
        }
      }

      let finalToWhId = formData.to_warehouse_id;
      if (formData.to_warehouse_id && !isUUID(formData.to_warehouse_id)) {
        const whByName = warehouses.find(w => w.name.toLowerCase() === formData.to_warehouse_id.toLowerCase());
        if (whByName) finalToWhId = whByName.id;
        else {
          const random = Math.floor(100 + Math.random() * 900);
          const code = `K${(warehouses.length + 1).toString().padStart(2, '0')}-${random}`;
          const { data: newWh } = await supabase.from('warehouses').insert([{ name: formData.to_warehouse_id, code }]).select();
          if (newWh) finalToWhId = newWh[0].id;
        }
      }

      let finalMaterialId = formData.material_id;
      if (formData.material_id && !isUUID(formData.material_id)) {
        const matByName = materials.find(m => m.name.toLowerCase() === formData.material_id.toLowerCase());
        if (matByName) finalMaterialId = matByName.id;
        else throw new Error('Bạn phải chọn vật tư từ Danh mục!');
      }

      // Final stock check
      const stockAtDate = await getAvailableStock(finalMaterialId, finalFromWhId, formData.date, editingId || undefined);
      if (formData.quantity > stockAtDate) {
        throw new Error(`Số lượng chuyển (${formData.quantity}) vượt quá tồn kho hiện tại (${stockAtDate}) tại ngày ${formData.date}`);
      }

      const payload = {
        ...formData,
        from_warehouse_id: finalFromWhId,
        to_warehouse_id: finalToWhId,
        material_id: finalMaterialId,
        employee_id: user.id,
        status: 'Chờ duyệt',
        transfer_code: formData.transfer_code || generateCode('LC'),
        notes: isEditing 
          ? `[SỬA lúc ${new Date().toLocaleString('vi-VN')}] ${formData.notes.replace(/^\[SỬA lúc .*?\]\s*/, '')}` 
          : formData.notes
      };

      if (isEditing && selectedSlip) {
        const { error } = await supabase.from('transfers').update(payload).eq('id', selectedSlip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transfers').insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchSlips();
      setFormData(initialFormState);
      setIsEditing(false);
      setEditingId(null);
      setAvailableStock(null);
      setSelectedSlip(null);
      if (addToast) addToast(isEditing ? 'Cập nhật thành công!' : 'Lập phiếu luân chuyển thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (slip: any) => {
    setSelectedSlip(slip);
    setShowDetailModal(true);
  };

  const handleEdit = () => {
    setFormData({
      date: selectedSlip.date,
      from_warehouse_id: selectedSlip.from_warehouse_id,
      to_warehouse_id: selectedSlip.to_warehouse_id,
      material_id: selectedSlip.material_id,
      quantity: selectedSlip.quantity,
      notes: selectedSlip.notes?.replace(/^\[SỬA lúc .*?\]\s*/, '') || '',
      status: 'Chờ duyệt',
      transfer_code: selectedSlip.transfer_code || formData.transfer_code
    });
    setIsEditing(true);
    setEditingId(selectedSlip.id);
    setShowDetailModal(false);
    setShowModal(true);
  };

  const handleDelete = () => {
    if (!selectedSlip) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from('transfers').update({ status: 'Đã xóa' }).eq('id', selectedSlip.id);
      if (error) throw error;
      if (addToast) addToast('Đã chuyển phiếu vào thùng rác', 'success');
      fetchSlips();
      setShowDetailModal(false);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      const msg = err.message.includes('foreign key constraint') 
        ? 'Không thể xóa phiếu này vì đang có dữ liệu liên quan khác.' 
        : err.message;
      if (addToast) addToast('Lỗi: ' + msg, 'error');
      else alert('Lỗi: ' + msg);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Luân chuyển kho" onBack={onBack} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowLeftRight className="text-orange-500" /> Luân chuyển kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Luân chuyển vật tư giữa các kho</p>
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
              <tr className="bg-orange-500 text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Từ kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Đến kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">SL</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : slips.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Chưa có phiếu chuyển nào</td></tr>
              ) : (
                slips.map((item) => (
                  <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{item.from_wh?.name}</p>
                      <p className="text-[10px] text-gray-400">#{item.from_wh?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{item.to_wh?.name}</p>
                      <p className="text-[10px] text-gray-400">#{item.to_wh?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                      <p>{item.materials?.name}</p>
                      <p className="text-[10px] text-gray-400">#{item.materials?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-orange-600 text-center font-bold">{item.quantity}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Đã duyệt' ? 'bg-green-100 text-green-600' :
                          item.status === 'Từ chối' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                        {item.status || 'Chờ duyệt'}
                      </span>
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
                  <button onClick={() => setShowDetailModal(false)} className="w-9 h-9 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center hover:bg-orange-200 transition-colors cursor-pointer">
                    <ArrowLeftRight size={18} />
                  </button>
                  <div>
                    <p className="text-sm font-black text-orange-600">{selectedSlip.transfer_code}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Luân chuyển kho</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {[
                  { label: 'Ngày chuyển', value: formatDate(selectedSlip.date) },
                  { label: 'Từ kho', value: selectedSlip.from_wh?.name },
                  { label: 'Đến kho', value: selectedSlip.to_wh?.name },
                  { label: 'Vật tư', value: selectedSlip.materials?.name, sub: `Mã: ${selectedSlip.materials?.code || '—'}` },
                  { label: 'Số lượng', value: `${formatNumber(selectedSlip.quantity)} ${selectedSlip.materials?.unit || ''}`, highlight: true },
                  { label: 'Ghi chú', value: selectedSlip.notes || '—' },
                  { label: 'Trạng thái', value: selectedSlip.status || 'Chờ duyệt' },
                ].map(({ label, value, sub, highlight }) => (
                  <div key={label} className="flex justify-between items-start border-b border-gray-50 pb-3 gap-4">
                    <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0">{label}</span>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${highlight ? 'text-orange-600 font-bold' : 'text-gray-800'}`}>{value || '—'}</p>
                      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-orange-500 p-6 text-white flex items-center justify-between rounded-t-[2rem] md:rounded-t-[2.5rem] flex-shrink-0 relative">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowModal(false)}
                    title="Đóng (Bấm icon hoặc X)"
                  >
                    <ArrowDownCircle size={24} />
                  </div>
                  <h3 className="font-bold text-lg">{isEditing ? 'Sửa phiếu chuyển kho' : 'Lập phiếu chuyển kho'}</h3>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày chuyển *</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.date} 
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" 
                      />
                      <p className="text-[10px] text-gray-400">Tồn kho sẽ được kiểm tra tại ngày này</p>
                    </div>
                    <CreatableSelect
                      label="Từ kho *"
                      value={formData.from_warehouse_id}
                      options={warehouses}
                      onChange={(val) => setFormData({ ...formData, from_warehouse_id: val })}
                      onCreate={(val) => setFormData({ ...formData, from_warehouse_id: val })}
                      placeholder="Chọn kho nguồn..."
                      required
                    />
                    <CreatableSelect
                      label="Đến kho *"
                      value={formData.to_warehouse_id}
                      options={warehouses}
                      onChange={(val) => setFormData({ ...formData, to_warehouse_id: val })}
                      onCreate={(val) => setFormData({ ...formData, to_warehouse_id: val })}
                      placeholder="Chọn kho đích..."
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-end gap-2 relative z-[120]">
                      <div className="flex-1">
                        <CreatableSelect
                          label="Vật tư luân chuyển *"
                          value={formData.material_id}
                          options={materials}
                          onChange={(val) => setFormData({ ...formData, material_id: val })}
                          onCreate={() => {
                            if (addToast) addToast('Vui lòng chọn vật tư có trong Danh mục. Hoặc click nút + bên cạnh để tạo mới.', 'info');
                          }}
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
                    <div>
                      <NumericInput
                        label="Số lượng chuyển *"
                        required
                        value={formData.quantity}
                        onChange={(val) => setFormData({ ...formData, quantity: val })}
                      />
                      {stockLoading && (
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mt-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase animate-pulse">Đang kiểm tra tồn kho...</p>
                        </div>
                      )}
                      {!stockLoading && availableStock !== null && (
                        <div className={`p-3 rounded-xl border mt-1 ${
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
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                      <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-600/20 resize-none" />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                    <Button 
                      type="submit" 
                      className="bg-orange-500 hover:bg-orange-600 text-white min-w-[120px]"
                      isLoading={submitting}
                      disabled={availableStock !== null && Number(formData.quantity) > availableStock} 
                      title={availableStock !== null && Number(formData.quantity) > availableStock ? `Không đủ tồn kho (tồn: ${availableStock})` : undefined}
                    >
                      {isEditing ? 'Cập nhật' : 'Lưu phiếu chuyển'}
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
        message="Bạn có chắc chắn muốn chuyển phiếu luân chuyển này vào thùng rác không?"
        confirmText="Chuyển vào thùng rác"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* FAB — Lập phiếu luân chuyển */}
      <FAB
        onClick={() => {
          setFormData({ ...initialFormState, transfer_code: generateCode('LC') });
          setIsEditing(false);
          setEditingId(null);
          setAvailableStock(null);
          setShowModal(true);
        }}
        label="Lập phiếu luân chuyển"
      />
    </div>
  );
};
