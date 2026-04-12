import { useState, useEffect } from 'react';
import {
  Warehouse,
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

export const DeletedWarehouses = ({
  onBack,
  addToast,
}: {
  onBack: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkRestoreModal, setShowBulkRestoreModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name?: string } | null>(null);

  useEffect(() => {
    fetchDeletedWarehouses();
  }, []);

  const fetchDeletedWarehouses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*, users(full_name)')
        .eq('status', 'Đã xóa');
      if (error) {
        const { data: simpleData, error: simpleError } = await supabase
          .from('warehouses')
          .select('*')
          .eq('status', 'Đã xóa');
        if (simpleError) throw simpleError;
        setWarehouses(simpleData || []);
      } else {
        setWarehouses(data || []);
      }
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
    if (selectedIds.size === warehouses.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(warehouses.map((w) => w.id)));
  };

  const handleRestoreClick = (id: string, name: string) => {
    setSelectedItem({ id, name });
    setShowRestoreModal(true);
  };

  const handleRowClick = (item: any) => {
    setSelectedItem({ id: item.id, name: item.name });
    setShowActionModal(true);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase
        .from('warehouses')
        .update({ status: 'Đang hoạt động' })
        .eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast('Đã khôi phục kho thành công!', 'success');
      fetchDeletedWarehouses();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from('warehouses').delete().eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast('Đã xóa vĩnh viễn thành công!', 'success');
      fetchDeletedWarehouses();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      const msg =
        err.code === '23503'
          ? 'Không thể xóa vĩnh viễn vì kho này đang có dữ liệu liên quan.'
          : err.message;
      if (addToast) addToast('Lỗi: ' + msg, 'error');
    }
  };

  const bulkRestore = async () => {
    try {
      const promises = Array.from(selectedIds).map((id) =>
        supabase.from('warehouses').update({ status: 'Đang hoạt động' }).eq('id', id),
      );
      await Promise.all(promises);
      if (addToast) addToast(`Đã khôi phục ${selectedIds.size} kho thành công!`, 'success');
      fetchDeletedWarehouses();
      setShowBulkRestoreModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const bulkDelete = async () => {
    try {
      const promises = Array.from(selectedIds).map((id) =>
        supabase.from('warehouses').delete().eq('id', id),
      );
      const results = await Promise.all(promises);
      const fails = results.filter((r) => r.error).length;
      if (addToast) addToast(`Đã xóa ${selectedIds.size - fails} kho. Thất bại ${fails}.`, 'info');
      fetchDeletedWarehouses();
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      console.warn(err);
    }
  };

  const emptyTrash = async () => {
    try {
      const promises = warehouses.map((w) => supabase.from('warehouses').delete().eq('id', w.id));
      await Promise.all(promises);
      if (addToast) addToast('Đã dọn sạch thùng rác', 'success');
      fetchDeletedWarehouses();
      setShowEmptyTrashModal(false);
    } catch (err: any) {
      console.warn(err);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Kho đã xóa" onBack={onBack} />
        {warehouses.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <button
                  onClick={() => setShowBulkRestoreModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-xs flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Khôi phục ({selectedIds.size})
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs flex items-center gap-2"
                >
                  <Trash2 size={14} /> Xóa vĩnh viễn ({selectedIds.size})
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowEmptyTrashModal(true)}
                className="px-4 py-2 bg-gray-800 text-white rounded-xl font-bold text-xs flex items-center gap-2"
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
                <button onClick={toggleSelectAll}>
                  {selectedIds.size === warehouses.length && warehouses.length > 0 ? (
                    <CheckSquare size={20} className="text-primary" />
                  ) : (
                    <Square size={20} className="text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Mã kho
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Tên kho
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
            ) : warehouses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                  Thùng rác trống
                </td>
              </tr>
            ) : (
              warehouses.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="text-primary" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                      {item.code || item.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-bold">{item.name}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreClick(item.id, item.name);
                          }}
                          className="p-2 bg-green-50 text-green-600 rounded-lg"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id, item.name);
                          }}
                          className="p-2 bg-red-50 text-red-600 rounded-lg"
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
              <p className="text-sm text-gray-500 mb-6 font-medium">
                Đối tượng: <span className="text-gray-800 font-bold">{selectedItem.name}</span>
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setShowRestoreModal(true);
                  }}
                  className="w-full py-4 rounded-xl font-bold text-green-700 bg-green-50 hover:bg-green-100 flex items-center justify-center gap-3"
                >
                  <RefreshCw size={20} /> Khôi phục dữ liệu
                </button>
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full py-4 rounded-xl font-bold text-red-700 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-3"
                >
                  <Trash2 size={20} /> Xóa vĩnh viễn
                </button>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="w-full py-4 rounded-xl font-bold text-gray-600 bg-gray-100 transition-colors mt-2"
                >
                  Hủy bỏ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <ConfirmModal
          show={showRestoreModal}
          title="Khôi phục kho?"
          message={`Khôi phục kho ${selectedItem?.name} về trạng thái hoạt động?`}
          onConfirm={confirmRestore}
          onCancel={() => setShowRestoreModal(false)}
          type="info"
        />
        <ConfirmModal
          show={showDeleteModal}
          title="Xóa vĩnh viễn?"
          message={`Hành động này KHÔNG thể hoàn tác. Kho ${selectedItem?.name} sẽ bị xóa.`}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          type="danger"
        />
        <ConfirmModal
          show={showBulkRestoreModal}
          title="Khôi phục đã chọn?"
          message={`Bạn muốn khôi phục ${selectedIds.size} kho?`}
          onConfirm={bulkRestore}
          onCancel={() => setShowBulkRestoreModal(false)}
          type="info"
        />
        <ConfirmModal
          show={showBulkDeleteModal}
          title="Xóa vĩnh viễn đã chọn?"
          message={`Hành động này sẽ xóa ${selectedIds.size} kho vĩnh viễn.`}
          onConfirm={bulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
          type="danger"
        />
        <ConfirmModal
          show={showEmptyTrashModal}
          title="Dọn sạch thùng rác?"
          message="Xác nhận xóa VĨNH VIỄN toàn bộ kho trong thùng rác?"
          onConfirm={emptyTrash}
          onCancel={() => setShowEmptyTrashModal(false)}
          type="danger"
        />
      </AnimatePresence>
    </div>
  );
};
