import { useState, useEffect, FormEvent } from 'react';
import { Plus, Search, ChevronRight, X, ArrowDownCircle, Edit, Navigation, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { formatDate, formatCurrency, formatNumber, numberToWords } from '../../utils/format';
import { isUUID } from '../../utils/helpers';

export const StockIn = ({ user, onBack, initialStatus }: { user: Employee, onBack?: () => void, initialStatus?: string }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'Tất cả');
  const [materialHistory, setMaterialHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    fetchWarehouses();
    fetchMaterials();
  }, []);

  const fetchSlips = async () => {
    setLoading(true);
    try {
      let query = supabase.from('stock_in').select('*, warehouses(name, code), materials(name, code, unit)').order('created_at', { ascending: false });

      if (statusFilter !== 'Tất cả') {
        query = query.eq('status', statusFilter);
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
      alert('Lỗi tải phiếu nhập kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, [statusFilter]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setMaterials(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Explicit validation since custom components don't always trigger HTML5 forms properly
    if (!formData.material_id) {
      alert("Vui lòng chọn hoặc nhập Tên vật tư nhập.");
      return;
    }
    if (!formData.warehouse_id) {
      alert("Vui lòng chọn hoặc nhập Tên kho nhập.");
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      alert("Vui lòng nhập số lượng nhập hợp lệ (lớn hơn 0).");
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
        notes: isEditing ? `[SỬA] ${formData.notes}` : formData.notes
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
      setFormData(initialFormState);
      setIsEditing(false);
      setSelectedSlip(null);
      alert(isEditing ? 'Cập nhật phiếu nhập thành công!' : 'Nhập kho thành công! Tồn kho đã được cập nhật.');
    } catch (err: any) {
      alert('Lỗi: ' + (err as any).message);
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
      notes: selectedSlip.notes,
      import_code: selectedSlip.import_code,
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

      fetchSlips();
      setShowDetailModal(false);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedSlip || !confirm('Bạn có chắc chắn muốn chuyển phiếu này vào thùng rác?')) return;
    try {
      const { error } = await supabase.from('stock_in').update({ status: 'Đã xóa' }).eq('id', selectedSlip.id);
      if (error) throw error;
      
      alert('Đã chuyển phiếu vào thùng rác');
      setShowDetailModal(false);
      fetchSlips();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Nhập kho" onBack={onBack} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        <button
          onClick={() => {
            setFormData({
              ...initialFormState,
              import_code: `NK-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
            });
            setIsEditing(false);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Lập phiếu nhập
        </button>
      </div>

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

      <AnimatePresence>
        {showDetailModal && selectedSlip && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Chi tiết vật tư nhập</h3>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <Navigation size={32} />
                  </div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Xem lịch sử vật tư</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Vật tư</span>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">{selectedSlip.materials?.name || 'N/A'}</p>
                      <p className="text-[10px] text-gray-400">Mã: {selectedSlip.materials?.code || selectedSlip.material_id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Kho nhập</span>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">{selectedSlip.warehouses?.name || 'N/A'}</p>
                      <p className="text-[10px] text-gray-400">Mã: {selectedSlip.warehouses?.code || selectedSlip.warehouse_id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Ngày</span>
                    <span className="text-sm font-medium text-gray-800">{formatDate(selectedSlip.date)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Số lượng nhập</span>
                    <span className="text-sm font-bold text-red-600">{formatNumber(selectedSlip.quantity)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Đơn vị tính</span>
                    <span className="text-sm font-medium text-gray-800">{selectedSlip.unit || selectedSlip.materials?.unit || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Đơn giá</span>
                    <span className="text-sm font-medium text-gray-800">{formatCurrency(selectedSlip.unit_price || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Thành tiền</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(selectedSlip.total_amount || 0)}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Thành tiền bằng chữ</span>
                    <span className="text-sm font-medium text-blue-600 italic">{numberToWords(selectedSlip.total_amount || 0)}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Diễn giải</span>
                    <span className="text-sm font-medium text-gray-800">{selectedSlip.notes || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-3 border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Lịch sử nhập gần đây</span>
                    {loadingHistory ? (
                      <p className="text-xs text-gray-400 italic">Đang tải lịch sử...</p>
                    ) : materialHistory.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Chưa có lịch sử nhập</p>
                    ) : (
                      <div className="space-y-2">
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
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
                <button
                  onClick={handleDelete}
                  className="px-6 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} /> Chuyển vào thùng rác
                </button>
                <button
                  onClick={handleEdit}
                  className="px-6 py-2 bg-blue-100 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-200 transition-colors flex items-center gap-2"
                >
                  <Edit size={16} /> Sửa phiếu
                </button>
                {(user.role === 'Admin' || user.role === 'Admin App') && selectedSlip.status === 'Chờ duyệt' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedSlip.id, 'Từ chối')}
                      className="px-6 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors"
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => handleApprove(selectedSlip.id, 'Đã duyệt')}
                      className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                    >
                      Duyệt phiếu
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-xl text-sm font-bold hover:bg-gray-600 transition-colors"
                >
                  Đóng
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
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowDownCircle size={24} /></div>
                  <h3 className="font-bold text-lg">{isEditing ? 'Sửa phiếu nhập kho' : 'Lập phiếu nhập kho'}</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày nhập *</label>
                      <input 
                        type="date" 
                        required 
                        disabled
                        value={formData.date} 
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                        className="w-full px-4 py-2 rounded-xl border border-gray-100 text-sm outline-none bg-gray-50 text-gray-400 cursor-not-allowed" 
                      />
                    </div>

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
                      onCreate={() => alert('Vui lòng chọn vật tư có trong Danh mục. Để thêm vật tư mới, hãy vào mục Danh mục vật tư.')}
                      placeholder="Chọn vật tư..."
                      required
                    />

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
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy lệnh</button>
                    <button type="submit" disabled={submitting} className="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                      {submitting ? 'Đang lưu...' : 'Lưu'}
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
