import { useState, useEffect, FormEvent } from 'react';
import { Plus, X, ArrowUpCircle, Edit, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { formatDate, formatCurrency, formatNumber } from '../../utils/format';
import { isUUID } from '../../utils/helpers';

export const StockOut = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [availableStock, setAvailableStock] = useState<number | null>(null);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    material_id: '',
    quantity: 0,
    unit_price: 0,
    notes: '',
    status: 'Chờ duyệt'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
    fetchWarehouses();
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (formData.warehouse_id && formData.material_id) {
      checkStock();
    } else {
      setAvailableStock(null);
    }
  }, [formData.warehouse_id, formData.material_id]);

  const checkStock = async () => {
    const wh = warehouses.find(w => w.name === formData.warehouse_id || w.id === formData.warehouse_id);
    const mat = materials.find(m => m.name === formData.material_id || m.id === formData.material_id);

    if (!wh?.id || !mat?.id) return;

    try {
      const { data: inData } = await supabase.from('stock_in').select('quantity').eq('warehouse_id', wh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt');
      const { data: outData } = await supabase.from('stock_out').select('quantity').eq('warehouse_id', wh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt');
      const { data: transFrom } = await supabase.from('transfers').select('quantity').eq('from_warehouse_id', wh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt');
      const { data: transTo } = await supabase.from('transfers').select('quantity').eq('to_warehouse_id', wh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt');

      const totalIn = (inData || []).reduce((sum, item) => sum + Number(item.quantity), 0);
      const totalOut = (outData || []).reduce((sum, item) => sum + Number(item.quantity), 0);
      const totalTransFrom = (transFrom || []).reduce((sum, item) => sum + Number(item.quantity), 0);
      const totalTransTo = (transTo || []).reduce((sum, item) => sum + Number(item.quantity), 0);

      setAvailableStock(totalIn - totalOut - totalTransFrom + totalTransTo);
    } catch (err) {
      console.error('Error checking stock:', err);
    }
  };

  const fetchSlips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('stock_out').select('*, warehouses(name, code), materials(name, code, unit)').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching stock_out:', error);
        const { data: fallbackData, error: fallbackError } = await supabase.from('stock_out').select('*').order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        setSlips(fallbackData || []);
      } else {
        setSlips(data || []);
      }
    } catch (err: any) {
      alert('Lỗi tải phiếu xuất kho: ' + err.message);
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

      if (availableStock !== null && Number(formData.quantity) > availableStock) {
        throw new Error(`Số lượng xuất (${formData.quantity}) vượt quá tồn kho hiện tại (${availableStock})!`);
      }

      const payload = {
        ...formData,
        warehouse_id: finalWarehouseId,
        material_id: finalMaterialId,
        employee_id: user.id,
        status: 'Chờ duyệt',
        total_amount: formData.quantity * formData.unit_price,
        notes: isEditing ? `[SỬA] ${formData.notes}` : formData.notes
      };

      if (isEditing && selectedSlip) {
        const { error } = await supabase.from('stock_out').update(payload).eq('id', selectedSlip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stock_out').insert([payload]);
        if (error) throw error;

        const { data: existingInv } = await supabase
          .from('inventory')
          .select('*')
          .eq('material_id', finalMaterialId)
          .eq('warehouse_id', finalWarehouseId)
          .maybeSingle();

        if (existingInv) {
          await supabase.from('inventory').update({
            quantity: Number(existingInv.quantity) - Number(formData.quantity),
            updated_at: new Date().toISOString()
          }).eq('id', existingInv.id);
        } else {
          await supabase.from('inventory').insert([{
            material_id: finalMaterialId,
            warehouse_id: finalWarehouseId,
            quantity: -Number(formData.quantity),
            unit: materials.find((m: any) => m.id === finalMaterialId)?.unit || '',
            updated_at: new Date().toISOString()
          }]);
        }
      }

      setShowModal(false);
      fetchSlips();
      setFormData(initialFormState);
      setIsEditing(false);
      setSelectedSlip(null);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
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

      fetchSlips();
      setShowDetailModal(false);
      alert('Cập nhật trạng thái thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
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
      notes: selectedSlip.notes?.replace('[SỬA] ', '') || '',
      status: 'Chờ duyệt'
    });
    setIsEditing(true);
    setShowDetailModal(false);
    setShowModal(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Xuất kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowUpCircle className="text-red-500" /> Xuất kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý phiếu xuất vật tư khỏi kho</p>
        </div>
        <button
          onClick={() => {
            setFormData(initialFormState);
            setIsEditing(false);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
        >
          <Plus size={18} /> Lập phiếu xuất
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse min-w-[600px]">
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

      <AnimatePresence>
        {showDetailModal && selectedSlip && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-red-600 p-6 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg">Chi tiết phiếu xuất</h3>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ngày xuất</p>
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Kho xuất</p>
                    <p className="text-sm font-bold text-gray-800">{selectedSlip.warehouses?.name}</p>
                    <p className="text-[10px] text-gray-400">Mã: {selectedSlip.warehouses?.code || selectedSlip.warehouse_id?.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Vật tư</p>
                    <p className="text-sm font-bold text-gray-800">{selectedSlip.materials?.name}</p>
                    <p className="text-[10px] text-gray-400">Mã: {selectedSlip.materials?.code || selectedSlip.material_id?.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Số lượng</p>
                    <p className="text-sm font-bold text-red-600">-{formatNumber(selectedSlip.quantity)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Đơn giá bán</p>
                    <p className="text-sm font-medium text-gray-800">{formatCurrency(selectedSlip.unit_price || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Thành tiền (Doanh thu)</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(selectedSlip.total_amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</p>
                    <p className="text-sm text-gray-600 italic">{selectedSlip.notes || 'Không có ghi chú'}</p>
                  </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleEdit}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Edit size={18} /> Chỉnh sửa
                  </button>
                  {((user.role === 'Admin' || user.role === 'Admin App') && selectedSlip.status === 'Chờ duyệt') && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedSlip.id, 'Từ chối')}
                        className="flex-1 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors"
                      >
                        Từ chối
                      </button>
                      <button
                        onClick={() => handleApprove(selectedSlip.id, 'Đã duyệt')}
                        className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                      >
                        Duyệt phiếu
                      </button>
                    </>
                  )}
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
              <div className="bg-red-600 p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowUpCircle size={24} /></div>
                  <h3 className="font-bold text-lg">{isEditing ? 'Sửa phiếu xuất kho' : 'Lập phiếu xuất kho'}</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày xuất *</label>
                      <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-600/20" />
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

                    <CreatableSelect
                      label="Vật tư *"
                      value={formData.material_id}
                      options={materials}
                      onChange={(val) => setFormData({ ...formData, material_id: val })}
                      onCreate={() => alert('Vui lòng chọn vật tư có trong Danh mục. Để thêm vật tư mới, hãy vào mục Danh mục vật tư.')}
                      placeholder="Chọn vật tư..."
                      required
                    />

                    {availableStock !== null && (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-400 uppercase">Tồn kho hiện tại</p>
                        <p className="text-sm font-bold text-blue-600">{formatNumber(availableStock)} {materials.find(m => m.id === formData.material_id || m.name === formData.material_id)?.unit}</p>
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
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button type="submit" disabled={submitting} className="px-8 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50">
                      {submitting ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Lưu phiếu xuất')}
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
