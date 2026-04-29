import { useState, useEffect, useRef } from 'react';
import { Plus, X, Hammer, ChevronDown, ChevronUp, Trash2, PackagePlus, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { ToastType } from '@/components/shared';
import { PageBreadcrumb } from '@/components/shared';
import { FAB } from '@/components/shared';
import { ConfirmModal } from '@/components/shared';
import { NumericInput } from '@/components/shared';
import { CreatableSelect } from '@/components/shared';
import { QuickAddMaterialModal } from '@/components/shared';
import { PageToolbar, FilterPanel, FilterSearchInput } from '@/components/shared';
import { ReportImagePreviewModal } from '@/components/shared';
import { formatNumber } from '@/utils/format';
import { tonKho } from '@/utils/inventory';

// ============================
// Sản xuất Cọc
// ============================
export const SanXuatCoc = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [boms, setBoms] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialGroups, setMaterialGroups] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddInitialName, setQuickAddInitialName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedOuts, setExpandedOuts] = useState<any[]>([]);
  const [loadingOuts, setLoadingOuts] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tất cả');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  // Form state
  const [cocMaterialId, setCocMaterialId] = useState('');
  const [bomId, setBomId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [cocWarehouseId, setCocWarehouseId] = useState('');
  const [rawWarehouseId, setRawWarehouseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [cocUnitPrice, setCocUnitPrice] = useState<number>(0);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (showModal || !!recordToDelete || !!previewImageUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [showModal, recordToDelete, previewImageUrl]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bomsRes, matsRes, warehousesRes, recordsRes, groupsRes] = await Promise.all([
        supabase
          .from('san_pham_bom')
          .select('*, san_pham_bom_chi_tiet(*, materials(name, code, unit))')
          .eq('dang_hoat_dong', true)
          .order('ten_san_pham'),
        supabase
          .from('materials')
          .select('id, name, code, unit')
          .or('status.is.null,status.neq.Đã xóa')
          .order('name'),
        supabase.from('warehouses').select('id, name').order('name'),
        supabase
          .from('stock_in')
          .select('*, materials(name, code, unit), warehouses(name)')
          .ilike('import_code', 'SX-%')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('material_groups').select('id, name').order('name'),
      ]);
      if (bomsRes.data) setBoms(bomsRes.data);
      if (matsRes.data) setMaterials(matsRes.data);
      if (warehousesRes.data) setWarehouses(warehousesRes.data);
      if (recordsRes.data) setRecords(recordsRes.data);
      if (groupsRes.data) setMaterialGroups(groupsRes.data);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async (): Promise<string> => {
    const datePart = date.replace(/-/g, '');
    const { count } = await supabase
      .from('stock_in')
      .select('id', { count: 'exact', head: true })
      .ilike('import_code', `SX-${datePart}-%`);
    return `SX-${datePart}-${(count || 0) + 1}`;
  };

  const handleSubmit = async () => {
    if (!cocMaterialId) return addToast?.('Vui lòng chọn loại cọc', 'error');
    if (!bomId) return addToast?.('Vui lòng chọn định mức', 'error');
    if (!quantity || quantity <= 0) return addToast?.('Vui lòng nhập số lượng sản xuất', 'error');
    if (!cocWarehouseId) return addToast?.('Vui lòng chọn kho nhập cọc', 'error');
    if (!rawWarehouseId) return addToast?.('Vui lòng chọn kho xuất vật liệu', 'error');

    const selectedBom = boms.find((b) => b.id === bomId);
    if (!selectedBom) return addToast?.('Không tìm thấy định mức', 'error');

    const bomItems = selectedBom.san_pham_bom_chi_tiet || [];
    if (bomItems.length === 0) return addToast?.('Định mức không có vật tư nào', 'error');

    setSubmitting(true);
    try {
      // Kiểm tra tồn kho cho từng NVL trong định mức (Logic thực tế)
      const startDate = '2020-01-01';
      const endDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const shortfalls: string[] = [];

      // Nếu đang sửa và lệnh hiện tại đã duyệt, ta "hoàn lại" NVL đang dùng vào tồn kho để tính toán
      // (Bởi vì nếu lưu thành công, phiếu cũ sẽ bị hủy/thay thế bằng phiếu chờ duyệt)
      const currentApprovedOuts =
        isEditing && selectedRecord?.status === 'Đã duyệt'
          ? await (async () => {
              const { data } = await supabase
                .from('stock_out')
                .select('material_id, quantity')
                .ilike('export_code', `${selectedRecord.import_code}-%`)
                .eq('status', 'Đã duyệt');
              return data || [];
            })()
          : [];

      await Promise.all(
        bomItems.map(async (item: any) => {
          const needed = item.dinh_muc * quantity;
          let available = await tonKho(item.material_id, rawWarehouseId, startDate, endDate);

          // Cộng lại phần vật tư của chính lệnh này nếu nó đang ở trạng thái Đã duyệt
          const currentlyUsed = currentApprovedOuts
            .filter((out) => out.material_id === item.material_id)
            .reduce((sum, out) => sum + out.quantity, 0);

          available += currentlyUsed;

          if (available < needed) {
            const matName = item.materials?.name || item.material_name || item.material_id;
            shortfalls.push(
              `${matName}: cần ${formatNumber(needed)} ${item.don_vi}, tồn ${formatNumber(available)}`,
            );
          }
        }),
      );
      if (shortfalls.length > 0) {
        addToast?.(`Không đủ NVL:\n${shortfalls.join('\n')}`, 'error');
        setSubmitting(false);
        return;
      }

      const code = isEditing ? selectedRecord.import_code : await generateCode();
      const cocMat = materials.find((m) => m.id === cocMaterialId);

      // 1. Cập nhật/Thêm Phiếu nhập kho: cọc thành phẩm
      const stockInData = {
        import_code: code,
        date,
        material_id: cocMaterialId,
        warehouse_id: cocWarehouseId,
        quantity,
        unit: cocMat?.unit || 'Cái',
        unit_price: cocUnitPrice,
        total_amount: quantity * cocUnitPrice,
        employee_id: user.id,
        notes: notes || `Sản xuất cọc - ${selectedBom.ten_san_pham}`,
        status: 'Chờ duyệt',
      };

      if (isEditing) {
        const { error } = await supabase
          .from('stock_in')
          .update(stockInData)
          .eq('id', selectedRecord.id);
        if (error) throw error;

        // Xóa các phiếu xuất cũ để thay bằng phiếu mới (Đảm bảo đồng bộ BOM/Số lượng)
        await supabase.from('stock_out').delete().ilike('export_code', `${code}-%`);
      } else {
        const { error } = await supabase.from('stock_in').insert([stockInData]);
        if (error) throw error;
      }

      // 2. Phiếu xuất kho: nguyên vật liệu từ định mức
      const stockOuts = bomItems.map((item: any, idx: number) => ({
        export_code: `${code}-${idx + 1}`,
        date,
        material_id: item.material_id,
        warehouse_id: rawWarehouseId,
        quantity: item.dinh_muc * quantity,
        unit: item.don_vi || item.materials?.unit || 'Cái',
        unit_price: 0,
        total_amount: 0,
        employee_id: user.id,
        notes: `Xuất NVL cho SX cọc - ${selectedBom.ten_san_pham} - Phiếu: ${code}`,
        status: 'Chờ duyệt',
      }));
      const { error: stockOutErr } = await supabase.from('stock_out').insert(stockOuts);
      if (stockOutErr) throw stockOutErr;

      addToast?.(
        `${isEditing ? 'Đã cập nhật' : 'Đã tạo'} lệnh sản xuất ${code} thành công! (Chờ duyệt lại)`,
        'success',
      );
      setShowModal(false);
      resetForm();
      fetchAll();
    } catch (err: any) {
      addToast?.('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      const code = recordToDelete.import_code;
      // Delete stock_in
      await supabase.from('stock_in').update({ status: 'Đã xóa' }).eq('import_code', code);
      // Delete related stock_outs
      await supabase
        .from('stock_out')
        .update({ status: 'Đã xóa' })
        .ilike('export_code', `${code}-%`);
      addToast?.('Đã xóa lệnh sản xuất', 'success');
      setRecordToDelete(null);
      fetchAll();
    } catch (err: any) {
      addToast?.('Lỗi: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (rec: any) => {
    setLoading(true);
    try {
      const { error: inErr } = await supabase
        .from('stock_in')
        .update({ status: 'Chờ duyệt' })
        .eq('id', rec.id);
      if (inErr) throw inErr;

      const { error: outErr } = await supabase
        .from('stock_out')
        .update({ status: 'Chờ duyệt' })
        .ilike('export_code', `${rec.import_code}-%`);
      if (outErr) throw outErr;

      addToast?.(`Đã khôi phục lệnh ${rec.import_code} (Trạng thái: Chờ duyệt)`, 'success');
      fetchAll();
    } catch (err: any) {
      addToast?.('Lỗi khôi phục: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (rec: any) => {
    setLoading(true);
    try {
      // Tìm định mức - dựa trên tên sản phẩm (rec.materials?.name là tên cọc)
      // Logic link BOM của dự án này thường là dùng bomId, ta lấy từ DB
      // Nhưng stock_in không lưu bomId, ta phải mò trong stock_out để xem ghi chú hoặc logic khác
      // Hoặc đơn giản là để người dùng chọn lại định mức nếu không khớp
      setIsEditing(true);
      setSelectedRecord(rec);
      setCocMaterialId(rec.material_id);
      setQuantity(rec.quantity);
      setCocWarehouseId(rec.warehouse_id);
      setDate(rec.date);
      setNotes(rec.notes || '');
      setCocUnitPrice(rec.unit_price || 0);

      // Lấy kho xuất NVL từ stock_out
      const { data: outs } = await supabase
        .from('stock_out')
        .select('warehouse_id, notes')
        .ilike('export_code', `${rec.import_code}-%`)
        .limit(1);

      if (outs && outs[0]) {
        setRawWarehouseId(outs[0].warehouse_id);
      }

      // Tìm BOM khớp nhất (nếu có ghi chú lưu bomId thì tốt)
      // Hiện tại ta dựa vào tên sản phẩm để highlight BOM gợi ý
      const matchedBom = boms.find((b) => b.ten_san_pham === rec.materials?.name);
      if (matchedBom) setBomId(matchedBom.id);

      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setSelectedRecord(null);
    setCocMaterialId('');
    setBomId('');
    setQuantity(0);
    setCocWarehouseId('');
    setRawWarehouseId('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setCocUnitPrice(0);
  };

  const handleExpand = async (rec: any) => {
    if (expandedId === rec.id) {
      setExpandedId(null);
      setExpandedOuts([]);
      return;
    }
    setExpandedId(rec.id);
    setExpandedOuts([]);
    setLoadingOuts(true);
    const { data } = await supabase
      .from('stock_out')
      .select('*, materials(name, unit)')
      .ilike('export_code', `${rec.import_code}-%`)
      .neq('status', 'Đã xóa')
      .order('export_code');
    setExpandedOuts(data || []);
    setLoadingOuts(false);
  };

  const selectedBomDetail = boms.find((b) => b.id === bomId);

  const filteredRecords = records.filter((r) => {
    if (filterStatus === 'Tất cả') return r.status !== 'Đã xóa';
    if (r.status !== filterStatus) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        (r.import_code || '').toLowerCase().includes(s) ||
        (r.materials?.name || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleExportExcel = () => {
    import('@/utils/excelExport').then(({ exportToExcel }) => {
      exportToExcel({
        title: 'Lệnh Sản Xuất Cọc',
        sheetName: 'SX Cọc',
        columns: [
          'Mã lệnh',
          'Ngày',
          'Loại cọc',
          'Số lượng',
          'ĐVT',
          'Kho nhập',
          'Trạng thái',
          'Ghi chú',
        ],
        rows: filteredRecords.map((r) => [
          r.import_code,
          new Date(r.date).toLocaleDateString('vi-VN'),
          r.materials?.name || '',
          r.quantity,
          r.unit,
          r.warehouses?.name || '',
          r.status,
          r.notes || '',
        ]),
        fileName: `CDX_LenhSanXuatCoc_${new Date().toISOString().split('T')[0]}.xlsx`,
        addToast,
      });
    });
  };

  const statusColor = (status: string) => {
    if (status === 'Đã duyệt') return 'bg-green-100 text-green-700';
    if (status === 'Từ chối') return 'bg-red-100 text-red-600';
    if (status === 'Đã xóa') return 'bg-gray-100 text-gray-600';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Lệnh sản xuất cọc" onBack={onBack} />
        <PageToolbar
          tableRef={tableRef}
          captureOptions={{ reportTitle: 'LỆNH SẢN XUẤT CỌC' }}
          onImageCaptured={setPreviewImageUrl}
          onExportExcel={handleExportExcel}
          showFilter={showFilter}
          onFilterToggle={() => setShowFilter((f) => !f)}
          hideFilterButton={false}
        />
      </div>

      <FilterPanel
        show={showFilter}
        hideTitle={true}
        onReset={() => {
          setSearchTerm('');
          setFilterStatus('Tất cả');
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FilterSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm mã lệnh, loại cọc..."
          />
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            >
              {['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã xóa'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </FilterPanel>

      {loading ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm">Đang tải...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <Hammer size={48} className="mb-3 text-gray-300" />
          <p className="font-medium">
            {records.length === 0 ? 'Chưa có lệnh sản xuất nào' : 'Không tìm thấy kết quả'}
          </p>
          <p className="text-xs mt-1">
            {records.length === 0 ? 'Bấm nút + để tạo lệnh sản xuất mới' : 'Thử thay đổi bộ lọc'}
          </p>
        </div>
      ) : (
        <div className="space-y-3" ref={tableRef}>
          {filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => handleExpand(rec)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Hammer size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">
                      {rec.materials?.name || 'N/A'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(rec.date).toLocaleDateString('vi-VN')} •{' '}
                      {formatNumber(rec.quantity)} {rec.unit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(rec.status)}`}
                  >
                    {rec.status}
                  </span>
                  <div className="flex items-center gap-1 border-l border-gray-100 pl-2">
                    {rec.status === 'Đã xóa' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(rec);
                        }}
                        className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500 transition-colors"
                        title="Khôi phục"
                      >
                        <motion.div whileHover={{ rotate: -45 }}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                          </svg>
                        </motion.div>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(rec);
                          }}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecordToDelete(rec);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  {expandedId === rec.id ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </div>
              </div>
              <AnimatePresence>
                {expandedId === rec.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-50"
                  >
                    <div className="p-4 space-y-3 bg-gray-50/50">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-400">Kho nhập cọc</p>
                          <p className="font-semibold text-gray-700">
                            {rec.warehouses?.name || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Đơn giá</p>
                          <p className="font-semibold text-gray-700">
                            {formatNumber(rec.unit_price)} đ
                          </p>
                        </div>
                        {rec.notes && (
                          <div className="col-span-2">
                            <p className="text-gray-400">Ghi chú</p>
                            <p className="font-semibold text-gray-700">{rec.notes}</p>
                          </div>
                        )}
                      </div>
                      {/* Vật tư xuất theo định mức */}
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                          Vật tư xuất theo định mức
                        </p>
                        {loadingOuts ? (
                          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                            <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                            Đang tải...
                          </div>
                        ) : expandedOuts.length === 0 ? (
                          <p className="text-xs text-gray-400">Không có phiếu xuất liên quan</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="py-2 text-[10px] font-bold text-gray-400 uppercase">
                                    Vật tư
                                  </th>
                                  <th className="py-2 text-[10px] font-bold text-gray-400 uppercase text-right">
                                    Sl xuất
                                  </th>
                                  <th className="py-2 text-[10px] font-bold text-gray-400 uppercase text-right w-12">
                                    Trạng thái
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {expandedOuts.map((out) => (
                                  <tr key={out.id}>
                                    <td className="py-2 text-xs text-gray-700">
                                      {out.materials?.name || out.export_code}
                                    </td>
                                    <td className="py-2 text-xs font-bold text-gray-900 text-right whitespace-nowrap">
                                      {formatNumber(out.quantity)} {out.materials?.unit || out.unit}
                                    </td>
                                    <td className="py-2 text-right">
                                      <span
                                        className={`text-[8px] font-black px-1.5 py-px rounded-full ${statusColor(out.status)} inline-block`}
                                      >
                                        {out.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      <FAB onClick={() => setShowModal(true)} label="Tạo lệnh sản xuất cọc" />

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={`${isEditing ? 'bg-blue-600' : 'bg-primary'} p-5 text-white flex items-center justify-between rounded-t-3xl shrink-0`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    {isEditing ? <Edit size={20} /> : <Plus size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-none">
                      {isEditing ? 'Sửa lệnh sản xuất' : 'Tạo lệnh sản xuất mới'}
                    </h3>
                    <p className="text-[10px] text-white/70 mt-1 uppercase tracking-wider font-medium">
                      {isEditing ? 'Cập nhật thông tin lệnh' : 'Nhập thông tin sản xuất'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Loại cọc */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Loại cọc (thành phẩm) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddInitialName('');
                        setShowQuickAdd(true);
                      }}
                      className="flex items-center gap-1 text-[10px] text-primary font-bold hover:underline"
                    >
                      <PackagePlus size={12} /> Thêm vật tư mới
                    </button>
                  </div>
                  <CreatableSelect
                    value={cocMaterialId}
                    options={materials.map((m) => ({
                      id: m.id,
                      name: `${m.name}${m.code ? ` (${m.code})` : ''}`,
                    }))}
                    onChange={setCocMaterialId}
                    onCreate={(name) => {
                      setQuickAddInitialName(name);
                      setShowQuickAdd(true);
                    }}
                    placeholder="Tìm & chọn loại cọc..."
                    allowCreate={true}
                  />
                </div>

                {/* Định mức */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Định mức áp dụng *
                  </label>
                  <CreatableSelect
                    value={bomId}
                    options={boms.map((b) => ({
                      id: b.id,
                      name: `${b.ten_san_pham}${b.mo_ta ? ` — ${b.mo_ta}` : ''}`,
                    }))}
                    onChange={setBomId}
                    placeholder="Tìm & chọn định mức..."
                    allowCreate={false}
                  />
                  {/* Preview BOM items */}
                  {selectedBomDetail && (
                    <div className="mt-2 bg-primary/5 rounded-xl p-3 space-y-1">
                      <p className="text-[10px] font-bold text-primary uppercase">
                        Vật liệu theo định mức (
                        {(selectedBomDetail.san_pham_bom_chi_tiet || []).length} loại)
                      </p>
                      {(selectedBomDetail.san_pham_bom_chi_tiet || []).map((item: any) => (
                        <div key={item.id} className="flex justify-between text-[11px]">
                          <span className="text-gray-600">{item.materials?.name}</span>
                          <span className="font-bold text-primary">
                            {formatNumber(item.dinh_muc * (quantity || 1))} {item.don_vi}
                          </span>
                        </div>
                      ))}
                      {quantity > 1 && (
                        <p className="text-[10px] text-gray-400 pt-1">
                          * Đã nhân với số lượng sản xuất ({quantity})
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Số lượng */}
                <NumericInput
                  label="Số lượng sản xuất (Sl = A) *"
                  value={quantity}
                  onChange={setQuantity}
                />

                {/* Ngày sản xuất */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Ngày sản xuất
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Kho hàng
                  </p>
                  {/* Kho nhập cọc */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Kho nhập cọc (thành phẩm) *
                    </label>
                    <select
                      value={cocWarehouseId}
                      onChange={(e) => setCocWarehouseId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                    >
                      <option value="">-- Chọn kho --</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kho xuất nguyên liệu */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Kho xuất vật liệu (nguyên liệu thô) *
                    </label>
                    <select
                      value={rawWarehouseId}
                      onChange={(e) => setRawWarehouseId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                    >
                      <option value="">-- Chọn kho --</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Đơn giá cọc */}
                  <NumericInput
                    label="Đơn giá cọc (đ)"
                    value={cocUnitPrice}
                    onChange={setCocUnitPrice}
                  />
                </div>

                {/* Ghi chú */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ghi chú thêm..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                  <p className="font-bold">Hệ thống sẽ tự động tạo:</p>
                  <p>① Phiếu nhập kho: cọc thành phẩm (Chờ duyệt)</p>
                  <p>② Phiếu xuất kho: nguyên vật liệu theo định mức × số lượng (Chờ duyệt)</p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`px-8 py-2.5 rounded-xl text-sm font-bold ${isEditing ? 'bg-blue-600' : 'bg-primary'} text-white shadow-lg disabled:opacity-50 flex items-center gap-2`}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {isEditing ? 'Đang cập nhật...' : 'Đang tạo...'}
                    </>
                  ) : (
                    <>
                      {isEditing ? <Edit size={16} /> : <Plus size={16} />}
                      {isEditing ? 'Lưu chỉnh sửa' : 'Tạo lệnh sản xuất'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <QuickAddMaterialModal
        show={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSuccess={(newMat) => {
          setMaterials((prev) => [...prev, newMat].sort((a, b) => a.name.localeCompare(b.name)));
          setCocMaterialId(newMat.id);
          setShowQuickAdd(false);
        }}
        addToast={addToast}
        groups={materialGroups}
        warehouses={warehouses}
        initialName={quickAddInitialName}
      />

      <ConfirmModal
        show={!!recordToDelete}
        title="Xóa lệnh sản xuất"
        message={`Xóa lệnh sản xuất "${recordToDelete?.import_code}"? Các phiếu nhập/xuất liên quan cũng sẽ bị xóa.`}
        confirmText={deleting ? 'Đang xóa...' : 'Xóa'}
        cancelText="Hủy"
        onConfirm={handleDelete}
        onCancel={() => setRecordToDelete(null)}
        type="danger"
      />

      {previewImageUrl && (
        <ReportImagePreviewModal
          imageDataUrl={previewImageUrl}
          fileName={`CDX_LenhSanXuatCoc_${new Date().toISOString().slice(0, 10)}.png`}
          onClose={() => setPreviewImageUrl(null)}
        />
      )}
    </div>
  );
};
