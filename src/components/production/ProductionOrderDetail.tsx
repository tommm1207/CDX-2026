import { useState, useEffect, FormEvent } from 'react';
import { ClipboardList, Plus, Trash2, X, Save, CheckCircle2, AlertTriangle, Package, Warehouse, Calendar, Info, Settings, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee, Material, BOMConfig, BOMItem, ProductionOrder } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { CustomCombobox } from '../shared/CustomCombobox';
import { formatNumber } from '../../utils/format';
import { getAvailableStock } from '../../utils/inventory';

export const ProductionOrderDetail = ({ user, orderId, onBack, addToast }: {
  user: Employee,
  orderId?: string,
  onBack: () => void,
  addToast?: (message: string, type?: ToastType) => void
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [boms, setBoms] = useState<BOMConfig[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  const [order, setOrder] = useState<Partial<ProductionOrder>>({
    order_code: '',
    status: 'Mới',
    quantity: 0,
    planned_date: new Date().toISOString().split('T')[0]
  });

  const [bomItems, setBomItems] = useState<(BOMItem & { material?: Material, available?: number })[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, [orderId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [matRes, bomRes, whRes] = await Promise.all([
        supabase.from('materials').select('*').order('name'),
        supabase.from('bom_configs').select('*').order('name'),
        supabase.from('warehouses').select('*').order('name')
      ]);

      if (matRes.data) setMaterials(matRes.data);
      if (bomRes.data) setBoms(bomRes.data);
      if (whRes.data) setWarehouses(whRes.data);

      if (orderId) {
        const { data: orderData } = await supabase
          .from('production_orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (orderData) {
          setOrder(orderData);
          if (orderData.bom_id) {
            await fetchBomItems(orderData.bom_id, orderData.quantity, orderData.warehouse_id);
          }
        }
      } else {
        const nextCode = await generateOrderCode();
        setOrder(prev => ({ ...prev, order_code: nextCode }));
      }
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateOrderCode = async () => {
    const { data } = await supabase
      .from('production_orders')
      .select('order_code')
      .order('order_code', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      const lastCode = data[0].order_code;
      const num = parseInt(lastCode.split('-')[1]) + 1;
      return `LSX-${num.toString().padStart(3, '0')}`;
    }
    return 'LSX-001';
  };

  const fetchBomItems = async (bomId: string, quantity: number, warehouseId?: string) => {
    const { data } = await supabase
      .from('bom_items')
      .select('*')
      .eq('bom_id', bomId);
    
    if (data) {
      const enriched = await Promise.all(data.map(async (item) => {
        const mat = materials.find(m => m.id === item.material_item_id);
        const available = warehouseId ? await getAvailableStock(item.material_item_id, warehouseId, order.planned_date || '') : 0;
        return { ...item, material: mat, available };
      }));
      setBomItems(enriched);
    }
  };

  const handleBomChange = async (bomId: string) => {
    setOrder(prev => ({ ...prev, bom_id: bomId }));
    if (bomId) {
      await fetchBomItems(bomId, order.quantity || 0, order.warehouse_id);
    } else {
      setBomItems([]);
    }
  };

  const handleWarehouseChange = async (whId: string) => {
    setOrder(prev => ({ ...prev, warehouse_id: whId }));
    if (order.bom_id) {
      await fetchBomItems(order.bom_id, order.quantity || 0, whId);
    }
  };

  const calculateTotal = (qtyPerUnit: number) => {
    return (order.quantity || 0) * qtyPerUnit;
  };

  const handleSave = async () => {
    if (!order.order_code || !order.bom_id || !order.warehouse_id || !order.output_warehouse_id || (order.quantity || 0) <= 0) {
      if (addToast) addToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const dataToSave = {
        ...order,
        created_by: user.id
      };

      if (orderId) {
        await supabase.from('production_orders').update(dataToSave).eq('id', orderId);
      } else {
        await supabase.from('production_orders').insert([dataToSave]);
      }

      if (addToast) addToast('Đã lưu lệnh sản xuất', 'success');
      onBack();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (order.status !== 'Mới') return;
    if (!window.confirm('Xác nhận duyệt lệnh sản xuất này? Hệ thống sẽ tự động tạo phiếu xuất kho nguyên liệu và nhập kho thành phẩm.')) return;

    // Check stock for all items
    for (const item of bomItems) {
      const needed = calculateTotal(item.quantity_per_unit);
      if ((item.available || 0) < needed) {
        if (addToast) addToast(`Không đủ tồn kho nguyên liệu: ${item.material?.name}`, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Create Stock Out for each material
      const stockOutPromises = bomItems.map(it => {
        return supabase.from('stock_out').insert([{
          export_code: `X-LSX-${order.order_code}`,
          date: today,
          warehouse_id: order.warehouse_id,
          material_id: it.material_item_id,
          quantity: calculateTotal(it.quantity_per_unit),
          unit: it.unit,
          employee_id: user.id,
          status: 'Đã duyệt',
          notes: `Xuất vật tư theo lệnh sản xuất ${order.order_code}`
        }]);
      });

      // 2. Create Stock In for finished product
      const bom = boms.find(b => b.id === order.bom_id);
      const product = materials.find(m => m.id === bom?.product_item_id);
      const stockInPromise = supabase.from('stock_in').insert([{
        import_code: `N-LSX-${order.order_code}`,
        date: today,
        warehouse_id: order.output_warehouse_id,
        material_id: product?.id,
        quantity: order.quantity,
        unit: product?.unit,
        employee_id: user.id,
        status: 'Đã duyệt',
        notes: `Nhập thành phẩm từ lệnh sản xuất ${order.order_code}`
      }]);

      // 3. Update order status
      const updatePromise = supabase.from('production_orders').update({
        status: 'Hoàn thành',
        approved_by: user.id
      }).eq('id', order.id);

      await Promise.all([...stockOutPromises, stockInPromise, updatePromise]);

      if (addToast) addToast('Đã duyệt và thực hiện xuất/nhập kho thành công!', 'success');
      onBack();
    } catch (err: any) {
      if (addToast) addToast('Lỗi phê duyệt: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-400 italic">Đang tải chi tiết lệnh...</div>;

  const isViewOnly = order.status !== 'Mới';

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44 overflow-y-auto max-h-screen">
      <PageBreadcrumb title={orderId ? `Chi tiết lệnh ${order.order_code}` : 'Tạo lệnh sản xuất'} onBack={onBack} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Lệnh sản xuất: {order.order_code}</h2>
            <div className="flex items-center gap-2 mt-1">
              {isViewOnly ? (
                <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-md text-[10px] font-bold border border-green-100 uppercase tracking-wider">
                  Trạng thái: {order.status}
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold border border-amber-100 uppercase tracking-wider">
                  Trạng thái: Mới (Dự thảo)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!isViewOnly && (
            <button
              onClick={handleSave}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              <Save size={18} /> Lưu dự thảo
            </button>
          )}
          {user.role === 'Admin' && order.status === 'Mới' && (
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
            >
              <CheckCircle2 size={18} /> Duyệt & Hoàn thành
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Info size={14} /> Thông tin chung
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <CustomCombobox
                  label="Định mức sản xuất *"
                  placeholder="-- Chọn định mức --"
                  value={order.bom_id || ''}
                  options={boms}
                  onChange={handleBomChange}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Số lượng sản xuất *</label>
                <div className="relative">
                  <Calculator size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    readOnly={isViewOnly}
                    type="number"
                    value={order.quantity}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setOrder({ ...order, quantity: val });
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 px-4"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <CustomCombobox
                  label="Kho xuất nguyên vật liệu *"
                  placeholder="-- Chọn kho xuất --"
                  value={order.warehouse_id || ''}
                  options={warehouses}
                  onChange={handleWarehouseChange}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <CustomCombobox
                  label="Kho nhập thành phẩm *"
                  placeholder="-- Chọn kho nhập --"
                  value={order.output_warehouse_id || ''}
                  options={warehouses}
                  onChange={(val) => setOrder({ ...order, output_warehouse_id: val })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Ngày dự kiến sản xuất</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    readOnly={isViewOnly}
                    type="date"
                    value={order.planned_date}
                    onChange={e => setOrder({ ...order, planned_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Ghi chú lệnh</label>
              <textarea
                readOnly={isViewOnly}
                rows={2}
                value={order.notes || ''}
                onChange={e => setOrder({ ...order, notes: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Thông tin bổ sung..."
              />
            </div>
          </div>

          {/* BOM Material Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Package size={16} className="text-primary" /> Chi tiết tiêu hao nguyên liệu
              </h3>
              <div className="text-[10px] text-gray-400 italic">
                (Tự động tính dựa trên định mức)
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Nguyên liệu</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">Định mức</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center w-20">ĐVT</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">Cần dùng</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">Hiện có</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center w-32">Khả thi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bomItems.map((item, idx) => {
                    const totalNeeded = calculateTotal(item.quantity_per_unit);
                    const isDeficit = (item.available || 0) < totalNeeded;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-gray-800">{item.material?.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">#{item.material?.code || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-right text-gray-600">{item.quantity_per_unit}</td>
                        <td className="px-4 py-3 text-[10px] text-center text-gray-500">{item.unit}</td>
                        <td className="px-4 py-3 text-sm font-bold text-right text-primary">{formatNumber(totalNeeded)}</td>
                        <td className="px-4 py-3 text-xs text-right font-medium text-gray-700">{formatNumber(item.available || 0)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            {isDeficit ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                                <AlertTriangle size={10} /> Thiếu hàng
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                                <CheckCircle2 size={10} /> Đủ hàng
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {bomItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic text-xs">
                        Vui lòng chọn định mức để xem chi tiết vật tư
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6 text-sm font-medium text-gray-800">
          <div className="bg-gradient-to-br from-primary to-primary-hover rounded-3xl p-6 text-white shadow-xl shadow-primary/20">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-4">Tóm tắt sản xuất</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/20 pb-2">
                <span className="text-white/80">Số lượng thành phẩm:</span>
                <span className="text-xl font-black">{formatNumber(order.quantity || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">Đơn vị:</span>
                <span className="font-bold">{materials.find(m => m.id === boms.find(b => b.id === order.bom_id)?.product_item_id)?.unit || '-'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">Số loại nguyên liệu:</span>
                <span className="font-bold">{bomItems.length}</span>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-white/10 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold opacity-70 mb-2 uppercase select-none">Hướng dẫn</p>
              <ul className="text-[10px] space-y-2 text-white/90">
                <li className="flex gap-2"><span>1.</span> Chọn định mức tương ứng với sản phẩm cần đúc.</li>
                <li className="flex gap-2"><span>2.</span> Nhập số lượng cọc. Hệ thống sẽ tự tính toán vật tư.</li>
                <li className="flex gap-2"><span>3.</span> Kiểm tra trạng thái "Khả thi" (Đủ hàng).</li>
                <li className="flex gap-2"><span>4.</span> Bấm Duyệt để trừ kho nguyên liệu và nhập kho thành phẩm.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
