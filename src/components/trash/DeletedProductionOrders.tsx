import { useState, useEffect } from 'react';
import {
  Layers,
  RefreshCw,
  Trash2,
  Square,
  CheckSquare,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ToastType } from '../shared/Toast';
import { Button } from '../shared/Button';
import { checkUsage, UsageResult } from '@/utils/dataIntegrity';
import { purgeDependencies } from '@/utils/dataFixer';

export const DeletedProductionOrders = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showUsageDetails, setShowUsageDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [usageInfo, setUsageInfo] = useState<UsageResult>({
    inUse: false,
    tables: [],
    details: [],
  });

  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    table: string;
    code?: string;
    display?: string;
  } | null>(null);

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      const [ordersRes, bomsRes] = await Promise.all([
        supabase.from('production_orders').select('*, bom_configs(name)').eq('status', 'Đã xóa'),
        supabase
          .from('bom_configs')
          .select('*, materials:product_item_id(name)')
          .eq('status', 'Đã xóa'),
      ]);

      const allItems = [
        ...(ordersRes.data || []).map((o) => ({
          ...o,
          type: 'Lệnh sản xuất',
          table: 'production_orders',
          displayName: o.order_code,
          subName: o.bom_configs?.name,
        })),
        ...(bomsRes.data || []).map((b) => ({
          ...b,
          type: 'Định mức sản xuất',
          table: 'bom_configs',
          displayName: b.name,
          subName: b.materials?.name,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(allItems);
      setSelectedIds(new Set());
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => `${i.table}-${i.id}`)));
  };

  const handleRowClick = (item: any) => {
    setSelectedItem({ id: item.id, table: item.table, code: item.displayName, display: item.type });
    setShowActionModal(true);
  };

  const handleDeleteClick = async (item: any) => {
    setSelectedItem({ id: item.id, table: item.table, code: item.displayName, display: item.type });
    setShowActionModal(false);
    setShowDeleteModal(true);
    setShowUsageDetails(false);
    setUsageInfo({ inUse: false, tables: [], details: [] });
    try {
      const usage = await checkUsage(item.table === 'bom_configs' ? 'bom' : 'material', item.id);
      setUsageInfo(usage);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from(selectedItem.table)
        .update({ status: 'Mới' })
        .eq('id', selectedItem.id);
      if (error) throw error;

      if (addToast)
        addToast(
          `Đã khôi phục ${selectedItem.display} ${selectedItem.code} thành công!`,
          'success',
        );
      fetchDeletedItems();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi khôi phục: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const isDevelop = user.role === 'Develop';
      if (isDevelop && usageInfo.inUse) {
        await purgeDependencies(
          selectedItem.table === 'bom_configs' ? 'bom' : 'material',
          selectedItem.id,
        );
      }

      const { error } = await supabase.from(selectedItem.table).delete().eq('id', selectedItem.id);
      if (error) throw error;

      if (addToast) addToast('Đã xóa vĩnh viễn dữ liệu thành công!', 'success');
      fetchDeletedItems();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa vĩnh viễn: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Sản xuất & Định mức đã xóa" onBack={onBack} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 text-gray-400 hover:text-primary transition-colors"
                >
                  {selectedIds.size === items.length && items.length > 0 ? (
                    <CheckSquare size={20} className="text-primary" />
                  ) : (
                    <Square size={20} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Loại
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Tên / Mã
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                  Đang tải...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                  Thùng rác trống
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelected = selectedIds.has(`${item.table}-${item.id}`);
                return (
                  <tr
                    key={`${item.table}-${item.id}`}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer group ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(`${item.table}-${item.id}`);
                      }}
                    >
                      <div className="text-gray-400 hover:text-primary transition-colors">
                        {isSelected ? (
                          <CheckSquare size={20} className="text-primary" />
                        ) : (
                          <Square size={20} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.type === 'Lệnh sản xuất' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-gray-800">{item.displayName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {item.subName || new Date(item.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({
                              id: item.id,
                              table: item.table,
                              code: item.displayName,
                              display: item.type,
                            });
                            setShowRestoreModal(true);
                          }}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item);
                          }}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showActionModal && selectedItem && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm shadow-2xl"
            onClick={() => setShowActionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Tùy chọn thao tác
              </h3>
              <p className="text-sm text-gray-500 mb-8 font-medium">
                Đối tượng: <span className="font-black text-primary">{selectedItem.code}</span>
              </p>
              <div className="flex flex-col gap-4">
                <Button
                  fullWidth
                  variant="success"
                  onClick={() => setShowRestoreModal(true)}
                  icon={RefreshCw}
                >
                  KHÔI PHỤC DỮ LIỆU
                </Button>
                <Button
                  fullWidth
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  icon={Trash2}
                >
                  XÓA VĨNH VIỄN
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => setShowActionModal(false)}
                  className="mt-2"
                >
                  HUỶ BỎ
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && selectedItem && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full text-center relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <div className="text-sm text-gray-500 mb-6 text-left bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <p>
                  Mã/Tên: <strong className="text-primary">{selectedItem.code}</strong>
                </p>
                <p>
                  Loại: <strong className="text-primary">{selectedItem.display}</strong>
                </p>

                {usageInfo.inUse ? (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => setShowUsageDetails(!showUsageDetails)}
                      className="flex items-center justify-between w-full text-[10px] text-red-500 font-black uppercase tracking-tighter hover:text-red-600"
                    >
                      <div className="flex items-center gap-1">
                        <AlertCircle size={12} /> Có dữ liệu liên quan
                      </div>
                      {showUsageDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {showUsageDetails && (
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                        {usageInfo.details.map((d, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-[10px] text-gray-500 bg-white p-1.5 rounded-lg border border-gray-100"
                          >
                            <span>{d.label}</span>
                            <span className="font-bold text-red-500">{d.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 uppercase tracking-widest ">
                    <CheckCircle size={12} /> Sẵn sàng để xóa
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {usageInfo.inUse && user.role === 'Develop' && (
                  <div className="p-3 bg-red-50 rounded-2xl border border-red-100 mb-2">
                    <p className="text-[10px] text-red-600 font-bold leading-relaxed italic">
                      Lưu ý: Bạn đang thực hiện "Xóa cưỡng bức". Mọi lệnh sản xuất và định mức liên
                      quan sẽ bị xóa sạch.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button fullWidth variant="outline" onClick={() => setShowDeleteModal(false)}>
                    Hủy bỏ
                  </Button>
                  <Button
                    fullWidth
                    variant="danger"
                    onClick={confirmDelete}
                    disabled={usageInfo.inUse && user.role !== 'Develop'}
                    isLoading={submitting}
                  >
                    {usageInfo.inUse && user.role === 'Develop' ? 'XÓA CƯỞNG BỨC' : 'Xác nhận xóa'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        show={showRestoreModal}
        title="Xác nhận khôi phục"
        message={`Bạn có chắc muốn khôi phục ${selectedItem?.display} ${selectedItem?.code} trở lại danh sách chính?`}
        onConfirm={confirmRestore}
        onCancel={() => setShowRestoreModal(false)}
        type="success"
        isLoading={submitting}
      />
    </div>
  );
};
