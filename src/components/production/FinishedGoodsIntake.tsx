import { CanvasLogo } from '@/components/shared/ReportExportHeader';
import { exportTableImage } from '../../utils/reportExport';
import { useState, useEffect } from 'react';
import { X, PackageCheck, Factory, Search, ChevronRight, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { ToastType } from '../shared/Toast';
import { Button } from '../shared/Button';
import { ExcelButton } from '../shared/ExcelButton';
import { SortButton, SortOption } from '../shared/SortButton';
import { formatDate, formatNumber } from '@/utils/format';
import { isActiveWarehouse } from '@/utils/inventory';
import { getAllowedWarehouses } from '@/utils/helpers';
import { useRef } from 'react';

import { SaveImageButton } from '../shared/SaveImageButton';
import { Share2, Image as LucideImageIcon } from 'lucide-react';

// ============================
// Finished Goods Intake
// ============================
export const FinishedGoodsIntake = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [intakeHistory, setIntakeHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_finGoods_${user.id}`) as SortOption) || 'newest',
  );
  const [showFilter, setShowFilter] = useState(false);
  const [isCapturingTable, setIsCapturingTable] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    so_luong: 0,
    kho_id: '',
    ghi_chu: '',
  });

  useEffect(() => {
    fetchActiveOrders();
    fetchWarehouses();
  }, []);

  const handleSaveTableImage = () => {
    const reportElem = reportRef.current || tableBillRef.current;
    if (reportElem) {
      exportTableImage({
        element: reportElem,
        fileName: 'Bao_Cao.png',
        addToast,
        onStart: () => setIsCapturingTable(true),
        onEnd: () => setIsCapturingTable(false),
      });
    }
  };

  const fetchActiveOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lenh_san_xuat')
        .select('*, san_pham_bom(ten_san_pham), warehouses(name), users(full_name)')
        .eq('trang_thai', 'dang_san_xuat')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching active orders:', err);
    } finally {
      setLoading(false);
    }
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
    if (data) setWarehouses(data.filter(isActiveWarehouse));
  };

  const fetchIntakeHistory = async (orderId: string) => {
    const { data } = await supabase
      .from('lenh_nhap_thanh_pham')
      .select('*, warehouses(name), users(full_name)')
      .eq('lenh_id', orderId)
      .order('ngay_nhap', { ascending: false });
    setIntakeHistory(data || []);
  };

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    fetchIntakeHistory(order.id);
  };

  const handleOpenIntake = () => {
    if (!selectedOrder) return;
    setFormData({ so_luong: 0, kho_id: '', ghi_chu: '' });
    setShowModal(true);
  };

  const handleSubmitIntake = async () => {
    if (!selectedOrder) return;
    const remaining = selectedOrder.so_luong_ke_hoach - selectedOrder.so_luong_hoan_thanh;

    if (formData.so_luong <= 0) {
      if (addToast) addToast('Số lượng phải lớn hơn 0', 'error');
      return;
    }
    if (formData.so_luong > remaining) {
      if (addToast) addToast(`Số lượng tối đa còn lại: ${remaining}`, 'error');
      return;
    }
    if (!formData.kho_id) {
      if (addToast) addToast('Vui lòng chọn kho nhập thành phẩm', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Create intake record
      const { data: intakeData, error: intakeError } = await supabase
        .from('lenh_nhap_thanh_pham')
        .insert([
          {
            lenh_id: selectedOrder.id,
            so_luong: formData.so_luong,
            kho_id: formData.kho_id,
            ngay_nhap: today,
            nguoi_nhap: user.id,
            ghi_chu: formData.ghi_chu || null,
            trang_thai: 'cho_duyet',
          },
        ])
        .select()
        .single();
      if (intakeError) throw intakeError;

      // 2. Create stock_in for finished product (auto-approved)
      const productName = selectedOrder.san_pham_bom?.ten_san_pham || 'Thành phẩm';

      // Find or create material for the finished product
      let materialId: string | null = null;
      const { data: existingMat } = await supabase
        .from('materials')
        .select('id')
        .eq('name', productName)
        .maybeSingle();

      if (existingMat) {
        materialId = existingMat.id;
      } else {
        const { data: newMat } = await supabase
          .from('materials')
          .insert([
            { name: productName, unit: 'cái', code: `TP-${Date.now().toString(36).toUpperCase()}` },
          ])
          .select()
          .single();
        if (newMat) materialId = newMat.id;
      }

      if (materialId) {
        const { error: stockInError } = await supabase.from('stock_in').insert([
          {
            slip_code: `NTP-${selectedOrder.ma_lenh}`,
            date: today,
            material_id: materialId,
            warehouse_id: formData.kho_id,
            quantity: formData.so_luong,
            unit: 'cái',
            employee_id: user.id,
            notes: `Nhập thành phẩm (Chờ duyệt) - Lệnh SX: ${selectedOrder.ma_lenh}`,
            status: 'Chờ duyệt',
            approved_by: null,
            approved_date: null,
          },
        ]);
        if (stockInError) throw stockInError;
      }

      if (addToast)
        addToast(
          `Đã tạo phiếu nhập ${formData.so_luong} thành phẩm. Vui lòng chờ Admin duyệt.`,
          'success',
        );

      setShowModal(false);
      fetchActiveOrders();
      fetchIntakeHistory(selectedOrder.id);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveIntake = async (intake: any) => {
    if (user.role !== 'Admin' && user.role !== 'Develop') {
      if (addToast) addToast('Bạn không có quyền duyệt phiếu này', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Approve stock_in
      await supabase
        .from('stock_in')
        .update({
          status: 'Đã duyệt',
          approved_by: user.id,
          approved_date: today,
        })
        .eq('slip_code', `NTP-${selectedOrder.ma_lenh}`)
        .is('approved_by', null)
        .limit(1); // Careful with slip_code collisions

      // 2. Update intake status
      await supabase
        .from('lenh_nhap_thanh_pham')
        .update({ trang_thai: 'da_duyet' })
        .eq('id', intake.id);

      // 3. Update production order progress
      const newCompleted = selectedOrder.so_luong_hoan_thanh + intake.so_luong;
      const updatedStatus =
        newCompleted >= selectedOrder.so_luong_ke_hoach ? 'hoan_thanh' : 'dang_san_xuat';

      await supabase
        .from('lenh_san_xuat')
        .update({
          so_luong_hoan_thanh: newCompleted,
          trang_thai: updatedStatus,
        })
        .eq('id', selectedOrder.id);

      if (addToast) addToast('Đã duyệt phiếu nhập thành phẩm', 'success');
      fetchActiveOrders();
      fetchIntakeHistory(selectedOrder.id);
      setSelectedOrder({
        ...selectedOrder,
        so_luong_hoan_thanh: newCompleted,
        trang_thai: updatedStatus,
      });
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectIntake = async (intake: any) => {
    if (!window.confirm('Từ chối và xóa phiếu nhập này?')) return;

    setSubmitting(true);
    try {
      // 1. Delete associated stock_in (the one that is pending)
      await supabase
        .from('stock_in')
        .delete()
        .eq('slip_code', `NTP-${selectedOrder.ma_lenh}`)
        .eq('status', 'Chờ duyệt')
        .limit(1);

      // 2. Delete intake record
      await supabase.from('lenh_nhap_thanh_pham').delete().eq('id', intake.id);

      if (addToast) addToast('Đã từ chối phiếu nhập', 'info');
      fetchIntakeHistory(selectedOrder.id);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cho_duyet':
        return { label: 'Chờ duyệt', bg: 'bg-primary/10', text: 'text-primary' };
      case 'da_duyet':
        return { label: 'Đã duyệt', bg: 'bg-green-100', text: 'text-green-700' };
      default:
        return { label: 'Đã duyệt', bg: 'bg-green-100', text: 'text-green-700' };
    }
  };

  const warehouseOptions = warehouses.map((w) => ({ id: w.id, name: w.name }));

  const filteredOrders = orders
    .filter((o) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        (o.ma_lenh || '').toLowerCase().includes(s) ||
        (o.ten_san_pham || '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest')
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'code') return (a.ma_lenh || '').localeCompare(b.ma_lenh || '');
      return 0;
    });

  const handleExportExcel = () => {
    import('@/utils/excelExport').then(({ exportToExcel }) => {
      exportToExcel({
        title: 'Báo cáo Tiến độ Nhập kho Thành phẩm',
        sheetName: 'Tiến độ',
        columns: ['Mã lệnh', 'Sản phẩm', 'Kế hoạch', 'Đã nhập', 'Còn lại', 'Trạng thái'],
        rows: filteredOrders.map((o) => {
          const remaining = o.so_luong_ke_hoach - o.so_luong_hoan_thanh;
          return [
            o.ma_lenh,
            o.san_pham_bom?.ten_san_pham || '—',
            o.so_luong_ke_hoach,
            o.so_luong_hoan_thanh,
            remaining,
            o.trang_thai === 'hoan_thanh' ? 'Hoàn thành' : 'Đang sản xuất',
          ];
        }),
        fileName: `CDX_TienDoNhapKho_${new Date().toISOString().split('T')[0]}.xlsx`,
        addToast,
      });
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Nhập kho thành phẩm" onBack={onBack} />
        <div className="flex items-center gap-1.5 justify-end flex-1">
          <SaveImageButton
            onClick={handleSaveTableImage}
            isCapturing={isCapturingTable}
            title="Lưu ảnh tiến độ nhập kho"
          />
          <ExcelButton onClick={handleExportExcel} size="icon" />
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_finGoods_${user.id}`, val);
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'code', label: 'Mã lệnh' },
            ]}
          />
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter((f) => !f)}
            icon={Search}
            className={showFilter ? '' : 'border-gray-200'}
          />
        </div>
      </div>

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: showFilter ? 'visible' : 'hidden' }}
          >
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Mã lệnh, tên sản phẩm..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Active orders list */}
        <div className="flex-1 space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase">
            Lệnh đang sản xuất ({filteredOrders.length})
          </h3>

          {loading ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm">Đang tải...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <Factory size={48} className="mb-3 text-gray-300" />
              <p className="font-medium">
                {searchTerm ? 'Không tìm thấy kết quả' : 'Không có lệnh đang sản xuất'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const remaining = order.so_luong_ke_hoach - order.so_luong_hoan_thanh;
              const progress = Math.round(
                (order.so_luong_hoan_thanh / order.so_luong_ke_hoach) * 100,
              );

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleSelectOrder(order)}
                  className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all hover:shadow-md ${
                    selectedOrder?.id === order.id
                      ? 'border-primary shadow-md ring-2 ring-primary/10'
                      : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-800 text-sm">{order.ma_lenh}</h3>
                      <p className="text-[10px] text-gray-400">
                        {order.san_pham_bom?.ten_san_pham} • {formatDate(order.ngay_phat_lenh)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">Còn lại: {remaining}</p>
                      <p className="text-[10px] text-gray-400">
                        Đã nhập: {order.so_luong_hoan_thanh}/{order.so_luong_ke_hoach}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right: Intake detail */}
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 space-y-4"
          >
            {/* Order info card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <PackageCheck size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{selectedOrder.ma_lenh}</h3>
                    <p className="text-[10px] text-gray-500">
                      {selectedOrder.san_pham_bom?.ten_san_pham}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 hover:bg-gray-100 rounded-full hidden lg:block"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-lg font-black text-blue-600">
                    {selectedOrder.so_luong_ke_hoach}
                  </p>
                  <p className="text-[10px] text-blue-500 font-bold">Kế hoạch</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-lg font-black text-green-600">
                    {selectedOrder.so_luong_hoan_thanh}
                  </p>
                  <p className="text-[10px] text-green-500 font-bold">Đã nhập</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-lg font-black text-amber-600">
                    {selectedOrder.so_luong_ke_hoach - selectedOrder.so_luong_hoan_thanh}
                  </p>
                  <p className="text-[10px] text-amber-500 font-bold">Còn lại</p>
                </div>
              </div>

              {selectedOrder.trang_thai === 'dang_san_xuat' &&
                selectedOrder.so_luong_hoan_thanh < selectedOrder.so_luong_ke_hoach && (
                  <Button
                    variant="primary"
                    icon={PackageCheck}
                    onClick={handleOpenIntake}
                    className="w-full"
                  >
                    Nhập kho thành phẩm
                  </Button>
                )}
            </div>

            {/* Intake history */}
            {intakeHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-xs font-bold text-gray-600 uppercase">
                    Lịch sử nhập ({intakeHistory.length} đợt)
                  </h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {intakeHistory.map((intake) => {
                    const badge = getStatusBadge(intake.trang_thai);
                    return (
                      <div key={intake.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-800">
                                +{intake.so_luong} sản phẩm
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${badge.bg} ${badge.text}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {formatDate(intake.ngay_nhap)} • {intake.users?.full_name} •{' '}
                              {intake.warehouses?.name}
                            </p>
                          </div>
                          <Package
                            size={16}
                            className={
                              intake.trang_thai === 'cho_duyet' ? 'text-primary' : 'text-green-500'
                            }
                          />
                        </div>

                        {intake.trang_thai === 'cho_duyet' &&
                          (user.role === 'Admin' || user.role === 'Develop') && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveIntake(intake)}
                                className="flex-1 py-1.5 rounded-lg bg-green-50 text-green-600 text-[10px] font-bold hover:bg-green-100"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => handleRejectIntake(intake)}
                                className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold hover:bg-red-100"
                              >
                                Từ chối
                              </button>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Intake modal */}
      <AnimatePresence>
        {showModal && selectedOrder && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <PackageCheck size={20} className="text-green-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">Nhập thành phẩm</h2>
                  <p className="text-[10px] text-gray-500">
                    {selectedOrder.san_pham_bom?.ten_san_pham} • Còn lại:{' '}
                    {selectedOrder.so_luong_ke_hoach - selectedOrder.so_luong_hoan_thanh}
                  </p>
                </div>
              </div>

              <NumericInput
                label="Số lượng nhập đợt này *"
                value={formData.so_luong}
                onChange={(val) => setFormData({ ...formData, so_luong: val })}
              />

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Kho nhập thành phẩm *
                </label>
                <CreatableSelect
                  value={formData.kho_id}
                  options={warehouseOptions}
                  onChange={(val) => setFormData({ ...formData, kho_id: val })}
                  placeholder="Chọn kho nhập..."
                  allowCreate={false}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={formData.ghi_chu}
                  onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                  placeholder="VD: Đợt 1, đã kiểm tra chất lượng"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitIntake}
                  disabled={submitting}
                  className="px-8 py-2.5 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Report Template (A4 Landscape) */}
      <div className="fixed -left-[4000px] -top-[4000px] no-print">
        <div
          ref={reportRef}
          className="bg-white p-12 w-[1123px] min-h-[794px] font-sans text-gray-900 border"
          style={{ width: '1123px' }}
        >
          {/* Company Header */}
          <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-primary/20">
            <div className="flex items-center gap-6">
              <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10">
                <CanvasLogo size={96} className="w-24 h-24 rounded-3xl object-contain shadow-sm" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-primary tracking-tighter uppercase italic">
                  CDX ERP SYSTEM
                </h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">
                  Smart Construction Management • 2026 Edition
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 italic">
                    Production Fulfillment Center
                  </span>
                  <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                  <span className="text-[10px] text-gray-500 font-bold italic tracking-wide">
                    Ref ID: {new Date().getTime().toString(36).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-1">
                Báo Cáo Tiến Độ Nhập Kho
              </h2>
              <p className="text-xs text-gray-500 font-bold italic">
                Thời gian xuất: {new Date().toLocaleString('vi-VN')}
              </p>
              <div className="mt-4 flex flex-col items-end gap-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">
                  STATUS: INTAKE_PROGRESS_AUDIT
                </p>
                <div className="h-0.5 w-12 bg-primary/20 rounded-full" />
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 w-16 text-center">
                  STT
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Mã lệnh
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Tên sản phẩm
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 text-right">
                  Kế hoạch
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 text-right">
                  Đã nhập
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 text-right">
                  Còn lại
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic text-center w-32">
                  Tiến độ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredOrders.map((order, idx) => {
                const remaining = order.so_luong_ke_hoach - order.so_luong_hoan_thanh;
                const progress = Math.min(
                  100,
                  Math.round((order.so_luong_hoan_thanh / order.so_luong_ke_hoach) * 100),
                );
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                    <td className="px-6 py-4 text-center text-gray-400 font-bold">{idx + 1}</td>
                    <td className="px-6 py-4 font-black text-primary font-mono tracking-tighter">
                      #{order.ma_lenh}
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900 uppercase tracking-tight break-words whitespace-normal leading-relaxed">
                      {order.san_pham_bom?.ten_san_pham || '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-600">
                      {formatNumber(order.so_luong_ke_hoach)}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-green-600">
                      {formatNumber(order.so_luong_hoan_thanh)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-600">
                      {formatNumber(remaining)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-black text-primary text-[10px] tracking-widest">
                          {progress}%
                        </span>
                        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Branding */}
          <div className="mt-12 flex justify-between items-end border-t border-gray-100 pt-6">
            <div className="space-y-1">
              <p className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] italic whitespace-nowrap">
                CDX ERP SYSTEM
              </p>
              <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                End of intake progress report • Production Operations Hub
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1">
                Production Integrity Verified
              </p>
              <div className="text-[10px] text-gray-400 font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                System Token:{' '}
                <span className="text-primary font-black tracking-widest italic ml-1 underline">
                  PRD-INT-SYNC
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
