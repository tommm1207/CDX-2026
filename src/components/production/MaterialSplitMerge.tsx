import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  X,
  Scissors,
  Merge,
  ArrowRight,
  Package,
  Trash2,
  ChevronRight,
} from 'lucide-react';
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
import { formatDate, formatNumber } from '@/utils/format';
import { isActiveWarehouse, getAvailableStock } from '@/utils/inventory';
import { getAllowedWarehouses } from '@/utils/helpers';
import { utils, writeFile } from 'xlsx';

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
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'xa' | 'gop'>('xa');
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    fetchHistory();
    fetchMaterials();
    fetchWarehouses();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('xasa_gop_phieu')
        .select(
          '*, warehouses(name), users(full_name), xasa_gop_chi_tiet(*, materials(name, code))',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    const { data } = await supabase
      .from('materials')
      .select('id, name, code, unit')
      .or('status.is.null,status.neq.Đã xóa')
      .order('name');
    if (data) setMaterials(data);
  };

  const fetchWarehouses = async () => {
    let query = supabase
      .from('warehouses')
      .select('id, name, status')
      .or('status.is.null,status.neq.Đã xóa');
    const allowed = getAllowedWarehouses(user.data_view_permission);
    if (allowed) query = query.in('id', allowed);
    const { data } = await query;
    if (data) setWarehouses(data.filter(isActiveWarehouse));
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
    setShowModal(true);
  };

  const handleSelectNguonXa = async (matId: string) => {
    const mat = materials.find((m) => m.id === matId);
    let tonKho = 0;
    if (kho_id) {
      try {
        tonKho = await getAvailableStock(matId, kho_id);
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

    setSubmitting(true);
    try {
      const ma_phieu = generateCode(mode);
      const today = new Date().toISOString().split('T')[0];

      // 1. Create phieu header
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
          },
        ])
        .select()
        .single();
      if (phieuErr) throw phieuErr;

      if (mode === 'xa') {
        // Validate
        if (!nguonXa.material_id || nguonXa.so_luong <= 0) {
          throw new Error('Vui lòng chọn vật tư nguồn và nhập số lượng');
        }
        if (outputXa.length === 0) {
          throw new Error('Vui lòng thêm ít nhất 1 mảnh ra');
        }

        // Insert detail records
        const details = [
          {
            phieu_id: phieu.id,
            material_id: nguonXa.material_id,
            vai_tro: 'nguon',
            so_luong: nguonXa.so_luong,
            don_vi: nguonXa.don_vi,
          },
          ...outputXa.map((o: any) => ({
            phieu_id: phieu.id,
            material_id: o.material_id,
            vai_tro: 'ra',
            so_luong: o.so_luong,
            don_vi: o.don_vi,
          })),
        ];
        await supabase.from('xasa_gop_chi_tiet').insert(details);

        // Create stock_out for source + stock_in for outputs
        await supabase.from('stock_out').insert([
          {
            slip_code: `XA-${ma_phieu}`,
            date: today,
            material_id: nguonXa.material_id,
            warehouse_id: kho_id,
            quantity: nguonXa.so_luong,
            unit: nguonXa.don_vi,
            employee_id: user.id,
            notes: `Xả vật tư - Phiếu: ${ma_phieu}`,
            status: 'Đã duyệt',
            approved_by: user.id,
            approved_date: today,
          },
        ]);

        const stockInItems = outputXa.map((o: any) => ({
          slip_code: `XA-${ma_phieu}`,
          date: today,
          material_id: o.material_id,
          warehouse_id: kho_id,
          quantity: o.so_luong,
          unit: o.don_vi,
          employee_id: user.id,
          notes: `Mảnh ra từ xả vật tư - Phiếu: ${ma_phieu}`,
          status: 'Đã duyệt',
          approved_by: user.id,
          approved_date: today,
        }));
        await supabase.from('stock_in').insert(stockInItems);
      } else {
        // GỘP
        if (nguonGop.length === 0) throw new Error('Vui lòng thêm vật tư nguồn');
        if (!outputGop.material_id || outputGop.so_luong <= 0)
          throw new Error('Vui lòng khai báo vật tư gộp ra');

        const details = [
          ...nguonGop.map((n: any) => ({
            phieu_id: phieu.id,
            material_id: n.material_id,
            vai_tro: 'nguon',
            so_luong: n.so_luong,
            don_vi: n.don_vi,
          })),
          {
            phieu_id: phieu.id,
            material_id: outputGop.material_id,
            vai_tro: 'ra',
            so_luong: outputGop.so_luong,
            don_vi: outputGop.don_vi,
          },
        ];
        await supabase.from('xasa_gop_chi_tiet').insert(details);

        // stock_out for all sources
        const stockOuts = nguonGop.map((n: any) => ({
          slip_code: `GOP-${ma_phieu}`,
          date: today,
          material_id: n.material_id,
          warehouse_id: kho_id,
          quantity: n.so_luong,
          unit: n.don_vi,
          employee_id: user.id,
          notes: `Gộp vật tư - Phiếu: ${ma_phieu}`,
          status: 'Đã duyệt',
          approved_by: user.id,
          approved_date: today,
        }));
        await supabase.from('stock_out').insert(stockOuts);

        // stock_in for output
        await supabase.from('stock_in').insert([
          {
            slip_code: `GOP-${ma_phieu}`,
            date: today,
            material_id: outputGop.material_id,
            warehouse_id: kho_id,
            quantity: outputGop.so_luong,
            unit: outputGop.don_vi,
            employee_id: user.id,
            notes: `Vật tư gộp ra - Phiếu: ${ma_phieu}`,
            status: 'Đã duyệt',
            approved_by: user.id,
            approved_date: today,
          },
        ]);
      }

      if (addToast) addToast(`Phiếu ${ma_phieu} đã được tạo thành công!`, 'success');
      setShowModal(false);
      fetchHistory();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const materialOptions = materials.map((m) => ({
    id: m.id,
    name: `${m.name}${m.code ? ` (${m.code})` : ''}`,
  }));
  const warehouseOptions = warehouses.map((w) => ({ id: w.id, name: w.name }));

  const filteredHistory = history.filter((h) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (h.ma_phieu || '').toLowerCase().includes(s);
  });

  const exportToExcel = () => {
    const data = filteredHistory.map((h) => ({
      'Mã phiếu': h.ma_phieu,
      Loại: h.loai === 'xa' ? 'Xả' : 'Gộp',
      Ngày: formatDate(h.ngay),
      Kho: h.warehouses?.name || '',
      'Người tạo': h.users?.full_name || '',
      'Ghi chú': h.ghi_chu || '',
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'XaGop');
    writeFile(wb, `XaGopVatTu_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Xả / Gộp vật tư" onBack={onBack} />
        <ExcelButton onClick={exportToExcel} />
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm mã phiếu..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
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
              <div key={item.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.loai === 'xa' ? 'bg-orange-100' : 'bg-blue-100'}`}
                    >
                      {item.loai === 'xa' ? (
                        <Scissors size={14} className="text-orange-600" />
                      ) : (
                        <Merge size={14} className="text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.ma_phieu}</p>
                      <p className="text-[10px] text-gray-400">
                        {formatDate(item.ngay)} • {item.warehouses?.name} • {item.users?.full_name}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${item.loai === 'xa' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}
                  >
                    {item.loai === 'xa' ? 'Xả' : 'Gộp'}
                  </span>
                </div>

                {/* Brief summary */}
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                  <span>{nguonItems.map((n: any) => n.materials?.name || 'N/A').join(', ')}</span>
                  <ArrowRight size={12} className="shrink-0 text-gray-400" />
                  <span>{raItems.map((r: any) => r.materials?.name || 'N/A').join(', ')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
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
              {/* Header */}
              <div
                className={`p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-6 text-white flex items-center justify-between rounded-none md:rounded-t-3xl shrink-0 ${mode === 'xa' ? 'bg-orange-500' : 'bg-blue-500'}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 hover:bg-white/20 rounded-full"
                  >
                    <X size={20} />
                  </button>
                  <div>
                    <h2 className="font-bold text-lg">
                      {mode === 'xa' ? 'Xả vật tư' : 'Gộp vật tư'}
                    </h2>
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
                    placeholder="Chọn kho..."
                    allowCreate={false}
                  />
                </div>

                {mode === 'xa' ? (
                  <>
                    {/* Nguồn xả */}
                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                      <h4 className="text-xs font-bold text-orange-700 uppercase mb-3">
                        📦 Vật tư nguồn
                      </h4>
                      <CreatableSelect
                        value={nguonXa.material_id}
                        options={materialOptions}
                        onChange={(val) => handleSelectNguonXa(val)}
                        placeholder="Chọn vật tư cần xả..."
                        allowCreate={false}
                      />
                      {nguonXa.material_id && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <NumericInput
                            label="Số lượng xả"
                            value={nguonXa.so_luong}
                            onChange={(val) => setNguonXa({ ...nguonXa, so_luong: val })}
                          />
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                              ĐVT
                            </label>
                            <input
                              type="text"
                              value={nguonXa.don_vi}
                              onChange={(e) => setNguonXa({ ...nguonXa, don_vi: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                            />
                          </div>
                          {kho_id && (
                            <p className="text-[10px] text-gray-500 col-span-2">
                              Tồn kho hiện tại:{' '}
                              <span className="font-bold text-primary">
                                {formatNumber(nguonXa.ton_kho)}
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Output xả */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-gray-600 uppercase">
                          ✂️ Mảnh ra ({outputXa.length})
                        </h4>
                        <Button size="sm" variant="outline" icon={Plus} onClick={addOutputXa}>
                          Thêm
                        </Button>
                      </div>
                      {outputXa.map((o, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 mb-2 bg-gray-50 rounded-xl p-3"
                        >
                          <div className="flex-1">
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
                              placeholder="Chọn vật tư..."
                              allowCreate={false}
                            />
                          </div>
                          <div className="w-24">
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
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Nguồn gộp */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-blue-700 uppercase">
                          📦 Vật tư nguồn ({nguonGop.length})
                        </h4>
                        <Button size="sm" variant="outline" icon={Plus} onClick={addNguonGop}>
                          Thêm
                        </Button>
                      </div>
                      {nguonGop.map((n, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 mb-2 bg-blue-50 rounded-xl p-3"
                        >
                          <div className="flex-1">
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
                              placeholder="Chọn vật tư..."
                              allowCreate={false}
                            />
                          </div>
                          <div className="w-24">
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
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Output gộp */}
                    <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                      <h4 className="text-xs font-bold text-green-700 uppercase mb-3">
                        🔗 Vật tư gộp ra
                      </h4>
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
                        placeholder="Chọn vật tư đầu ra..."
                        allowCreate={false}
                      />
                      {outputGop.material_id && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <NumericInput
                            label="Số lượng"
                            value={outputGop.so_luong}
                            onChange={(val) => setOutputGop({ ...outputGop, so_luong: val })}
                          />
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                              ĐVT
                            </label>
                            <input
                              type="text"
                              value={outputGop.don_vi}
                              onChange={(e) =>
                                setOutputGop({ ...outputGop, don_vi: e.target.value })
                              }
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Ghi chú */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    value={ghi_chu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    placeholder="Ghi chú..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`px-8 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg disabled:opacity-50 ${mode === 'xa' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'}`}
                >
                  {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
