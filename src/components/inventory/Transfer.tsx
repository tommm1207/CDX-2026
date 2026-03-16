import { useState, useEffect, FormEvent } from 'react';
import { Plus, X, ArrowLeftRight, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { formatDate, formatNumber } from '../../utils/format';
import { isUUID, generateCode } from '../../utils/helpers';
import { getAvailableStock } from '../../utils/inventory';

export const Transfer = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

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
    fetchWarehouses();
    fetchMaterials();
  }, []);

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
      const { data, error } = await supabase.from('transfers').select('*, from_wh:warehouses!from_warehouse_id(name, code), to_wh:warehouses!to_warehouse_id(name, code), materials(name, code, unit)').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching transfers:', error);
        const { data: fallbackData, error: fallbackError } = await supabase.from('transfers').select('*').order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        setSlips(fallbackData || []);
      } else {
        setSlips(data || []);
      }
    } catch (err: any) {
      alert('Lỗi tải phiếu luân chuyển: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').order('name');
    if (data) setMaterials(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

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
        notes: isEditing ? `[SỬA] ${formData.notes}` : formData.notes
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
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
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
      notes: selectedSlip.notes?.replace('[SỬA] ', '') || '',
      status: 'Chờ duyệt'
    });
    setIsEditing(true);
    setEditingId(selectedSlip.id);
    setShowDetailModal(false);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedSlip || !confirm('Bạn có chắc chắn muốn xóa phiếu này?')) return;
    try {
      const { error } = await supabase.from('transfers').update({ status: 'Đã xóa' }).eq('id', selectedSlip.id);
      if (error) throw error;
      setAvailableStock(null);
      setShowDetailModal(false);
      fetchSlips();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Luân chuyển kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowLeftRight className="text-orange-500" /> Luân chuyển kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Luân chuyển vật tư giữa các kho</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              ...initialFormState,
              transfer_code: generateCode('LC')
            });
            setIsEditing(false);
            setEditingId(null); // Reset editingId when creating new
            setAvailableStock(null); // Reset available stock
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
        >
          <Plus size={18} /> Lập phiếu chuyển
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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

      <AnimatePresence>
        {showDetailModal && selectedSlip && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-orange-500 p-6 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg">Chi tiết phiếu luân chuyển</h3>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ngày chuyển</p>
                    <p className="text-sm font-bold text-gray-800">{formatDate(selectedSlip.date)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedSlip.status === 'Đã duyệt' ? 'bg-green-100 text-green-600' :
                        selectedSlip.status === 'Từ chối' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                      {selectedSlip.status || 'Chờ duyệt'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Từ kho</p>
                    <p className="text-sm font-bold text-gray-800">{selectedSlip.from_wh?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Đến kho</p>
                    <p className="text-sm font-bold text-gray-800">{selectedSlip.to_wh?.name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Vật tư</p>
                  <p className="text-sm font-bold text-gray-800">{selectedSlip.materials?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Số lượng</p>
                  <p className="text-sm font-bold text-orange-600">{formatNumber(selectedSlip.quantity)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</p>
                  <p className="text-sm text-gray-600 italic">{selectedSlip.notes || 'Không có ghi chú'}</p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button onClick={handleEdit} className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">
                    <Edit size={18} /> Chỉnh sửa
                  </button>
                  <button onClick={handleDelete} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">
                    <Trash2 size={18} /> Xóa phiếu
                  </button>
                  <button onClick={() => setShowDetailModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                    Đóng
                  </button>
                </div>
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
              <div className="bg-orange-500 p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowLeftRight size={24} /></div>
                  <h3 className="font-bold text-lg">Luân chuyển kho</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <CreatableSelect
                      label="Vật tư luân chuyển *"
                      value={formData.material_id}
                      options={materials}
                      onChange={(val) => setFormData({ ...formData, material_id: val })}
                      onCreate={(val) => alert('Vui lòng chọn vật tư có trong Danh mục!')}
                      placeholder="Chọn vật tư..."
                      required
                    />
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
                      <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button 
                      type="submit" 
                      disabled={submitting || (availableStock !== null && Number(formData.quantity) > availableStock)} 
                      title={availableStock !== null && Number(formData.quantity) > availableStock ? `Không đủ tồn kho (tồn: ${availableStock})` : undefined}
                      className="px-8 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Lưu phiếu chuyển')}
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
