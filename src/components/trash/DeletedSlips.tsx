import { useState, useEffect } from 'react';
import {
  Archive,
  RefreshCw,
  Trash2,
  AlertTriangle,
  X,
  Check,
  Square,
  CheckSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ToastType } from '../shared/Toast';
import { formatDate, formatNumber } from '@/utils/format';
import { getAvailableStock } from '@/utils/inventory';

export const DeletedSlips = ({
  onBack,
  addToast,
}: {
  onBack: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkRestoreModal, setShowBulkRestoreModal] = useState(false);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    table: string;
    name?: string;
  } | null>(null);

  useEffect(() => {
    fetchDeletedSlips();
  }, []);

  const fetchDeletedSlips = async () => {
    setLoading(true);
    try {
      const [si, so, tr] = await Promise.all([
        supabase
          .from('stock_in')
          .select('*, warehouses(name), materials(name)')
          .eq('status', 'Đã xóa'),
        supabase
          .from('stock_out')
          .select('*, warehouses(name), materials(name)')
          .eq('status', 'Đã xóa'),
        supabase
          .from('transfers')
          .select(
            '*, from_wh:warehouses!from_warehouse_id(name), to_wh:warehouses!to_warehouse_id(name), materials(name)',
          )
          .eq('status', 'Đã xóa'),
      ]);

      const allDeleted = [
        ...(si.data || []).map((s) => ({ ...s, type: 'Nhập kho', table: 'stock_in' })),
        ...(so.data || []).map((s) => ({ ...s, type: 'Xuất kho', table: 'stock_out' })),
        ...(tr.data || []).map((s) => ({ ...s, type: 'Luân chuyển', table: 'transfers' })),
      ].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      );

      setSlips(allDeleted);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Error fetching deleted slips:', err);
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (table: string, id: string) => {
    const key = `${table}-${id}`;
    const next = new Set(selectedIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === slips.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(slips.map((s) => `${s.table}-${s.id}`)));
  };

  const handleRestoreClick = (id: string, table: string, name: string) => {
    setSelectedItem({ id, table, name });
    setShowRestoreModal(true);
  };

  const handleRowClick = (item: any) => {
    setSelectedItem({ id: item.id, table: item.table, name: item.materials?.name || 'Phiếu' });
    setShowActionModal(true);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    try {
      const { data: slip } = await supabase
        .from(selectedItem.table)
        .select('*')
        .eq('id', selectedItem.id)
        .single();
      if (!slip) throw new Error('Không tìm thấy phiếu');

      if (selectedItem.table === 'stock_out' || selectedItem.table === 'transfers') {
        const wh_id =
          selectedItem.table === 'stock_out' ? slip.warehouse_id : slip.from_warehouse_id;
        const stockAtDate = await getAvailableStock(slip.material_id, wh_id, slip.date);
        if (Number(slip.quantity) > stockAtDate) {
          throw new Error(
            `Kho không đủ tồn (${stockAtDate}) để khôi phục phiếu xuất (${slip.quantity})`,
          );
        }
      }

      const { error } = await supabase
        .from(selectedItem.table)
        .update({ status: 'Chờ duyệt' })
        .eq('id', selectedItem.id);
      if (error) throw error;

      if (addToast) addToast('Đã khôi phục chứng từ thành công!', 'success');
      fetchDeletedSlips();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteClick = (id: string, table: string, name: string) => {
    setSelectedItem({ id, table, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from(selectedItem.table).delete().eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast('Đã xóa vĩnh viễn thành công!', 'success');
      fetchDeletedSlips();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const bulkRestore = async () => {
    try {
      let success = 0;
      let fail = 0;
      for (const sid of selectedIds) {
        const [table, id] = sid.split('-');
        const item = slips.find((s) => s.table === table && s.id === id);
        if (!item) continue;

        try {
          if (table === 'stock_out' || table === 'transfers') {
            const wh_id = table === 'stock_out' ? item.warehouse_id : item.from_warehouse_id;
            const stockAtDate = await getAvailableStock(item.material_id, wh_id, item.date);
            if (Number(item.quantity) > stockAtDate) throw new Error('Hụt kho');
          }
          await supabase.from(table).update({ status: 'Chờ duyệt' }).eq('id', id);
          success++;
        } catch (e) {
          fail++;
        }
      }
      if (addToast)
        addToast(`Thành công ${success}, thất bại ${fail}`, success > 0 ? 'success' : 'error');
      fetchDeletedSlips();
      setShowBulkRestoreModal(false);
    } catch (err) {
      console.warn(err);
    }
  };

  const bulkDelete = async () => {
    try {
      const promises = Array.from(selectedIds).map((sid) => {
        const [table, id] = sid.split('-');
        return supabase.from(table).delete().eq('id', id);
      });
      const results = await Promise.all(promises);
      const fails = results.filter((r) => r.error).length;
      if (addToast) addToast(`Đã xóa ${selectedIds.size - fails} mục. Thất bại ${fails}.`, 'info');
      fetchDeletedSlips();
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      console.warn(err);
    }
  };

  const emptyTrash = async () => {
    try {
      const promises = slips.map((s) => supabase.from(s.table).delete().eq('id', s.id));
      await Promise.all(promises);
      if (addToast) addToast('Đã dọn sạch thùng rác', 'success');
      fetchDeletedSlips();
      setShowEmptyTrashModal(false);
    } catch (err: any) {
      console.warn(err);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Phiếu đã xóa" onBack={onBack} />

        {slips.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {selectedIds.size > 0 ? (
              <>
                <button
                  onClick={() => setShowBulkRestoreModal(true)}
                  className="whitespace-nowrap px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-green-200"
                >
                  <RefreshCw size={14} /> Khôi phục ({selectedIds.size})
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="whitespace-nowrap px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-200"
                >
                  <Trash2 size={14} /> Xóa vĩnh viễn ({selectedIds.size})
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowEmptyTrashModal(true)}
                className="whitespace-nowrap px-4 py-2 bg-gray-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-gray-200"
              >
                <Trash2 size={14} /> Dọn sạch thùng rác
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 text-gray-400 hover:text-primary transition-colors"
                >
                  {selectedIds.size === slips.length && slips.length > 0 ? (
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
                Ngày
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Kho
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Vật tư
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">
                SL
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic">
                  Đang tải...
                </td>
              </tr>
            ) : slips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic">
                  Thùng rác trống
                </td>
              </tr>
            ) : (
              slips.map((item) => {
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
                        toggleSelect(item.table, item.id);
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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.type === 'Nhập kho'
                            ? 'bg-blue-100 text-blue-600'
                            : item.type === 'Xuất kho'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-orange-100 text-orange-600'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {item.type === 'Luân chuyển'
                        ? `${item.from_wh?.name} → ${item.to_wh?.name}`
                        : item.warehouses?.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-medium">
                      {item.materials?.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-center font-bold text-gray-700">
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreClick(
                              item.id,
                              item.table,
                              item.materials?.name || 'Phiếu',
                            );
                          }}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id, item.table, item.materials?.name || 'Phiếu');
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
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setShowActionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Tùy chọn thao tác</h3>
              <p className="text-sm text-gray-500 mb-6">
                Đối tượng: <span className="font-bold text-gray-800">{selectedItem.name}</span>
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setShowRestoreModal(true);
                  }}
                  className="w-full py-4 px-4 rounded-xl font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-center gap-3"
                >
                  <RefreshCw size={20} /> Khôi phục dữ liệu
                </button>
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full py-4 px-4 rounded-xl font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-3"
                >
                  <Trash2 size={20} /> Xóa vĩnh viễn
                </button>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="w-full py-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors mt-2"
                >
                  Hủy bỏ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <ConfirmModal
          show={showRestoreModal}
          title="Khôi phục phiếu?"
          message={`Khôi phục ${selectedItem?.name} về trạng thái Chờ duyệt?`}
          onConfirm={confirmRestore}
          onCancel={() => setShowRestoreModal(false)}
          type="success"
        />
        <ConfirmModal
          show={showDeleteModal}
          title="Xóa vĩnh viễn?"
          message={`Hành động này KHÔNG thể hoàn tác. ${selectedItem?.name} sẽ bị xóa.`}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          type="danger"
        />
        <ConfirmModal
          show={showBulkRestoreModal}
          title="Khôi phục các mục đã chọn?"
          message={`Bạn muốn khôi phục ${selectedIds.size} chứng từ?`}
          onConfirm={bulkRestore}
          onCancel={() => setShowBulkRestoreModal(false)}
          type="success"
        />
        <ConfirmModal
          show={showBulkDeleteModal}
          title="Xóa vĩnh viễn các mục đã chọn?"
          message={`Hành động này sẽ xóa ${selectedIds.size} chứng từ vĩnh viễn.`}
          onConfirm={bulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
          type="danger"
        />
        <ConfirmModal
          show={showEmptyTrashModal}
          title="Dọn sạch thùng rác?"
          message="Xác nhận xóa VĨNH VIỄN toàn bộ chứng từ trong thùng rác?"
          onConfirm={emptyTrash}
          onCancel={() => setShowEmptyTrashModal(false)}
          type="danger"
        />
      </AnimatePresence>
    </div>
  );
};
