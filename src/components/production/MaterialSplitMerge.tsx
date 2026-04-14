import { CanvasLogo } from '@/components/shared/ReportExportHeader';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  X,
  Scissors,
  Merge,
  ArrowRight,
  Package,
  Trash2,
  ChevronRight,
  Edit,
  Check,
  Image as LucideImageIcon,
  Share2,
} from 'lucide-react';
import { useRef } from 'react';
import { exportTableImage } from '../../utils/reportExport';
import { SaveImageButton } from '../shared/SaveImageButton';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { ToastType } from '../shared/Toast';
import { FAB } from '../shared/FAB';
import { Button } from '../shared/Button';
import { SortButton, SortOption } from '../shared/SortButton';
import { ExcelButton } from '../shared/ExcelButton';
import { formatDate, formatNumber } from '@/utils/format';
import {
  isActiveWarehouse,
  getAvailableStock,
  getDetailedStock,
  validateFutureImpact,
} from '@/utils/inventory';
import { getAllowedWarehouses, isUUID } from '@/utils/helpers';

import { QuickAddMaterialModal } from '../shared/QuickAddMaterialModal';
import { ConfirmModal } from '../shared/ConfirmModal';
import { useInventoryData } from '@/hooks/useInventoryData';

// ============================
// Material Split / Merge
// ============================
export const MaterialSplitMerge = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const {
    warehouses,
    materials: inventoryMaterials,
    groups,
    refreshAll,
  } = useInventoryData(user.data_view_permission);
  const materials = inventoryMaterials || [];
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'xa' | 'gop'>('xa');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_splitMerge_${user.id}`) as SortOption) || 'newest',
  );
  const [showFilter, setShowFilter] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [isCapturingTable, setIsCapturingTable] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [showDetailPhieu, setShowDetailPhieu] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [phieuToReject, setPhieuToReject] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [phieuToDelete, setPhieuToDelete] = useState<any>(null);
  const [selectedPhieu, setSelectedPhieu] = useState<any>(null);
  const [quickAddTarget, setQuickAddTarget] = useState<{
    type: 'nguonXa' | 'outputXa' | 'nguonGop' | 'outputGop';
    index?: number;
  } | null>(null);
  const [initialMaterialName, setInitialMaterialName] = useState('');
  const [showEditApprovedConfirm, setShowEditApprovedConfirm] = useState(false);
  const [showMismatchConfirm, setShowMismatchConfirm] = useState(false);
  const [mismatchData, setMismatchData] = useState<any>(null);
  const [pendingPhieuToEdit, setPendingPhieuToEdit] = useState<any>(null);

  // Form
  const [kho_id, setKhoId] = useState('');
  const [ghi_chu, setGhiChu] = useState('');

  // Xả: 1 nguồn → N output
  const [nguonXa, setNguonXa] = useState({
    material_id: '',
    material_name: '',
    so_luong: 0,
    don_vi: '',
    ton_kho: 0,
  });
  const [outputXa, setOutputXa] = useState<any[]>([]);

  // Gộp: N nguồn → 1 output
  const [nguonGop, setNguonGop] = useState<any[]>([]);
  const [outputGop, setOutputGop] = useState({
    material_id: '',
    material_name: '',
    so_luong: 0,
    don_vi: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingPhieu, setEditingPhieu] = useState<any>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  // Cập nhật tồn kho khi đổi kho
  useEffect(() => {
    if (kho_id && nguonXa.material_id && isUUID(nguonXa.material_id)) {
      getAvailableStock(nguonXa.material_id, kho_id, new Date().toISOString().split('T')[0]).then(
        (tk) => setNguonXa((p) => ({ ...p, ton_kho: tk })),
      );
    }
     
  }, [kho_id]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('xasa_gop_phieu')
        .select(
          '*, warehouses(name), users(full_name), xasa_gop_chi_tiet(*, materials(name, code))',
        )
        .or('status.is.null,status.neq.Đã xóa')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Normalize statuses
      const normalized = (data || []).map((h: any) => ({
        ...h,
        status:
          h.status === 'cho_duyet'
            ? 'Chờ duyệt'
            : h.status === 'da_duyet'
              ? 'Đã duyệt'
              : h.status === 'da_huy'
                ? 'Từ chối'
                : h.status || 'Chờ duyệt',
      }));

      setHistory(normalized);
    } catch (err: any) {
      console.error('Error fetching history:', err);
      if (addToast)
        addToast(`Không thể tải lịch sử: ${err.message || 'Lỗi kết nối database'}`, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchMaterials = async () => {
    /* Removed, use hook instead */
  };
  const fetchWarehouses = async () => {
    /* Removed, use hook instead */
  };

  const generateCode = (type: 'xa' | 'gop') => {
    const prefix = type === 'xa' ? 'XA' : 'GOP';
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${yyyy}${mm}${dd}-${random}`;
  };

  const openModal = (type: 'xa' | 'gop') => {
    setMode(type);
    setKhoId('');
    setGhiChu('');
    setNguonXa({ material_id: '', material_name: '', so_luong: 0, don_vi: '', ton_kho: 0 });
    setOutputXa([]);
    setNguonGop([]);
    setOutputGop({ material_id: '', material_name: '', so_luong: 0, don_vi: '' });
    setIsEditing(false);
    setEditingPhieu(null);
    setShowModal(true);
  };

  const handleEditPhieu = (phieu: any) => {
    if (phieu.status === 'Đã duyệt') {
      setPendingPhieuToEdit(phieu);
      setShowEditApprovedConfirm(true);
      return;
    }
    startEditFlow(phieu);
  };

  const startEditFlow = (phieu: any) => {
    setMode(phieu.loai);
    setKhoId(phieu.kho_id);
    setGhiChu(phieu.ghi_chu || '');
    setIsEditing(true);
    setEditingPhieu(phieu);

    const details = phieu.xasa_gop_chi_tiet || [];
    if (phieu.loai === 'xa') {
      const nguon = details.find((d: any) => d.vai_tro === 'nguon');
      const outputs = details.filter((d: any) => d.vai_tro === 'ra');
      if (nguon) {
        setNguonXa({
          material_id: nguon.material_id,
          material_name: nguon.materials?.name || '',
          so_luong: nguon.so_luong,
          don_vi: nguon.don_vi,
          ton_kho: 0, // Will be fetched if needed
        });
      }
      setOutputXa(
        outputs.map((o: any) => ({
          material_id: o.material_id,
          material_name: o.materials?.name || '',
          so_luong: o.so_luong,
          don_vi: o.don_vi,
        })),
      );
    } else {
      const nguons = details.filter((d: any) => d.vai_tro === 'nguon');
      const output = details.find((d: any) => d.vai_tro === 'ra');
      setNguonGop(
        nguons.map((n: any) => ({
          material_id: n.material_id,
          material_name: n.materials?.name || '',
          so_luong: n.so_luong,
          don_vi: n.don_vi,
          ton_kho: 0,
        })),
      );
      if (output) {
        setOutputGop({
          material_id: output.material_id,
          material_name: output.materials?.name || '',
          so_luong: output.so_luong,
          don_vi: output.don_vi,
        });
      }
    }

    setShowDetailPhieu(false);
    setShowModal(true);
  };

  const handleSelectNguonXa = async (matId: string) => {
    const mat = materials.find((m) => m.id === matId);
    let tonKho = 0;
    if (kho_id) {
      try {
        tonKho = await getAvailableStock(matId, kho_id, new Date().toISOString().split('T')[0]);
      } catch (e) {}
    }
    setNguonXa({
      material_id: matId,
      material_name: mat?.name || '',
      so_luong: 0,
      don_vi: mat?.unit || '',
      ton_kho: tonKho,
    });
  };

  const addOutputXa = () => {
    setOutputXa([...outputXa, { material_id: '', material_name: '', so_luong: 0, don_vi: '' }]);
  };

  const addNguonGop = () => {
    setNguonGop([
      ...nguonGop,
      { material_id: '', material_name: '', so_luong: 0, don_vi: '', ton_kho: 0 },
    ]);
  };

  const handleSubmit = async () => {
    if (!kho_id) {
      if (addToast) addToast('Vui lòng chọn kho', 'error');
      return;
    }

    // Validate material_id là UUID hợp lệ
    if (mode === 'xa') {
      if (!isUUID(nguonXa.material_id)) {
        if (addToast)
          addToast(
            'Vật tư nguồn không hợp lệ. Vui lòng chọn từ danh sách hoặc thêm vật tư nhanh.',
            'error',
          );
        return;
      }
      for (const o of outputXa) {
        if (!isUUID(o.material_id)) {
          if (addToast)
            addToast(
              'Vật tư đầu ra không hợp lệ. Vui lòng chọn từ danh sách hoặc thêm vật tư nhanh.',
              'error',
            );
          return;
        }
      }
    } else {
      for (const n of nguonGop) {
        if (!isUUID(n.material_id)) {
          if (addToast)
            addToast(
              'Vật tư nguồn không hợp lệ. Vui lòng chọn từ danh sách hoặc thêm vật tư nhanh.',
              'error',
            );
          return;
        }
      }
      if (!isUUID(outputGop.material_id)) {
        if (addToast)
          addToast(
            'Vật tư gộp ra không hợp lệ. Vui lòng chọn từ danh sách hoặc thêm vật tư nhanh.',
            'error',
          );
        return;
      }
    }

    setSubmitting(true);
    try {
      const ma_phieu = isEditing ? editingPhieu.ma_phieu : generateCode(mode);
      const today = new Date().toISOString().split('T')[0];
      if (mode === 'xa') {
        const stockInfo = await getDetailedStock(
          nguonXa.material_id,
          kho_id,
          today,
          isEditing ? editingPhieu.id : undefined,
        );
        if (stockInfo.available < Number(nguonXa.so_luong)) {
          throw new Error(`
❌ Không đủ tồn kho thực hiện Xả:
- Vật tư: ${nguonXa.material_name}
- Tồn thực tế: ${formatNumber(stockInfo.actual)}
- Đang giữ chỗ (Chờ duyệt): ${formatNumber(stockInfo.pendingOut)}
- Khả dụng ngay: ${formatNumber(stockInfo.available)}
→ Vui lòng giảm số lượng hoặc duyệt phiếu nhập trước.`);
        }
      } else {
        for (const n of nguonGop) {
          const stockInfo = await getDetailedStock(
            n.material_id,
            kho_id,
            today,
            isEditing ? editingPhieu.id : undefined,
          );
          if (stockInfo.available < Number(n.so_luong)) {
            throw new Error(`
❌ Không đủ tồn kho thực hiện Gộp:
- Vật tư: ${n.material_name}
- Tồn thực tế: ${formatNumber(stockInfo.actual)}
- Đang giữ chỗ (Chờ duyệt): ${formatNumber(stockInfo.pendingOut)}
- Khả dụng ngay: ${formatNumber(stockInfo.available)}
→ Vui lòng giảm số lượng hoặc duyệt phiếu nhập trước.`);
          }
        }
      }

      const totalIn =
        mode === 'xa' ? nguonXa.so_luong : nguonGop.reduce((sum, n) => sum + n.so_luong, 0);
      const totalOut =
        mode === 'xa' ? outputXa.reduce((sum, o) => sum + o.so_luong, 0) : outputGop.so_luong;

      if (Math.abs(totalIn - totalOut) > 0.001 && !mismatchData) {
        setMismatchData({ totalIn, totalOut });
        setShowMismatchConfirm(true);
        setSubmitting(false);
        return;
      }

      let phieuId = isEditing ? editingPhieu.id : null;

      if (isEditing) {
        // 1. Update phieu header
        await supabase
          .from('xasa_gop_phieu')
          .update({
            kho_id,
            ghi_chu: ghi_chu || null,
            status: 'Chờ duyệt',
            updated_at: new Date().toISOString(),
          })
          .eq('id', phieuId);

        // 2. Clean up old details and stock records (soft delete stock, hard delete details to recreate)
        await supabase.from('xasa_gop_chi_tiet').delete().eq('phieu_id', phieuId);

        // Use the ma_phieu directly as it already contains the prefix (XA... or GOP...)
        await supabase
          .from('stock_in')
          .update({ status: 'Đã xóa' })
          .ilike('import_code', `${ma_phieu}%`);
        await supabase
          .from('stock_out')
          .update({ status: 'Đã xóa' })
          .ilike('export_code', `${ma_phieu}%`);
      } else {
        // Create new
        const { data: phieu, error: phieuErr } = await supabase
          .from('xasa_gop_phieu')
          .insert([
            {
              ma_phieu,
              loai: mode,
              ngay: today,
              kho_id,
              nguoi_tao: user.id,
              ghi_chu: ghi_chu || null,
              status: 'Chờ duyệt',
            },
          ])
          .select()
          .single();
        if (phieuErr) throw phieuErr;
        // set phieuId for details
        phieuId = phieu.id;
      }

      if (mode === 'xa') {
        // Validate and insert (Same as before but use phieuId)
        if (!nguonXa.material_id || nguonXa.so_luong <= 0)
          throw new Error('Vui lòng chọn vật tư nguồn và nhập số lượng');
        if (outputXa.length === 0) throw new Error('Vui lòng thêm ít nhất 1 mảnh ra');

        const details = [
          {
            phieu_id: phieuId,
            material_id: nguonXa.material_id,
            vai_tro: 'nguon',
            so_luong: nguonXa.so_luong,
            don_vi: nguonXa.don_vi,
          },
          ...outputXa.map((o: any) => ({
            phieu_id: phieuId,
            material_id: o.material_id,
            vai_tro: 'ra',
            so_luong: o.so_luong,
            don_vi: o.don_vi,
          })),
        ];
        await supabase.from('xasa_gop_chi_tiet').insert(details);

        const { error: stockOutErr } = await supabase.from('stock_out').insert([
          {
            export_code: ma_phieu,
            date: today,
            material_id: nguonXa.material_id,
            warehouse_id: kho_id,
            quantity: nguonXa.so_luong,
            unit: nguonXa.don_vi,
            unit_price: 0,
            total_amount: 0,
            employee_id: user.id,
            notes: `Xả vật tư${isEditing ? ' (Cập nhật)' : ''} - Phiếu: ${ma_phieu}`,
            status: 'Chờ duyệt',
          },
        ]);
        if (stockOutErr) throw stockOutErr;

        const stockInItems = outputXa.map((o: any, idx: number) => ({
          import_code: `${ma_phieu}-${idx + 1}`,
          date: today,
          material_id: o.material_id,
          warehouse_id: kho_id,
          quantity: o.so_luong,
          unit: o.don_vi,
          unit_price: 0,
          total_amount: 0,
          employee_id: user.id,
          notes: `Mảnh ra từ xả vật tư${isEditing ? ' (Cập nhật)' : ''} - Phiếu: ${ma_phieu}`,
          status: 'Chờ duyệt',
        }));
        const { error: stockInErr } = await supabase.from('stock_in').insert(stockInItems);
        if (stockInErr) throw stockInErr;
      } else {
        // GỘP
        if (nguonGop.length === 0) throw new Error('Vui lòng thêm vật tư nguồn');
        if (!outputGop.material_id || outputGop.so_luong <= 0)
          throw new Error('Vui lòng khai báo vật tư gộp ra');

        const details = [
          ...nguonGop.map((n: any) => ({
            phieu_id: phieuId,
            material_id: n.material_id,
            vai_tro: 'nguon',
            so_luong: n.so_luong,
            don_vi: n.don_vi,
          })),
          {
            phieu_id: phieuId,
            material_id: outputGop.material_id,
            vai_tro: 'ra',
            so_luong: outputGop.so_luong,
            don_vi: outputGop.don_vi,
          },
        ];
        await supabase.from('xasa_gop_chi_tiet').insert(details);

        const stockOuts = nguonGop.map((n: any, idx: number) => ({
          export_code: `${ma_phieu}-${idx + 1}`,
          date: today,
          material_id: n.material_id,
          warehouse_id: kho_id,
          quantity: n.so_luong,
          unit: n.don_vi,
          unit_price: 0,
          total_amount: 0,
          employee_id: user.id,
          notes: `Gộp vật tư${isEditing ? ' (Cập nhật)' : ''} - Phiếu: ${ma_phieu}`,
          status: 'Chờ duyệt',
        }));
        const { error: gopStockOutErr } = await supabase.from('stock_out').insert(stockOuts);
        if (gopStockOutErr) throw gopStockOutErr;

        const { error: gopStockInErr } = await supabase.from('stock_in').insert([
          {
            import_code: ma_phieu,
            date: today,
            material_id: outputGop.material_id,
            warehouse_id: kho_id,
            quantity: outputGop.so_luong,
            unit: outputGop.don_vi,
            unit_price: 0,
            total_amount: 0,
            employee_id: user.id,
            notes: `Vật tư gộp ra${isEditing ? ' (Cập nhật)' : ''} - Phiếu: ${ma_phieu}`,
            status: 'Chờ duyệt',
          },
        ]);
        if (gopStockInErr) throw gopStockInErr;
      }

      if (isEditing) {
        if (addToast) addToast(`Phiếu ${ma_phieu} đã được cập nhật!`, 'success');
      } else {
        if (addToast) addToast(`Phiếu ${ma_phieu} đã được tạo và đang chờ duyệt!`, 'success');
      }
      setShowModal(false);
      fetchHistory();
    } catch (err: any) {
      console.error('Submit error:', err);
      const userMsg =
        err.message || 'Đã xảy ra lỗi khi lưu phiếu. Vui lòng kiểm tra lại kết nối mạng.';
      if (addToast) addToast('❌ Lỗi hệ thống: ' + userMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePhieu = async (phieu: any) => {
    if (user.role !== 'Admin' && user.role !== 'Develop') {
      if (addToast) addToast('Bạn không có quyền duyệt phiếu này', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const slipCode = phieu.ma_phieu; // Use directly

      // 1. Validate tồn kho cho các phiếu xuất trước khi duyệt
      const { data: stockOutRecords } = await supabase
        .from('stock_out')
        .select('id, material_id, warehouse_id, quantity')
        .ilike('export_code', `${slipCode}%`)
        .eq('status', 'Chờ duyệt');

      if (stockOutRecords && stockOutRecords.length > 0) {
        for (const rec of stockOutRecords) {
          // Sử dụng validateFutureImpact để kiểm tra xem việc xuất kho này có làm tồn kho bị âm
          // vào bất kỳ thời điểm nào từ hôm nay trở đi hay không.
          // Quan trọng: Truyền rec.id vào excludeId để không tự trừ đi chính nó.
          const impact = await validateFutureImpact(
            rec.material_id,
            rec.warehouse_id,
            today,
            -Number(rec.quantity),
            rec.id,
          );

          if (!impact.valid) {
            const mat = materials.find((m) => m.id === rec.material_id);
            const detailStock = await getDetailedStock(
              rec.material_id,
              rec.warehouse_id,
              today,
              rec.id,
            );

            if (addToast)
              addToast(
                `❌ Từ chối duyệt: Không đủ tồn kho cho "${mat?.name || 'Vật tư'}"
- Tồn thực tế: ${formatNumber(detailStock.actual)}
- Đang giữ chỗ (phiếu khác): ${formatNumber(detailStock.pendingOut)}
- Khả dụng: ${formatNumber(detailStock.available)}
- Cần xuất thêm: ${formatNumber(Number(rec.quantity))}
- Sẽ bị âm vào ngày: ${formatDate(impact.failedDate || today)}
→ Vui lòng kiểm tra lại hoặc nhập thêm hàng trước khi duyệt.`,
                'error',
              );
            setSubmitting(false);
            return;
          }
        }
      }

      // 2. Approve associated stock_in/out (Only pending ones to avoid resurrecting deleted/rejected records)
      const { error: siErr } = await supabase
        .from('stock_in')
        .update({ status: 'Đã duyệt' })
        .ilike('import_code', `${slipCode}%`)
        .eq('status', 'Chờ duyệt');
      if (siErr) {
        console.error('Error approving stock_in:', siErr);
        throw new Error(`Lỗi cập nhật phiếu nhập kho liên quan: ${siErr.message}`);
      }

      const { error: soErr } = await supabase
        .from('stock_out')
        .update({ status: 'Đã duyệt' })
        .ilike('export_code', `${slipCode}%`)
        .eq('status', 'Chờ duyệt');
      if (soErr) {
        console.error('Error approving stock_out:', soErr);
        throw new Error(`Lỗi cập nhật phiếu xuất kho liên quan: ${soErr.message}`);
      }

      // 3. Update phieu status
      const { error } = await supabase
        .from('xasa_gop_phieu')
        .update({
          status: 'Đã duyệt',
        })
        .eq('id', phieu.id);
      if (error) throw error;

      if (addToast) addToast(`Đã duyệt phiếu ${phieu.ma_phieu} thành công!`, 'success');
      fetchHistory();
    } catch (err: any) {
      console.error('Approval flow error:', err);
      const userMessage = err.message || 'Máy chủ không phản hồi hoặc lệnh bị từ chối.';
      if (addToast) addToast('🚫 Lỗi duyệt: ' + userMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPhieu = async (phieu: any) => {
    setPhieuToReject(phieu);
    setShowRejectConfirm(true);
  };

  const confirmRejectPhieu = async () => {
    const phieu = phieuToReject;
    if (!phieu) return;
    setShowRejectConfirm(false);
    setSubmitting(true);
    try {
      const slipCode = phieu.ma_phieu;

      // Set associated stock records to "Từ chối"
      await supabase
        .from('stock_in')
        .update({ status: 'Từ chối' })
        .ilike('import_code', `${slipCode}%`);
      await supabase
        .from('stock_out')
        .update({ status: 'Từ chối' })
        .ilike('export_code', `${slipCode}%`);

      // Đưa phieu header vào trạng thái "Từ chối"
      const { error } = await supabase
        .from('xasa_gop_phieu')
        .update({ status: 'Từ chối' })
        .eq('id', phieu.id);
      if (error) throw error;

      if (addToast) addToast(`Đã từ chối phiếu ${phieu.ma_phieu}`, 'info');
      fetchHistory();
    } catch (err: any) {
      console.error('Reject error:', err);
      if (addToast)
        addToast('❌ Lỗi từ chối: ' + (err.message || 'Không thể cập nhật trạng thái'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePhieu = (phieu: any) => {
    if (!phieu) {
      if (addToast) addToast('❌ Lỗi: Không tìm thấy thông tin phiếu để xóa', 'error');
      return;
    }
    setPhieuToDelete(phieu);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePhieu = async () => {
    const phieu = phieuToDelete;
    if (!phieu) return;
    setShowDeleteConfirm(false);
    setSubmitting(true);
    try {
      const slipCode = phieu.ma_phieu;

      // Soft delete associated stock records
      const { error: siErr } = await supabase
        .from('stock_in')
        .update({ status: 'Đã xóa' })
        .ilike('import_code', `${slipCode}%`);
      if (siErr) throw new Error(`Lỗi xóa dữ liệu nhập kho: ${siErr.message}`);

      const { error: soErr } = await supabase
        .from('stock_out')
        .update({ status: 'Đã xóa' })
        .ilike('export_code', `${slipCode}%`);
      if (soErr) throw new Error(`Lỗi xóa dữ liệu xuất kho: ${soErr.message}`);

      // Soft delete phieu header
      const { error } = await supabase
        .from('xasa_gop_phieu')
        .update({ status: 'Đã xóa' })
        .eq('id', phieu.id);
      if (error) throw error;

      if (addToast)
        addToast('✅ Đã chuyển phiếu ' + phieu.ma_phieu + ' vào thùng rác thành công', 'success');
      setShowDetailPhieu(false);
      fetchHistory();
    } catch (err: any) {
      if (addToast)
        addToast('🗑️ Lỗi xóa: ' + (err.message || 'Không thể chuyển vào thùng rác'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    // Map legacy keys if they exist
    const s =
      status === 'cho_duyet'
        ? 'Chờ duyệt'
        : status === 'da_duyet'
          ? 'Đã duyệt'
          : status === 'da_huy'
            ? 'Từ chối'
            : status;

    switch (s) {
      case 'Chờ duyệt':
        return { label: 'Chờ duyệt', bg: 'bg-yellow-50', text: 'text-yellow-600' };
      case 'Đã duyệt':
        return { label: 'Đã duyệt', bg: 'bg-green-50', text: 'text-green-600' };
      case 'Từ chối':
        return { label: 'Từ chối', bg: 'bg-red-50', text: 'text-red-600' };
      case 'Đã xóa':
        return { label: 'Đã xóa', bg: 'bg-gray-50', text: 'text-gray-400' };
      default:
        return { label: s || 'Chờ duyệt', bg: 'bg-gray-50', text: 'text-gray-600' };
    }
  };

  const materialOptions = materials.map((m) => ({
    id: m.id,
    name: `${m.name}${m.code ? ` (${m.code})` : ''}`,
  }));
  const warehouseOptions = warehouses.map((w) => ({ id: w.id, name: w.name }));

  const filteredHistory = history
    .filter((h) => {
      if (h.status === 'Đã xóa') return false;
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (h.ma_phieu || '').toLowerCase().includes(s);
    })
    .sort((a, b) => {
      if (sortBy === 'newest')
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'code') return (a.ma_phieu || '').localeCompare(b.ma_phieu || '');
      return 0;
    });

  const handleExportExcel = () => {
    import('@/utils/excelExport').then(({ exportToExcel }) => {
      exportToExcel({
        title: 'Tách ghép Vật tư',
        sheetName: 'Tách ghép',
        columns: [
          'Mã phiếu',
          'Loại',
          'Ngày',
          'Kho',
          'Vật tư gốc',
          'Vật tư mới',
          'Số lượng',
          'Ghi chú',
        ],
        rows: history.map((s) => {
          const chiTiet = s.xasa_gop_chi_tiet || [];
          const nguon = chiTiet
            .filter((d: any) => d.vai_tro === 'nguon')
            .map((d: any) => d.materials?.name || '')
            .join(', ');
          const ra = chiTiet
            .filter((d: any) => d.vai_tro === 'ra')
            .map((d: any) => d.materials?.name || '')
            .join(', ');
          const tongSL = chiTiet.reduce((sum: number, d: any) => sum + Number(d.so_luong || 0), 0);
          return [
            s.ma_phieu ?? '',
            s.loai === 'xa' ? 'Xả' : 'Gộp',
            formatDate(s.ngay) ?? '',
            s.warehouses?.name ?? '',
            nguon,
            ra,
            tongSL,
            s.ghi_chu ?? '',
          ];
        }),
        fileName: `CDX_TachGhep_${new Date().toISOString().slice(0, 10)}.xlsx`,
        addToast,
      });
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between gap-2 mb-4">
        <PageBreadcrumb title="Xả / Gộp vật tư" onBack={onBack} />
        <div className="flex items-center gap-1.5 justify-end flex-1 flex-shrink-0">
          <SaveImageButton
            onClick={() => {
              if (reportRef.current) {
                exportTableImage({
                  element: reportRef.current,
                  fileName: `Xa_Gop_Vat_Tu_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.png`,
                  addToast,
                  onStart: () => setIsCapturingTable(true),
                  onEnd: () => setIsCapturingTable(false),
                });
              }
            }}
            isCapturing={isCapturingTable}
            title="Lưu ảnh báo cáo"
          />
          <ExcelButton onClick={handleExportExcel} size="icon" />
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_splitMerge_${user.id}`, val);
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'code', label: 'Mã phiếu' },
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

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => openModal('xa')}
          className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-all flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Scissors size={20} className="text-orange-600" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-800">Xả vật tư</h3>
            <p className="text-[10px] text-gray-400">1 nguồn → N mảnh</p>
          </div>
        </button>
        <button
          onClick={() => openModal('gop')}
          className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-all flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Merge size={20} className="text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-800">Gộp vật tư</h3>
            <p className="text-[10px] text-gray-400">N mảnh → 1 vật tư</p>
          </div>
        </button>
      </div>

      {/* History */}
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
                placeholder="Tìm mã phiếu..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {loadingHistory ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm">Đang tải...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            <Package size={48} className="mb-3 text-gray-300" />
            <p className="font-medium">Chưa có phiếu nào</p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const nguonItems = (item.xasa_gop_chi_tiet || []).filter(
              (d: any) => d.vai_tro === 'nguon',
            );
            const raItems = (item.xasa_gop_chi_tiet || []).filter((d: any) => d.vai_tro === 'ra');

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedPhieu(item);
                  setShowDetailPhieu(true);
                }}
                className="bg-white rounded-xl py-1.5 px-3 border border-gray-100 shadow-sm transition-all hover:shadow-md cursor-pointer group active:scale-[0.99] flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.loai === 'xa' ? 'bg-orange-50' : 'bg-blue-50'}`}
                    >
                      {item.loai === 'xa' ? (
                        <Scissors size={14} className="text-orange-500" />
                      ) : (
                        <Merge size={14} className="text-blue-500" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 no-wrap overflow-hidden">
                      <h4 className="font-bold text-gray-800 text-[11px] truncate shrink min-w-0">
                        {nguonItems
                          .map(
                            (n: any) =>
                              `${n.materials?.name || '...'}${n.so_luong ? ` (${formatNumber(n.so_luong)}${n.don_vi ? ' ' + n.don_vi : ''})` : ''}`,
                          )
                          .join(', ')}
                        <ArrowRight size={10} className="inline mx-1 text-gray-400" />
                        {raItems
                          .map(
                            (r: any) =>
                              `${r.materials?.name || '...'}${r.so_luong ? ` (${formatNumber(r.so_luong)}${r.don_vi ? ' ' + r.don_vi : ''})` : ''}`,
                          )
                          .join(', ')}
                      </h4>
                      <span className="text-[7px] font-normal text-gray-200 shrink-0">
                        {item.ma_phieu.split('-')[1] || item.ma_phieu}
                      </span>
                      {(() => {
                        const badge = getStatusBadge(item.status);
                        return (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[8px] text-gray-400/40 font-medium truncate">
                      {formatDate(item.ngay)} • {item.warehouses?.name} • {item.users?.full_name}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-1 py-0.5 rounded text-[7px] font-black shrink-0 ${item.loai === 'xa' ? 'text-orange-400 border border-orange-100' : 'text-blue-400 border border-blue-100'}`}
                >
                  {item.loai === 'xa' ? 'Xả' : 'Gộp'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={`p-6 text-white flex items-center justify-between flex-shrink-0 ${mode === 'xa' ? 'bg-orange-500' : 'bg-blue-500'}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 hover:bg-white/20 rounded-full"
                  >
                    <X size={20} />
                  </button>
                  <div>
                    <h3 className="font-bold text-lg">
                      {isEditing
                        ? `Sửa phiếu ${editingPhieu?.ma_phieu}`
                        : mode === 'xa'
                          ? 'Xả vật tư'
                          : 'Gộp vật tư'}
                    </h3>
                    <p className="text-xs text-white/70">
                      {mode === 'xa' ? '1 vật tư nguồn → Nhiều mảnh' : 'Nhiều mảnh → 1 vật tư mới'}
                    </p>
                  </div>
                </div>
              </div>
              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Kho */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                    Chọn kho thực hiện *
                  </label>
                  <CreatableSelect
                    value={kho_id}
                    options={warehouseOptions}
                    onChange={(val) => setKhoId(val)}
                    allowCreate={false}
                    placeholder="Chọn kho..."
                  />
                </div>

                {mode === 'xa' ? (
                  <>
                    {/* Nguồn xả */}
                    <div className="bg-orange-50/50 rounded-3xl p-5 border border-orange-100 shadow-sm relative">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-xs font-black text-orange-700 uppercase tracking-widest flex items-center gap-2">
                            <Package size={14} /> Vật tư nguồn
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickAddTarget({ type: 'nguonXa' });
                              setShowAddMaterial(true);
                            }}
                            className="text-[10px] font-bold text-orange-600 hover:underline text-left"
                          >
                            + Thêm vật tư nhanh
                          </button>
                        </div>
                      </div>
                      <CreatableSelect
                        value={nguonXa.material_id}
                        options={materialOptions}
                        onChange={(val) => {
                          handleSelectNguonXa(val);
                        }}
                        allowCreate={false}
                        placeholder="Chọn vật tư cần xả..."
                      />
                      {nguonXa.material_id && (
                        <div className="mt-4 flex flex-col gap-4">
                          <div className="w-full">
                            <NumericInput
                              label=""
                              value={nguonXa.so_luong}
                              onChange={(val) => setNguonXa({ ...nguonXa, so_luong: val })}
                            />
                          </div>
                          <div className="w-full">
                            <input
                              type="text"
                              value={nguonXa.don_vi}
                              onChange={(e) => setNguonXa({ ...nguonXa, don_vi: e.target.value })}
                              placeholder="Đơn vị tính..."
                              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm bg-white font-bold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                          </div>
                          {kho_id && (
                            <div className="col-span-12 flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                Tồn kho hiện tại:
                              </span>
                              <div className="px-3 py-1 bg-white border border-gray-100 rounded-full shadow-sm">
                                <span className="text-xs font-black text-orange-600">
                                  {formatNumber(nguonXa.ton_kho)}{' '}
                                  <span className="text-[10px] text-gray-400 font-bold tracking-tight">
                                    {nguonXa.don_vi || 'đang tải...'}
                                  </span>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Output xả */}
                    <div className="bg-gray-50/50 rounded-3xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                            ✂️ Mảnh ra ({outputXa.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickAddTarget({
                                type: 'outputXa',
                                index: outputXa.length,
                              });
                              addOutputXa();
                              setShowAddMaterial(true);
                            }}
                            className="text-[10px] font-bold text-orange-600 hover:underline text-left"
                          >
                            + Thêm vật tư nhanh
                          </button>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Plus}
                          onClick={addOutputXa}
                          className="rounded-lg text-[10px] h-8 px-3 whitespace-nowrap font-bold shrink-0 self-start sm:self-auto"
                        >
                          THÊM DÒNG
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {outputXa.map((o, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-3 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                          >
                            <div className="w-full">
                              <CreatableSelect
                                value={o.material_id}
                                options={materialOptions}
                                onChange={(val) => {
                                  const mat = materials.find((m) => m.id === val);
                                  const updated = [...outputXa];
                                  updated[idx] = {
                                    ...updated[idx],
                                    material_id: val,
                                    material_name: mat?.name || '',
                                    don_vi: mat?.unit || '',
                                  };
                                  setOutputXa(updated);
                                }}
                                allowCreate={false}
                                placeholder="Chọn vật tư..."
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <NumericInput
                                  label=""
                                  value={o.so_luong}
                                  onChange={(val) => {
                                    const updated = [...outputXa];
                                    updated[idx] = { ...updated[idx], so_luong: val };
                                    setOutputXa(updated);
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => setOutputXa(outputXa.filter((_, i) => i !== idx))}
                                className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors shrink-0 border border-red-50 shadow-sm"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Nguồn gộp */}
                    <div className="bg-blue-50/50 rounded-3xl p-5 border border-blue-100 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                            📦 Vật tư nguồn ({nguonGop.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickAddTarget({
                                type: 'nguonGop',
                                index: nguonGop.length,
                              });
                              addNguonGop();
                              setShowAddMaterial(true);
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:underline text-left"
                          >
                            + Thêm vật tư nhanh
                          </button>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Plus}
                          onClick={addNguonGop}
                          className="rounded-lg text-[10px] h-8 px-3 whitespace-nowrap font-bold shrink-0 self-start sm:self-auto"
                        >
                          THÊM DÒNG
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {nguonGop.map((n, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-3 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                          >
                            <div className="w-full">
                              <CreatableSelect
                                value={n.material_id}
                                options={materialOptions}
                                onChange={(val) => {
                                  const mat = materials.find((m) => m.id === val);
                                  const updated = [...nguonGop];
                                  updated[idx] = {
                                    ...updated[idx],
                                    material_id: val,
                                    material_name: mat?.name || '',
                                    don_vi: mat?.unit || '',
                                  };
                                  setNguonGop(updated);
                                }}
                                allowCreate={false}
                                placeholder="Chọn vật tư..."
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <NumericInput
                                  label=""
                                  value={n.so_luong}
                                  onChange={(val) => {
                                    const updated = [...nguonGop];
                                    updated[idx] = { ...updated[idx], so_luong: val };
                                    setNguonGop(updated);
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => setNguonGop(nguonGop.filter((_, i) => i !== idx))}
                                className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors shrink-0 border border-red-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Output gộp */}
                    <div className="bg-blue-50/50 rounded-3xl p-5 border border-blue-100 shadow-sm relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
                      <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                          <div className="flex flex-col gap-1">
                            <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                              🔗 Vật tư gộp ra
                            </h4>
                            <button
                              type="button"
                              onClick={() => setShowAddMaterial(true)}
                              className="text-[10px] font-bold text-blue-600 hover:underline text-left"
                            >
                              + Thêm vật tư nhanh
                            </button>
                          </div>
                        </div>
                        <CreatableSelect
                          value={outputGop.material_id}
                          options={materialOptions}
                          onChange={(val) => {
                            const mat = materials.find((m) => m.id === val);
                            setOutputGop({
                              ...outputGop,
                              material_id: val,
                              material_name: mat?.name || '',
                              don_vi: mat?.unit || '',
                            });
                          }}
                          allowCreate={false}
                          placeholder="Chọn vật tư đầu ra..."
                        />
                        {outputGop.material_id && (
                          <div className="mt-4 flex flex-col gap-4">
                            <div className="w-full">
                              <NumericInput
                                label=""
                                value={outputGop.so_luong}
                                onChange={(val) => setOutputGop({ ...outputGop, so_luong: val })}
                              />
                            </div>
                            <div className="w-full">
                              <input
                                type="text"
                                value={outputGop.don_vi}
                                onChange={(e) =>
                                  setOutputGop({ ...outputGop, don_vi: e.target.value })
                                }
                                placeholder="Đơn vị tính..."
                                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm bg-white font-bold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Ghi chú */}
                <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100 shadow-inner">
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 tracking-widest ml-1">
                    📖 Ghi chú & Diễn giải
                  </label>
                  <textarea
                    rows={2}
                    value={ghi_chu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    placeholder="Nhập ghi chú chi tiết nếu có..."
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/30 rounded-b-[2.5rem] flex-shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-gray-100 uppercase"
                >
                  HUỶ BỎ
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`px-6 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-md transform transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 uppercase ${
                    mode === 'xa'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/10'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/10'
                  }`}
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      XỬ LÝ...
                    </div>
                  ) : (
                    'XÁC NHẬN PHIẾU'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailPhieu && selectedPhieu && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDetailPhieu(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`p-6 text-white flex items-center justify-between flex-shrink-0 bg-gradient-to-r ${selectedPhieu.loai === 'xa' ? 'from-orange-500 to-orange-600' : 'from-blue-500 to-blue-600'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
                    {selectedPhieu.loai === 'xa' ? <Scissors size={24} /> : <Merge size={24} />}
                  </div>
                  <div>
                    <h2 className="font-extrabold text-xl uppercase tracking-wider">
                      Chi tiết phiếu
                    </h2>
                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest mt-0.5">
                      Mã: {selectedPhieu.ma_phieu} •{' '}
                      {selectedPhieu.loai === 'xa' ? 'Xả vật tư' : 'Gộp vật tư'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailPhieu(false)}
                  className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Meta info */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-6 rounded-3xl border border-gray-100 shadow-inner">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Ngày thực hiện
                    </p>
                    <p className="text-sm font-extrabold text-gray-800">
                      {formatDate(selectedPhieu.ngay)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Kho xử lý
                    </p>
                    <p className="text-sm font-extrabold text-gray-800">
                      {selectedPhieu.warehouses?.name}
                    </p>
                  </div>
                  <div className="space-y-1 mt-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Người tạo
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-bold text-primary">
                        {selectedPhieu.users?.full_name?.charAt(0)}
                      </div>
                      <p className="text-sm font-extrabold text-gray-800">
                        {selectedPhieu.users?.full_name}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Trạng thái
                    </p>
                    <div
                      className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${getStatusBadge(selectedPhieu.status).bg} ${getStatusBadge(selectedPhieu.status).text} border border-current opacity-80`}
                    >
                      {getStatusBadge(selectedPhieu.status).label}
                    </div>
                  </div>
                </div>

                {/* Groups */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 ml-1">
                      📦 Vật tư nguồn
                    </h4>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-blue-100/50">
                          <tr>
                            <th className="px-4 py-2 font-bold text-blue-800">Tên vật tư</th>
                            <th className="px-4 py-2 font-bold text-blue-800 text-center">
                              Số lượng
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                          {(selectedPhieu.xasa_gop_chi_tiet || [])
                            .filter((d: any) => d.vai_tro === 'nguon')
                            .map((d: any, i: number) => (
                              <tr key={i}>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-gray-800">{d.materials?.name}</p>
                                  <p className="text-[10px] text-gray-400">{d.materials?.code}</p>
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-blue-700">
                                  {formatNumber(d.so_luong)} {d.don_vi}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 ml-1">
                      {selectedPhieu.loai === 'xa' ? '✂️ Mảnh xả ra' : '🔗 Vật tư gộp lại'}
                    </h4>
                    <div className="bg-green-50/50 border border-green-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-green-100/50">
                          <tr>
                            <th className="px-4 py-2 font-bold text-green-800">Tên vật tư</th>
                            <th className="px-4 py-2 font-bold text-green-800 text-center">
                              Số lượng
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-green-100">
                          {(selectedPhieu.xasa_gop_chi_tiet || [])
                            .filter((d: any) => d.vai_tro === 'ra')
                            .map((d: any, i: number) => (
                              <tr key={i}>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-gray-800">{d.materials?.name}</p>
                                  <p className="text-[10px] text-gray-400">{d.materials?.code}</p>
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-green-700">
                                  {formatNumber(d.so_luong)} {d.don_vi}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {selectedPhieu.ghi_chu && (
                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100 shadow-inner">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 ml-1">
                      📖 Ghi chú & Diễn giải
                    </p>
                    <p className="text-sm text-gray-600 font-medium italic leading-relaxed">
                      “{selectedPhieu.ghi_chu}”
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50 flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-lg text-red-500 border-red-50 hover:bg-red-50 text-[10px] font-bold uppercase h-8"
                    icon={Trash2}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhieu(selectedPhieu);
                    }}
                    isLoading={submitting}
                  >
                    Xóa phiếu
                  </Button>
                  {(selectedPhieu.status === 'Chờ duyệt' ||
                    selectedPhieu.status === 'Từ chối' ||
                    selectedPhieu.status === 'Đã duyệt') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg text-[10px] font-bold uppercase h-8"
                      icon={Edit}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPhieu(selectedPhieu);
                      }}
                      isLoading={submitting}
                    >
                      Sửa
                    </Button>
                  )}
                </div>

                {selectedPhieu.status === 'Chờ duyệt' &&
                  (user.role === 'Admin' || user.role === 'Develop') && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1 rounded-lg text-[10px] font-bold uppercase shadow-sm h-8"
                        icon={X}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectPhieu(selectedPhieu);
                          setShowDetailPhieu(false);
                        }}
                        isLoading={submitting}
                      >
                        Từ chối
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        className="flex-1 rounded-lg text-[10px] font-bold uppercase shadow-sm h-8"
                        icon={Package}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprovePhieu(selectedPhieu);
                          setShowDetailPhieu(false);
                        }}
                        isLoading={submitting}
                      >
                        Duyệt phiếu
                      </Button>
                    </div>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <QuickAddMaterialModal
        show={showAddMaterial}
        onClose={() => {
          setShowAddMaterial(false);
          setQuickAddTarget(null);
          setInitialMaterialName('');
        }}
        initialName={initialMaterialName}
        onSuccess={(newMat) => {
          if (quickAddTarget) {
            const { type, index } = quickAddTarget;
            if (type === 'nguonXa') {
              setNguonXa((prev) => ({
                ...prev,
                material_id: newMat.id,
                material_name: newMat.name,
                don_vi: newMat.unit,
              }));
              // Fetch ton kho after setting material
              if (kho_id) {
                getAvailableStock(newMat.id, kho_id, new Date().toISOString().split('T')[0]).then(
                  (tk) => {
                    setNguonXa((p) => ({ ...p, ton_kho: tk }));
                  },
                );
              }
            } else if (type === 'outputXa' && typeof index === 'number') {
              const updated = [...outputXa];
              updated[index] = {
                ...updated[index],
                material_id: newMat.id,
                material_name: newMat.name,
                don_vi: newMat.unit,
              };
              setOutputXa(updated);
            } else if (type === 'nguonGop' && typeof index === 'number') {
              const updated = [...nguonGop];
              updated[index] = {
                ...updated[index],
                material_id: newMat.id,
                material_name: newMat.name,
                don_vi: newMat.unit,
              };
              setNguonGop(updated);
            } else if (type === 'outputGop') {
              setOutputGop((prev) => ({
                ...prev,
                material_id: newMat.id,
                material_name: newMat.name,
                don_vi: newMat.unit,
              }));
            }
          }

          refreshAll();
          setShowAddMaterial(false);
          setQuickAddTarget(null);
          setInitialMaterialName('');
          if (addToast) addToast(`Đã thêm và chọn vật tư mới: ${newMat.name}`, 'success');
        }}
        groups={groups}
        warehouses={warehouses}
        color={mode === 'xa' ? 'orange' : 'blue'}
        addToast={addToast}
      />

      {/* FAB — Thêm phiếu mới */}
      <FAB onClick={() => openModal('xa')} label="Tạo phiếu mới" />

      {/* Hidden Ref for Report Capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={reportRef} className="p-8 bg-white" style={{ width: '1000px' }}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                <Scissors size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">
                  NHẬT KÝ XẢ / GỘP VẬT TƯ
                </h1>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">
                  Hệ thống CDX-2026 • {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                Xác nhận bởi
              </p>
              <p className="text-xs font-bold text-gray-800 uppercase bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 italic">
                {user.full_name}
              </p>
            </div>
          </div>

          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                  Mã phiếu
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Loại</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                  Chi tiết (Nguồn → Ra)
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => {
                const nguonItems =
                  item.xasa_gop_chi_tiet?.filter((c: any) => c.vai_tro === 'nguon') || [];
                const raItems =
                  item.xasa_gop_chi_tiet?.filter((c: any) => c.vai_tro === 'ra') || [];
                return (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="px-4 py-3.5 text-xs font-black text-primary uppercase">
                      {item.ma_phieu}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold uppercase">
                      <span className={item.loai === 'xa' ? 'text-orange-500' : 'text-blue-500'}>
                        {item.loai === 'xa' ? 'Xả' : 'Gộp'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-gray-600">
                      {formatDate(item.ngay)}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-gray-500">
                      {item.warehouses?.name}
                    </td>
                    <td className="px-4 py-3.5 text-[10px] font-bold text-gray-800">
                      {nguonItems.map((n: any) => n.materials?.name).join(', ')} →{' '}
                      {raItems.map((r: any) => r.materials?.name).join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-end">
            <div className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
              Ngày xuất: {new Date().toLocaleDateString('vi-VN')} •{' '}
              {new Date().toLocaleTimeString('vi-VN')}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-[10px] font-black text-gray-300 uppercase italic">
                CDX ERP SYSTEM
              </span>
              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
              <span className="text-[10px] font-bold text-gray-300 uppercase">
                Operational Excellence
              </span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        show={showRejectConfirm}
        onCancel={() => setShowRejectConfirm(false)}
        onConfirm={confirmRejectPhieu}
        title="Từ chối & xóa phiếu"
        message={`Xác nhận từ chối và xóa phiếu ${phieuToReject?.ma_phieu}? Hành động này sẽ hủy các phiếu nhập/xuất liên quan.`}
        confirmText="Từ chối"
        cancelText="Hủy"
      />

      <ConfirmModal
        show={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeletePhieu}
        title="Xóa phiếu"
        message={`Chuyển phiếu ${phieuToDelete?.ma_phieu} vào thùng rác? Các bản ghi nhập/xuất kho liên quan cũng sẽ bị xóa.`}
        confirmText="Xóa"
        cancelText="Hủy"
      />

      <ConfirmModal
        show={showEditApprovedConfirm}
        onCancel={() => {
          setShowEditApprovedConfirm(false);
          setPendingPhieuToEdit(null);
        }}
        onConfirm={() => {
          setShowEditApprovedConfirm(false);
          if (pendingPhieuToEdit) {
            startEditFlow(pendingPhieuToEdit);
            setPendingPhieuToEdit(null);
          }
        }}
        title="Sửa phiếu đã duyệt"
        message={`Phiếu ${pendingPhieuToEdit?.ma_phieu} đã được duyệt. Việc sửa đổi sẽ thu hồi trạng thái Duyệt và cần được duyệt lại. Bạn có chắc chắn muốn sửa không?`}
        confirmText="Đồng ý sửa"
        cancelText="Bỏ qua"
        type="warning"
      />

      <ConfirmModal
        show={showMismatchConfirm}
        onCancel={() => {
          setShowMismatchConfirm(false);
          setMismatchData(null);
        }}
        onConfirm={() => {
          setShowMismatchConfirm(false);
          handleSubmit();
        }}
        title="Xác nhận chênh lệch số lượng"
        message={
          <div className="space-y-4 text-left">
            <p className="text-sm font-medium text-gray-700">
              Có sự chênh lệch số lượng giữa vật tư nguồn và đầu ra:
            </p>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Tổng đầu vào (Nguồn):</span>
                <span className="font-bold text-gray-900">
                  {formatNumber(mismatchData?.totalIn)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Tổng đầu ra (Sản phẩm):</span>
                <span className="font-bold text-gray-900">
                  {formatNumber(mismatchData?.totalOut)}
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-amber-200 flex justify-between text-sm">
                <span className="font-bold text-amber-800 uppercase italic">
                  Chênh lệch (Hao hụt):
                </span>
                <span className="font-black text-red-600">
                  {formatNumber(
                    Math.abs((mismatchData?.totalIn || 0) - (mismatchData?.totalOut || 0)),
                  )}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed italic">
              Việc lưu phiếu đồng nghĩa với việc bạn xác nhận số lượng hao hụt này là hợp lệ trong
              quá trình sản xuất.
            </p>
          </div>
        }
        confirmText="Xác nhận hao hụt & Lưu"
        cancelText="Kiểm tra lại"
        type="warning"
      />
    </div>
  );
};
