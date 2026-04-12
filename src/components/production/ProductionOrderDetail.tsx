import { 
  useState,
  useEffect,
  FormEvent } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  Package,
  Warehouse,
  Calendar,
  Info,
  Settings,
  Calculator,
  Image as ImageIcon,
  RefreshCw,
  Camera,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { ChangeEvent } from 'react';
import { compressImage, uploadToImgBB } from '@/utils/imageUpload';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee, Material, BOMConfig, BOMItem, ProductionOrder } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { CustomCombobox } from '../shared/CustomCombobox';
import { formatNumber } from '@/utils/format';
import { getAvailableStock, isActiveWarehouse } from '@/utils/inventory';
import { getAllowedWarehouses } from '@/utils/helpers';
import { Button } from '../shared/Button';

export const ProductionOrderDetail = ({
  user,
  orderId,
  onBack,
  addToast,
}: {
  user: Employee;
  orderId?: string;
  onBack: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [boms, setBoms] = useState<BOMConfig[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [order, setOrder] = useState<Partial<ProductionOrder>>({
    order_code: '',
    status: 'Mới',
    quantity: 0,
    planned_date: new Date().toISOString().split('T')[0],
    image_url: '',
  });

  const [bomItems, setBomItems] = useState<
    (BOMItem & { material?: Material; available?: number })[]
  >([]);

  useEffect(() => {
    fetchInitialData();
  }, [orderId]);

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        if (addToast) addToast('Đang xử lý và tải ảnh hiện trường...', 'info');
        const compressedBlob = await compressImage(file);
        const url = await uploadToImgBB(compressedBlob);
        setOrder({ ...order, image_url: url });
        if (addToast) addToast('Tải ảnh hiện trường thành công!', 'success');
      } catch (err: any) {
        console.error('Upload error:', err);
        if (addToast) addToast('Lỗi tải ảnh: ' + err.message, 'error');
      } finally {
        setUploading(false);
      }
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [matRes, bomRes, whRes] = await Promise.all([
        supabase.from('materials').select('*').order('name'),
        supabase.from('bom_configs').select('*').order('name'),
        supabase
          .from('warehouses')
          .select('*')
          .or('status.is.null,status.neq.Đã xóa')
          .order('name'),
      ]);

      if (matRes.data) setMaterials(matRes.data);
      if (bomRes.data) setBoms(bomRes.data);
      if (whRes.data) {
        let whs = whRes.data.filter(isActiveWarehouse);
        const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
        if (allowedWhIds) {
          whs = whs.filter((w) => allowedWhIds.includes(w.id));
        }
        setWarehouses(whs);
      }

      if (orderId) {
        const { data: orderData } = await supabase
          .from('production_orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderData) {
          // Check permission for existing order
          const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
          if (allowedWhIds && !allowedWhIds.includes(orderData.warehouse_id)) {
            if (addToast) addToast('Bạn không có quyền xem lệnh sản xuất của kho này.', 'error');
            onBack();
            return;
          }
          setOrder(orderData);
          if (orderData.bom_id) {
            await fetchBomItems(orderData.bom_id, orderData.quantity, orderData.warehouse_id);
          }
        }
      } else {
        const nextCode = generateOrderCode();
        setOrder((prev) => ({ ...prev, order_code: nextCode }));
      }
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateOrderCode = (): string => {
    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `LSX-${yy}${mm}${dd}-${random}`;
  };

  const fetchBomItems = async (bomId: string, quantity: number, warehouseId?: string) => {
    const { data } = await supabase.from('bom_items').select('*').eq('bom_id', bomId);

    if (data) {
      const enriched = await Promise.all(
        data.map(async (item) => {
          const mat = materials.find((m) => m.id === item.material_item_id);
          const available = warehouseId
            ? await getAvailableStock(item.material_item_id, warehouseId, order.planned_date || '')
            : 0;
          return { ...item, material: mat, available };
        }),
      );
      setBomItems(enriched);
    }
  };

  const handleBomChange = async (bomId: string) => {
    setOrder((prev) => ({ ...prev, bom_id: bomId }));
    if (bomId) {
      await fetchBomItems(bomId, order.quantity || 0, order.warehouse_id);
    } else {
      setBomItems([]);
    }
  };

  const handleWarehouseChange = async (whId: string) => {
    setOrder((prev) => ({ ...prev, warehouse_id: whId }));
    if (order.bom_id) {
      await fetchBomItems(order.bom_id, order.quantity || 0, whId);
    }
  };

  const calculateTotal = (qtyPerUnit: number) => {
    return (order.quantity || 0) * qtyPerUnit;
  };

  const handleSave = async () => {
    if (
      !order.order_code ||
      !order.bom_id ||
      !order.warehouse_id ||
      !order.output_warehouse_id ||
      (order.quantity || 0) <= 0
    ) {
      if (addToast) addToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const dataToSave = {
        ...order,
        created_by: user.id,
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
    if (
      !window.confirm(
        'Xác nhận duyệt lệnh sản xuất này? Hệ thống sẽ tự động tạo phiếu xuất kho nguyên liệu và nhập kho thành phẩm.',
      )
    )
      return;

    // Preliminary UI Check stock for all items
    for (const item of bomItems) {
      const needed = calculateTotal(item.quantity_per_unit);
      if ((item.available || 0) < needed) {
        if (addToast) addToast(`Không đủ tồn kho nguyên liệu: ${item.material?.name}`, 'error');
        return;
      }
    }

    setSubmitting(true);
    const createdStockOutIds: string[] = [];
    try {
      const today = new Date().toISOString().split('T')[0];
      const bom = boms.find((b) => b.id === order.bom_id);

      // Real-time Stock Check to avoid race condition
      for (const it of bomItems) {
        const qty = calculateTotal(it.quantity_per_unit);
        const realTimeAvailable = await getAvailableStock(
          it.material_item_id,
          order.warehouse_id!,
          today,
        );
        if (realTimeAvailable < qty) {
          throw new Error(
            `Kho không đủ vật tư: ${it.material?.name}. Hiện có: ${realTimeAvailable}, Yêu cầu: ${qty}. Vui lòng nhập thêm kho!`,
          );
        }
      }

      // 1. Create Stock Out for each material sequentially
      for (const it of bomItems) {
        const qty = calculateTotal(it.quantity_per_unit);
        if (addToast)
          addToast(
            `Đang xuất vật tư: ${it.material?.name} (${formatNumber(qty)} ${it.unit})...`,
            'info',
          );

        const { data, error } = await supabase
          .from('stock_out')
          .insert([
            {
              export_code: `X-LSX-${order.order_code}`,
              date: today,
              warehouse_id: order.warehouse_id,
              material_id: it.material_item_id,
              quantity: qty,
              unit: it.unit,
              employee_id: user.id,
              status: 'Đã duyệt',
              notes: `Xuất vật tư theo lệnh sản xuất ${order.order_code}${bom?.is_two_stage ? ' [2 giai đoạn]' : ''}`,
            },
          ])
          .select('id')
          .single();

        if (error) throw new Error(`Lỗi xuất vật tư ${it.material?.name}: ${error.message}`);
        if (data) createdStockOutIds.push(data.id);
      }

      // 2. Create Stock In for finished product
      if (addToast) addToast('Đang nhập kho thành phẩm...', 'info');
      // TODO: Nếu bom?.is_two_stage là true, cần tách làm 2 bước:
      // Bước 1: Nhập Bán thành phẩm vào kho nguyên liệu (order.warehouse_id)
      // Bước 2: Xuất Bán thành phẩm từ kho nguyên liệu và Nhập Thành phẩm vào kho đích (order.output_warehouse_id)
      // Hiện tại vẫn làm 1 bước nhưng thêm note nhận diện.

      const product = materials.find((m) => m.id === bom?.product_item_id);
      const { error: siError } = await supabase.from('stock_in').insert([
        {
          import_code: `N-LSX-${order.order_code}`,
          date: today,
          warehouse_id: order.output_warehouse_id,
          material_id: product?.id,
          quantity: order.quantity,
          unit: product?.unit,
          employee_id: user.id,
          status: 'Đã duyệt',
          notes: `Nhập thành phẩm từ lệnh sản xuất ${order.order_code}${bom?.is_two_stage ? ' [2 giai đoạn]' : ''}`,
        },
      ]);

      if (siError) throw new Error(`Lỗi nhập thành phẩm: ${siError.message}`);

      // 3. Update order status
      if (addToast) addToast('Đang hoàn thành lệnh sản xuất...', 'info');
      const { error: upError } = await supabase
        .from('production_orders')
        .update({
          status: 'Hoàn thành',
          approved_by: user.id,
        })
        .eq('id', order.id);

      if (upError) throw new Error(`Lỗi cập nhật lệnh: ${upError.message}`);

      // 4. Tạo chi phí tự động cho lệnh sản xuất
      try {
        const { data: existingCost } = await supabase
          .from('costs')
          .select('id')
          .ilike('content', `%${order.order_code}%`)
          .eq('cost_type', 'Sản xuất')
          .maybeSingle();

        if (!existingCost) {
          const dateObj = new Date();
          const d = String(dateObj.getDate()).padStart(2, '0');
          const m = String(dateObj.getMonth() + 1).padStart(2, '0');
          const y = String(dateObj.getFullYear()).slice(-2);
          const random = Math.floor(1000 + Math.random() * 9000);
          const userPrefix = user.id?.slice(0, 4) || 'SYS';
          const costCode = `CP-${userPrefix.toUpperCase()}-${d}${m}${y}-${random}`;

          // Tính tổng giá trị nguyên liệu tiêu thụ (nếu có đơn giá)
          let totalMaterialCost = 0;
          for (const it of bomItems) {
            const qty = calculateTotal(it.quantity_per_unit);
            // Tra đơn giá nhập gần nhất
            const { data: lastPrice } = await supabase
              .from('stock_in')
              .select('unit_price')
              .eq('material_id', it.material_item_id)
              .eq('status', 'Đã duyệt')
              .order('date', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (lastPrice?.unit_price) {
              totalMaterialCost += qty * lastPrice.unit_price;
            }
          }

          await supabase.from('costs').insert([
            {
              transaction_type: 'Chi',
              cost_code: costCode,
              date: today,
              employee_id: user.id,
              cost_type: 'Sản xuất',
              content: `Chi phí sản xuất theo lệnh ${order.order_code}`,
              material_id: product?.id,
              warehouse_id: order.warehouse_id,
              quantity: order.quantity,
              unit: product?.unit,
              unit_price:
                totalMaterialCost > 0 ? Math.round(totalMaterialCost / (order.quantity || 1)) : 0,
              total_amount: totalMaterialCost,
              notes: `Tự động tạo từ hệ thống Sản xuất — ${bomItems.length} nguyên liệu tiêu thụ`,
            },
          ]);
        }
      } catch (costErr) {
        console.error('Cost creation warning:', costErr);
        // Không rollback nếu chỉ lỗi tạo chi phí
      }

      if (addToast) addToast('Đã duyệt và thực hiện xuất/nhập kho thành công!', 'success');
      onBack();
    } catch (err: any) {
      console.error('Approval error:', err);
      // Rollback stock_out items if any were created
      if (createdStockOutIds.length > 0) {
        if (addToast) addToast('Có lỗi xảy ra. Đang hoàn tác các phiếu xuất đã tạo...', 'warning');
        await supabase.from('stock_out').update({ status: 'Đã xóa' }).in('id', createdStockOutIds);
      }
      if (addToast) addToast('Lỗi phê duyệt: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!orderId) return;
    if (order.status === 'Đã duyệt' || order.status === 'Hoàn thành') {
      if (addToast)
        addToast(
          '❌ Không thể xóa lệnh sản xuất đã duyệt/hoàn thành.\n\nCác phiếu xuất nguyên liệu và nhập thành phẩm đã được tạo tự động. Vui lòng xử lý trên các phiếu kho liên quan.',
          'error',
        );
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!orderId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({ status: 'Đã xóa' })
        .eq('id', orderId);

      if (error) throw error;
      if (addToast) addToast('Đã đưa lệnh sản xuất vào Thùng rác!', 'success');
      onBack();
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa lệnh: ' + err.message, 'error');
    } finally {
      setShowDeleteModal(false);
      setSubmitting(false);
    }
  };

  if (loading)
    return <div className="p-12 text-center text-gray-400 italic">Đang tải chi tiết lệnh...</div>;

  const isViewOnly = order.status !== 'Mới';

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-y-auto max-h-screen overflow-x-hidden">
      <PageBreadcrumb
        title={orderId ? `Chi tiết lệnh ${order.order_code}` : 'Tạo lệnh sản xuất'}
        onBack={onBack}
      />

      <AnimatePresence>
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-hidden"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full text-center m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa lệnh?</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">
                Bạn có chắc muốn xóa lệnh sản xuất <strong>{order.order_code}</strong>?<br />
                Dữ liệu sẽ được đưa vào <strong>Thùng rác</strong> và có thể khôi phục sau này.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowDeleteModal(false)}
                  className="bg-gray-100 hover:bg-gray-200"
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={confirmDelete}
                  isLoading={submitting}
                  className="shadow-lg shadow-red-500/20"
                >
                  Xác nhận
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 p-4 rounded-3xl border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold border border-amber-100 uppercase tracking-widest uppercase">
            {order.status === 'Mới' ? 'Dự thảo' : order.status}
          </div>
          {order.planned_date && (
            <div className="text-[10px] text-gray-400 font-bold uppercase">
              Ngày dự kiến: {order.planned_date}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {orderId && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={submitting}
              icon={Trash2}
              title="Xóa lệnh"
              className="flex-1 sm:flex-initial"
            >
              Xóa lệnh
            </Button>
          )}
          {!isViewOnly && (
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={submitting}
              icon={Save}
              className="flex-1 sm:flex-initial"
            >
              Lưu dự thảo
            </Button>
          )}
          {user.role === 'Admin' && order.status === 'Mới' && (
            <Button
              variant="success"
              onClick={handleApprove}
              disabled={submitting}
              icon={CheckCircle2}
              className="flex-1 sm:flex-initial"
            >
              Duyệt & Hoàn thành
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="space-y-2 mb-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Mã tham chiếu (Lệnh sản xuất)
              </label>
              <div className="bg-indigo-50/50 px-5 py-3.5 rounded-2xl border border-indigo-100 text-sm font-black text-indigo-600 uppercase shadow-inner italic">
                {order.order_code || generateOrderCode()}
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Info size={14} /> Thông tin chung
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <CustomCombobox
                    label="Định mức sản xuất *"
                    placeholder="-- Chọn định mức --"
                    value={order.bom_id || ''}
                    options={boms}
                    onChange={handleBomChange}
                    required
                  />
                  {boms.find((b) => b.id === order.bom_id)?.is_two_stage && (
                    <span className="mt-6 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold border border-green-200 uppercase">
                      2 giai đoạn
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">
                  Số lượng sản xuất *
                </label>
                <div className="relative">
                  <Calculator
                    size={14}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    readOnly={isViewOnly}
                    type="number"
                    value={order.quantity}
                    onChange={(e) => {
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
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">
                  Ngày dự kiến sản xuất
                </label>
                <div className="relative">
                  <Calendar
                    size={14}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    readOnly={isViewOnly}
                    type="date"
                    value={order.planned_date}
                    onChange={(e) => setOrder({ ...order, planned_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">
                Ghi chú lệnh
              </label>
              <textarea
                readOnly={isViewOnly}
                rows={2}
                value={order.notes || ''}
                onChange={(e) => setOrder({ ...order, notes: e.target.value })}
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
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">
                      Nguyên liệu
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">
                      Định mức
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center w-20">
                      ĐVT
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">
                      Cần dùng
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">
                      Hiện có
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center w-32">
                      Khả thi
                    </th>
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
                          <p className="text-[10px] text-gray-400 font-mono">
                            #{item.material?.code || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-right text-gray-600">
                          {item.quantity_per_unit}
                        </td>
                        <td className="px-4 py-3 text-[10px] text-center text-gray-500">
                          {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-right text-primary">
                          {formatNumber(totalNeeded)}
                        </td>
                        <td className="px-4 py-3 text-xs text-right font-medium text-gray-700">
                          {formatNumber(item.available || 0)}
                        </td>
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
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-400 italic text-xs"
                      >
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
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-6 text-white shadow-xl shadow-red-600/20">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-4">
              Tóm tắt sản xuất
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/20 pb-2">
                <span className="text-white/80">Số lượng thành phẩm:</span>
                <span className="text-xl font-black">{formatNumber(order.quantity || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">Đơn vị:</span>
                <span className="font-bold">
                  {materials.find(
                    (m) => m.id === boms.find((b) => b.id === order.bom_id)?.product_item_id,
                  )?.unit || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">Số loại nguyên liệu:</span>
                <span className="font-bold">{bomItems.length}</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-white/10 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold opacity-70 mb-2 uppercase select-none">
                Hướng dẫn
              </p>
              <ul className="text-[10px] space-y-2 text-white/90">
                <li className="flex gap-2">
                  <span>1.</span> Chọn định mức tương ứng với sản phẩm cần đúc.
                </li>
                <li className="flex gap-2">
                  <span>2.</span> Nhập số lượng cọc. Hệ thống sẽ tự tính toán vật tư.
                </li>
                <li className="flex gap-2">
                  <span>3.</span> Kiểm tra trạng thái "Khả thi" (Đủ hàng).
                </li>
                <li className="flex gap-2">
                  <span>4.</span> Bấm Duyệt để trừ kho nguyên liệu và nhập kho thành phẩm.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
