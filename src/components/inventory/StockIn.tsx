import { useState, useEffect, FormEvent } from 'react';
import { Plus, Search, ChevronRight, X, ArrowDownCircle, Edit, Navigation, Trash2, PackagePlus, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { ToastType } from '../shared/Toast';
import { ConfirmModal } from '../shared/ConfirmModal';
import { QuickAddMaterialModal } from '../shared/QuickAddMaterialModal';
import { FAB } from '../shared/FAB';
import { useInventoryData } from '../../hooks/useInventoryData';
import { formatDate, formatCurrency, formatNumber, numberToWords } from '../../utils/format';
import { isUUID, getAllowedWarehouses } from '../../utils/helpers';
import { Button } from '../shared/Button';

export const StockIn = ({ user, onBack, initialStatus, initialAction, addToast }: { 
  user: Employee, 
  onBack?: () => void, 
  initialStatus?: string,
  initialAction?: string,
  addToast?: (message: string, type?: ToastType) => void 
}) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(initialAction === 'add');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'Tất cả');
  const [materialHistory, setMaterialHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  const { warehouses, materials, groups, refreshAll, fetchWarehouses } = useInventoryData(user.data_view_permission);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    material_id: '',
    quantity: 0,
    unit_price: 0,
    unit: '',
    notes: '',
    import_code: `NK-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'Chờ duyệt'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
  }, []);

  const fetchSlips = async () => {
    setLoading(true);
    try {
      let query = supabase.from('stock_in').select('*, warehouses(name, code), materials(name, code, unit)').order('created_at', { ascending: false });

      if (statusFilter !== 'Tất cả') {
        query = query.eq('status', statusFilter);
      }

      const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
      if (allowedWhIds) {
        query = query.in('warehouse_id', allowedWhIds);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching stock_in:', error);
        const { data: fallbackData, error: fallbackError } = await supabase.from('stock_in').select('*').order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        setSlips(fallbackData || []);
      } else {
        setSlips(data || []);
      }
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải phiếu nhập kho: ' + err.message, 'error');
      else alert('Lỗi tải phiếu nhập kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, [statusFilter]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Explicit validation since custom components don't always trigger HTML5 forms properly
    if (!formData.material_id) {
      if (addToast) addToast("Vui lòng chọn hoặc nhập Tên vật tư nhập.", "error");
      else alert("Vui lòng chọn hoặc nhập Tên vật tư nhập.");
      return;
    }
    if (!formData.warehouse_id) {
      if (addToast) addToast("Vui lòng chọn hoặc nhập Tên kho nhập.", "error");
      else alert("Vui lòng chọn hoặc nhập Tên kho nhập.");
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      if (addToast) addToast("Vui lòng nhập số lượng nhập hợp lệ (lớn hơn 0).", "error");
      else alert("Vui lòng nhập số lượng nhập hợp lệ (lớn hơn 0).");
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

      const payload = {
        ...formData,
        warehouse_id: finalWarehouseId,
        material_id: finalMaterialId,
        employee_id: user.id,
        total_amount: formData.quantity * formData.unit_price,
        unit: formData.unit || materials.find(m => m.id === finalMaterialId)?.unit || '',
        status: 'Chờ duyệt',
        notes: isEditing 
          ? `[SỬA lúc ${new Date().toLocaleString('vi-VN')}] ${formData.notes.replace(/^\[SỬA lúc .*?\]\s*/, '')}` 
          : formData.notes
      };

      if (isEditing && selectedSlip) {
        const { error } = await supabase.from('stock_in').update(payload).eq('id', selectedSlip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stock_in').insert([payload]);
        if (error) throw error;

      }

      setShowModal(false);
      fetchSlips();
      setIsEditing(false);
      setSelectedSlip(null);
      if (addToast) addToast(isEditing ? 'Cập nhật phiếu nhập thành công!' : 'Nhập kho thành công! Tồn kho đã được cập nhật.', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = async (slip: any) => {
    setSelectedSlip(slip);
    setShowDetailModal(true);

    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('stock_in')
        .select('*, warehouses(name)')
        .eq('material_id', slip.material_id)
        .eq('status', 'Đã duyệt')
        .order('date', { ascending: false })
        .limit(5);
      setMaterialHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEdit = () => {
    setFormData({
      date: selectedSlip.date,
      warehouse_id: selectedSlip.warehouse_id,
      material_id: selectedSlip.material_id,
      quantity: selectedSlip.quantity,
      unit_price: selectedSlip.unit_price,
      unit: selectedSlip.unit,
      notes: selectedSlip.notes?.replace(/^\[SỬA lúc .*?\]\s*/, '') || '',
      import_code: selectedSlip.import_code || formData.import_code,
      status: 'Chờ duyệt'
    });
    setIsEditing(true);
    setShowDetailModal(false);
    setShowModal(true);
  };

  const handleApprove = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('stock_in').update({ status }).eq('id', id);
      if (error) throw error;
      
      if (status === 'Đã duyệt') {
        const { data: slip } = await supabase.from('stock_in').select('*, users(id)').eq('id', id).maybeSingle();
        if (slip && slip.total_amount > 0) {
          // Check if cost already exists to prevent duplicates
          const { data: existingCost } = await supabase
            .from('costs')
            .select('id')
            .ilike('content', `%${slip.import_code}%`)
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
              transaction_type: 'Chi',
              cost_code: costCode,
              date: slip.date,
              employee_id: user.id,
              cost_type: 'Vật tư',
              content: `Nhập kho từ phiếu ${slip.import_code}`,
              material_id: slip.material_id,
              warehouse_id: slip.warehouse_id,
              quantity: slip.quantity,
              unit: slip.unit,
              unit_price: slip.unit_price,
              total_amount: slip.total_amount,
              notes: 'Tự động tạo từ hệ thống Nhập Kho'
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
      const { error } = await supabase.from('stock_in').update({ status: 'Đã xóa' }).eq('id', selectedSlip.id);
      if (error) throw error;

      // Also void associated cost
      await supabase.from('costs')
        .update({ status: 'Đã xóa' })
        .ilike('content', `%${selectedSlip.import_code}%`);
      
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

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Nhập kho" onBack={onBack} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowDownCircle className="text-primary" /> Tiền vào - Tiền ra
          </h2>
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
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ngày</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Thành tiền</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : slips.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Chưa có phiếu nhập nào</td></tr>
              ) : (
                slips.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-bold">
                      <p>{item.materials?.name}</p>
                      <p className="text-[10px] text-gray-400 font-normal">#{item.materials?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{item.warehouses?.name}</p>
                      <p className="text-[10px] text-gray-400">#{item.warehouses?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-primary font-bold">{formatCurrency(item.total_amount || 0)}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Đã duyệt' ? 'bg-green-100 text-green-600' :
                            item.status === 'Từ chối' ? 'bg-red-100 text-red-600' :
                              'bg-yellow-100 text-yellow-600'
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailModal(false)}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
            />
            {/* Panel — slide-up mobile / slide-in right desktop */}
            <motion.div
              initial={{ y: '100%', x: 0 }}
              animate={{ y: 0, x: 0 }}
              exit={{ y: '100%', x: 0 }}
              style={{ willChange: 'transform' }}
              className="fixed inset-x-0 bottom-0 z-[71] bg-white rounded-t-3xl shadow-2xl
                         flex flex-col max-h-[90dvh]
                         md:inset-x-auto md:inset-y-0 md:right-0 md:w-[420px] md:rounded-t-none md:rounded-l-3xl md:max-h-full"
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            >
              {/* Drag handle (mobile only) */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowDetailModal(false)} className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer">
                    <Navigation size={18} />
                  </button>
                  <div>
                    <p className="text-sm font-black text-primary">{selectedSlip.import_code}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Phiếu nhập kho</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {[
                  { label: 'Vật tư', value: selectedSlip.materials?.name, sub: `Mã: ${selectedSlip.materials?.code || '—'}` },
                  { label: 'Kho nhập', value: selectedSlip.warehouses?.name, sub: `Mã: ${selectedSlip.warehouses?.code || '—'}` },
                  { label: 'Ngày nhập', value: formatDate(selectedSlip.date) },
                  { label: 'Số lượng', value: `${formatNumber(selectedSlip.quantity)} ${selectedSlip.unit || selectedSlip.materials?.unit || ''}` },
                  { label: 'Đơn giá', value: formatCurrency(selectedSlip.unit_price || 0) },
                  { label: 'Thành tiền', value: formatCurrency(selectedSlip.total_amount || 0), highlight: true },
                  { label: 'Diễn giải', value: selectedSlip.notes || '—' },
                ].map(({ label, value, sub, highlight }) => (
                  <div key={label} className="flex justify-between items-start border-b border-gray-50 pb-3 gap-4">
                    <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0">{label}</span>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${highlight ? 'text-primary font-bold' : 'text-gray-800'}`}>{value || '—'}</p>
                      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
                    </div>
                  </div>
                ))}

                {/* Thành tiền bằng chữ */}
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Thành tiền bằng chữ</p>
                  <p className="text-xs text-blue-700 italic font-medium">{numberToWords(selectedSlip.total_amount || 0)}</p>
                </div>

                {/* Lịch sử nhập */}
                {materialHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Lịch sử nhập gần đây</p>
                    {materialHistory.map((h, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px] bg-gray-50 p-2 rounded-lg">
                        <span className="text-gray-500">{formatDate(h.date)}</span>
                        <span className="font-bold text-primary">{formatNumber(h.quantity)} {h.unit}</span>
                        <span className="text-gray-400">{h.warehouses?.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl md:rounded-b-none space-y-2">
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

      {/* Add Item Modal */}
      <AnimatePresence>
        {showModal && (
          <div 
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm h-[100dvh] w-full"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowModal(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer">
                    <ArrowDownCircle size={24} />
                  </button>
                  <h3 className="font-bold text-lg">{isEditing ? 'Sửa phiếu nhập kho' : 'Lập phiếu nhập kho'}</h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-32">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày nhập *</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.date} 
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>

                    <div className="flex items-end gap-2 relative z-[120]">
                      <div className="flex-1">
                        <CreatableSelect
                          label="Tên vật tư nhập *"
                          value={formData.material_id}
                          options={materials}
                          onChange={(val) => {
                            const mat = materials.find(m => m.id === val);
                            setFormData({
                              ...formData,
                              material_id: val,
                              unit: mat?.unit || formData.unit
                            });
                          }}
                          onCreate={() => {
                            if (addToast) addToast('Vui lòng chọn vật tư có trong Danh mục. Hoặc click nút + bên cạnh để tạo mới.', 'info');
                            else alert('Vui lòng chọn vật tư có trong Danh mục. Hoặc click nút + bên cạnh để tạo mới.');
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

                    <NumericInput
                      label="Số lượng nhập *"
                      required
                      value={formData.quantity}
                      onChange={(val) => setFormData({ ...formData, quantity: val })}
                      showControls
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Thành tiền</label>
                      <div className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm text-center bg-gray-50 outline-none font-bold text-primary">
                        {formatCurrency(formData.quantity * formData.unit_price)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <CreatableSelect
                      label="Tên kho nhập *"
                      value={formData.warehouse_id}
                      options={warehouses}
                      onChange={(val) => setFormData({ ...formData, warehouse_id: val })}
                      onCreate={(val) => setFormData({ ...formData, warehouse_id: val })}
                      placeholder="Chọn kho..."
                      required
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                      <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>

                    <NumericInput
                      label="Đơn giá"
                      value={formData.unit_price}
                      onChange={(val) => setFormData({ ...formData, unit_price: val })}
                      showControls
                      step={1000}
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Diễn giải</label>
                      <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={() => setShowModal(false)}>Hủy lệnh</Button>
                    <Button 
                      type="submit" 
                      variant="primary" 
                      isLoading={submitting}
                      className="min-w-[100px]"
                    >
                      Lưu
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
          setFormData({ ...formData, material_id: newMat.id, unit: newMat.unit });
          refreshAll();
        }}
      />

      <ConfirmModal
        show={showDeleteConfirm}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn chuyển phiếu nhập kho này vào thùng rác? Hành động này cũng sẽ vô hiệu hóa bản ghi chi phí liên quan."
        confirmText="Chuyển vào thùng rác"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* FAB — Lập phiếu nhập */}
      <FAB
        onClick={() => {
          setFormData({
            ...initialFormState,
            import_code: `NK-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
          });
          setIsEditing(false);
          setShowModal(true);
        }}
        label="Lập phiếu nhập"
      />
    </div>
  );
};
