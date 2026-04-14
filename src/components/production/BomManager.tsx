import { CanvasLogo } from '@/components/shared/ReportExportHeader';
import { exportTableImage } from '../../utils/reportExport';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  ChevronRight,
  Copy,
  Package,
  Layers,
  ClipboardList,
  Image as LucideImageIcon,
  Share2,
} from 'lucide-react';
import { useRef } from 'react';

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
import { ExcelButton } from '../shared/ExcelButton';
import { SortButton, SortOption } from '../shared/SortButton';
import { formatNumber } from '@/utils/format';

// ============================
// Quản lý Định mức Vật tư
// ============================
export const BomManager = ({
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBom, setSelectedBom] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_bom_${user.id}`) as SortOption) || 'newest',
  );
  const [showFilter, setShowFilter] = useState(false);
  const [isCapturingTable, setIsCapturingTable] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    ten_san_pham: '',
    mo_ta: '',
  });
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({
    material_id: '',
    material_name: '',
    dinh_muc: 0,
    don_vi: '',
  });

  useEffect(() => {
    fetchBoms();
    fetchMaterials();
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

  const fetchBoms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('san_pham_bom')
        .select('*, san_pham_bom_chi_tiet(*, materials(name, code, unit))')
        .eq('dang_hoat_dong', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBoms(data || []);
    } catch (err: any) {
      console.error('Error fetching BOMs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    const { data } = await supabase
      .from('materials')
      .select('id, name, code, unit, group_id')
      .or('status.is.null,status.neq.Đã xóa')
      .order('name');
    if (data) setMaterials(data);
  };

  const handleAddNew = () => {
    setFormData({ ten_san_pham: '', mo_ta: '' });
    setBomItems([]);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = (bom: any) => {
    setFormData({
      ten_san_pham: bom.ten_san_pham,
      mo_ta: bom.mo_ta || '',
    });
    setBomItems(
      (bom.san_pham_bom_chi_tiet || []).map((item: any) => ({
        id: item.id,
        material_id: item.material_id,
        material_name: item.materials?.name || '',
        dinh_muc: item.dinh_muc,
        don_vi: item.don_vi,
      })),
    );
    setIsEditing(true);
    setSelectedBom(bom);
    setShowModal(true);
  };

  const handleDuplicate = (bom: any) => {
    setFormData({
      ten_san_pham: `${bom.ten_san_pham} (bản sao)`,
      mo_ta: bom.mo_ta || '',
    });
    setBomItems(
      (bom.san_pham_bom_chi_tiet || []).map((item: any) => ({
        material_id: item.material_id,
        material_name: item.materials?.name || '',
        dinh_muc: item.dinh_muc,
        don_vi: item.don_vi,
      })),
    );
    setIsEditing(false);
    setSelectedBom(null);
    setShowModal(true);
  };

  const handleAddItem = () => {
    setItemForm({ material_id: '', material_name: '', dinh_muc: 0, don_vi: '' });
    setShowItemForm(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.material_id || itemForm.dinh_muc <= 0) {
      if (addToast) addToast('Vui lòng chọn vật tư và nhập định mức', 'error');
      return;
    }
    // Check duplicate material
    if (bomItems.some((i) => i.material_id === itemForm.material_id)) {
      if (addToast) addToast('Vật tư này đã có trong định mức', 'warning');
      return;
    }
    setBomItems([...bomItems, { ...itemForm }]);
    setShowItemForm(false);
  };

  const handleRemoveItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formData.ten_san_pham.trim()) {
      if (addToast) addToast('Vui lòng nhập tên sản phẩm', 'error');
      return;
    }
    if (bomItems.length === 0) {
      if (addToast) addToast('Vui lòng thêm ít nhất 1 vật tư vào định mức', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let bomId: string;

      if (isEditing && selectedBom) {
        // Update BOM header
        const { error } = await supabase
          .from('san_pham_bom')
          .update({
            ten_san_pham: formData.ten_san_pham.trim(),
            mo_ta: formData.mo_ta.trim() || null,
          })
          .eq('id', selectedBom.id);
        if (error) throw error;
        bomId = selectedBom.id;

        // Delete old items
        await supabase.from('san_pham_bom_chi_tiet').delete().eq('bom_id', bomId);
      } else {
        // Insert new BOM header
        const { data, error } = await supabase
          .from('san_pham_bom')
          .insert([
            {
              ten_san_pham: formData.ten_san_pham.trim(),
              mo_ta: formData.mo_ta.trim() || null,
            },
          ])
          .select()
          .single();
        if (error) throw error;
        bomId = data.id;
      }

      // Insert BOM items
      const items = bomItems.map((item) => ({
        bom_id: bomId,
        material_id: item.material_id,
        dinh_muc: item.dinh_muc,
        don_vi: item.don_vi,
      }));
      const { error: itemsError } = await supabase.from('san_pham_bom_chi_tiet').insert(items);
      if (itemsError) throw itemsError;

      if (addToast)
        addToast(
          isEditing ? 'Cập nhật định mức thành công!' : 'Tạo định mức thành công!',
          'success',
        );
      setShowModal(false);
      fetchBoms();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (bom: any) => {
    try {
      await supabase.from('san_pham_bom').update({ dang_hoat_dong: false }).eq('id', bom.id);
      if (addToast) addToast('Đã xóa định mức', 'success');
      if (selectedBom?.id === bom.id) setSelectedBom(null);
      fetchBoms();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const filteredBoms = boms
    .filter((bom) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        bom.ten_san_pham.toLowerCase().includes(s) || (bom.mo_ta || '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest')
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'code') return (a.ten_san_pham || '').localeCompare(b.ten_san_pham || '');
      return 0;
    });

  const materialOptions = materials.map((m) => ({
    id: m.id,
    name: `${m.name}${m.code ? ` (${m.code})` : ''}`,
  }));

  const handleExportExcel = () => {
    import('@/utils/excelExport').then(({ exportToExcel }) => {
      exportToExcel({
        title: 'Danh mục Định mức Sản phẩm (BOM)',
        sheetName: 'Định mức',
        columns: ['Tên sản phẩm', 'Mô tả', 'Số loại vật tư', 'Ngày tạo'],
        rows: filteredBoms.map((bom) => [
          bom.ten_san_pham,
          bom.mo_ta || '',
          bom.san_pham_bom_chi_tiet?.length || 0,
          new Date(bom.created_at).toLocaleDateString('vi-VN'),
        ]),
        fileName: `CDX_DinhMuc_BOM_${new Date().toISOString().split('T')[0]}.xlsx`,
        addToast,
      });
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Thiết lập Định mức vật tư" onBack={onBack} />
        <div className="flex items-center gap-1.5 justify-end flex-1">
          <SaveImageButton
            onClick={handleSaveTableImage}
            isCapturing={isCapturingTable}
            title="Lưu ảnh danh mục định mức"
          />
          <ExcelButton onClick={handleExportExcel} size="icon" />
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_bom_${user.id}`, val);
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'code', label: 'Tên SP' },
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

      {/* Search panel */}
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
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOM List + Detail split view */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: BOM list */}
        <div className="flex-1 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm">Đang tải...</p>
            </div>
          ) : filteredBoms.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <Package size={48} className="mb-3 text-gray-300" />
              <p className="font-medium">Chưa có định mức nào</p>
              <p className="text-xs mt-1">Bấm nút + để tạo định mức sản phẩm</p>
            </div>
          ) : (
            filteredBoms.map((bom) => (
              <motion.div
                key={bom.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedBom(bom)}
                className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all hover:shadow-md ${
                  selectedBom?.id === bom.id
                    ? 'border-primary shadow-md ring-2 ring-primary/10'
                    : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Layers size={20} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm truncate">
                        {bom.ten_san_pham}
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        {(bom.san_pham_bom_chi_tiet || []).length} vật tư
                        {bom.mo_ta ? ` • ${bom.mo_ta}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(bom);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                      title="Nhân bản"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(bom);
                      }}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(bom);
                      }}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} className="text-gray-300 ml-1" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Right: BOM Detail */}
        {selectedBom && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="bg-primary/5 p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <ClipboardList size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{selectedBom.ten_san_pham}</h3>
                  {selectedBom.mo_ta && (
                    <p className="text-[10px] text-gray-500">{selectedBom.mo_ta}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedBom(null)}
                className="p-1 hover:bg-gray-200 rounded-full lg:block hidden"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-[10px] font-bold text-gray-400 uppercase">Vật tư</th>
                    <th className="py-2 text-[10px] font-bold text-gray-400 uppercase text-right">
                      Định mức
                    </th>
                    <th className="py-2 text-[10px] font-bold text-gray-400 uppercase text-right">
                      ĐVT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(selectedBom.san_pham_bom_chi_tiet || []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-3 text-sm text-gray-800">
                        {item.materials?.name || 'N/A'}
                        {item.materials?.code && (
                          <span className="text-[10px] text-gray-400 ml-1">
                            ({item.materials.code})
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-sm font-bold text-primary text-right">
                        {formatNumber(item.dinh_muc)}
                      </td>
                      <td className="py-3 text-xs text-gray-500 text-right">{item.don_vi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(selectedBom.san_pham_bom_chi_tiet || []).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8 italic">
                  Chưa có vật tư nào trong định mức
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <FAB onClick={handleAddNew} label="Thêm định mức mới" />

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
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 italic">
                    Bill of Materials Registry
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
                Thiết Lập Định Mức Vật Tư
              </h2>
              <p className="text-xs text-gray-500 font-bold italic">
                Thời gian xuất: {new Date().toLocaleString('vi-VN')}
              </p>
              <div className="mt-4 flex flex-col items-end gap-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">
                  STATUS: MASTER_BOM_AUDIT
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
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 w-1/3">
                  Tên sản phẩm thiết lập
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">
                  Mô tả sản phẩm
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic text-right w-32">
                  Số lượng VT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredBoms.map((bom, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                  <td className="px-6 py-4 text-center text-gray-400 font-bold">{idx + 1}</td>
                  <td className="px-6 py-4 font-black text-indigo-600 uppercase tracking-tight break-words whitespace-normal leading-relaxed">
                    {bom.ten_san_pham}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-bold italic break-words whitespace-normal leading-relaxed">
                    {bom.mo_ta || '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-gray-900 bg-gray-100/30">
                    {(bom.san_pham_bom_chi_tiet || []).length} mục
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Branding */}
          <div className="mt-12 flex justify-between items-end border-t border-gray-100 pt-6">
            <div className="space-y-1">
              <p className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] italic whitespace-nowrap">
                CDX ERP SYSTEM
              </p>
              <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                End of Master BOM report • Production Design Services
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1">
                Formula Integrity Secured
              </p>
              <div className="text-[10px] text-gray-400 font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                Auth Token:{' '}
                <span className="text-primary font-black tracking-widest italic ml-1 underline">
                  PRD-BOM-SYNC
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit BOM Modal */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[150] flex md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-none md:rounded-3xl shadow-2xl w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] flex flex-col mt-auto md:mt-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-primary p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-6 text-white flex items-center justify-between rounded-none md:rounded-t-3xl shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 hover:bg-white/20 rounded-full"
                  >
                    <X size={20} />
                  </button>
                  <div>
                    <h2 className="font-bold text-lg">
                      {isEditing ? 'Sửa định mức' : 'Thêm định mức mới'}
                    </h2>
                    <p className="text-xs text-white/70">Công thức sản phẩm & định mức vật tư</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Product info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                      Tên sản phẩm *
                    </label>
                    <input
                      type="text"
                      value={formData.ten_san_pham}
                      onChange={(e) => setFormData({ ...formData, ten_san_pham: e.target.value })}
                      placeholder="VD: Cọc C40-4B1"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                      Mô tả
                    </label>
                    <input
                      type="text"
                      value={formData.mo_ta}
                      onChange={(e) => setFormData({ ...formData, mo_ta: e.target.value })}
                      placeholder="VD: Cọc bê tông ly tâm D400"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>

                {/* BOM Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-600 uppercase">
                      Danh sách vật tư ({bomItems.length})
                    </h3>
                    <Button size="sm" variant="outline" icon={Plus} onClick={handleAddItem}>
                      Thêm vật tư
                    </Button>
                  </div>

                  {bomItems.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400">
                      <Package size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Chưa có vật tư nào</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bomItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {item.material_name}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Định mức: {formatNumber(item.dinh_muc)} {item.don_vi}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 shrink-0 ml-2"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Lưu định mức'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Item sub-modal */}
      <AnimatePresence>
        {showItemForm && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowItemForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-gray-800">Thêm vật tư vào định mức</h3>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Chọn vật tư *
                </label>
                <CreatableSelect
                  value={itemForm.material_id}
                  options={materialOptions}
                  onChange={(val) => {
                    const mat = materials.find((m) => m.id === val);
                    setItemForm({
                      ...itemForm,
                      material_id: val,
                      material_name: mat?.name || val,
                      don_vi: mat?.unit || itemForm.don_vi,
                    });
                  }}
                  placeholder="Tìm & chọn vật tư..."
                  allowCreate={false}
                />
              </div>

              <NumericInput
                label="Định mức / 1 sản phẩm *"
                value={itemForm.dinh_muc}
                onChange={(val) => setItemForm({ ...itemForm, dinh_muc: val })}
              />

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Đơn vị tính
                </label>
                <input
                  type="text"
                  value={itemForm.don_vi}
                  onChange={(e) => setItemForm({ ...itemForm, don_vi: e.target.value })}
                  placeholder="VD: kg, m³, cây..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowItemForm(false)}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveItem}
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  Thêm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
