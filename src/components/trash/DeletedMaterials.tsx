import { useState, useEffect } from 'react';
import {
  Package,
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
import { checkUsage } from '@/utils/dataIntegrity';

export const DeletedMaterials = ({
  onBack,
  addToast,
}: {
  onBack: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    table: string;
    name?: string;
  } | null>(null);

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      const [mats, groups] = await Promise.all([
        supabase.from('materials').select('*, material_groups(name)').eq('status', 'Đã xóa'),
        supabase.from('material_groups').select('*').eq('status', 'Đã xóa'),
      ]);

      const allDeleted = [
        ...(mats.data || []).map((m) => ({
          ...m,
          type: 'Vật tư',
          table: 'materials',
          displayName: m.name,
        })),
        ...(groups.data || []).map((g) => ({
          ...g,
          type: 'Nhóm vật tư',
          table: 'material_groups',
          displayName: g.name,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(allDeleted);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Error fetching deleted materials:', err);
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
    setSelectedItem({ id: item.id, table: item.table, name: item.displayName });
    setShowActionModal(true);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase
        .from(selectedItem.table)
        .update({ status: null })
        .eq('id', selectedItem.id);
      if (error) throw error;

      if (addToast) addToast(`Đã khôi phục ${selectedItem.name} thành công!`, 'success');
      fetchDeletedItems();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi khôi phục: ' + err.message, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      // Use checkUsage if it's a permanent delete just in case
      const usage = await checkUsage(
        selectedItem.table === 'materials' ? 'material' : 'group',
        selectedItem.id,
      );
      if (usage.inUse) {
        throw new Error(`Dữ liệu đang được sử dụng ở: ${usage.tables.join(', ')}`);
      }

      const { error } = await supabase.from(selectedItem.table).delete().eq('id', selectedItem.id);
      if (error) throw error;

      if (addToast) addToast('Đã xóa vĩnh viễn thành công!', 'success');
      fetchDeletedItems();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const restoreSelected = async () => {
    try {
      const promises = Array.from(selectedIds).map((sid) => {
        const [table, id] = sid.split('-');
        return supabase.from(table).update({ status: null }).eq('id', id);
      });
      await Promise.all(promises);
      if (addToast) addToast(`Đã khôi phục ${selectedIds.size} mục thành công!`, 'success');
      fetchDeletedItems();
    } catch (err: any) {
      if (addToast) addToast('Lỗi khôi phục hàng loạt: ' + err.message, 'error');
    }
  };

  const bulkDelete = async () => {
    try {
      let successCount = 0;
      let failCount = 0;

      for (const sid of selectedIds) {
        const [table, id] = sid.split('-');
        const usage = await checkUsage(table === 'materials' ? 'material' : 'group', id);
        if (!usage.inUse) {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (!error) successCount++;
          else failCount++;
        } else {
          failCount++;
        }
      }

      if (addToast)
        addToast(
          `Đã xóa vĩnh viễn ${successCount} mục. ${failCount > 0 ? `Thất bại ${failCount} mục do đang được sử dụng.` : ''}`,
          'success',
        );
      fetchDeletedItems();
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa hàng loạt: ' + err.message, 'error');
    }
  };

  const emptyTrash = async () => {
    try {
      let successCount = 0;
      let failCount = 0;

      for (const item of items) {
        const usage = await checkUsage(item.table === 'materials' ? 'material' : 'group', item.id);
        if (!usage.inUse) {
          const { error } = await supabase.from(item.table).delete().eq('id', item.id);
          if (!error) successCount++;
          else failCount++;
        } else {
          failCount++;
        }
      }

      if (addToast)
        addToast(
          `Đã dọn sạch ${successCount} mục. ${failCount > 0 ? `Bỏ qua ${failCount} mục đang được sử dụng.` : ''}`,
          'info',
        );
      fetchDeletedItems();
      setShowEmptyTrashModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi dọn thùng rác: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Vật tư & Nhóm đã xóa" onBack={onBack} />

        {items.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {selectedIds.size > 0 ? (
              <>
                <button
                  onClick={restoreSelected}
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
                Tên
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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.type === 'Vật tư' ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'}`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-gray-800">{item.displayName}</div>
                      {item.code && (
                        <div className="text-[10px] text-gray-400 mt-0.5">Mã: {item.code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({
                              id: item.id,
                              table: item.table,
                              name: item.displayName,
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
                            setSelectedItem({
                              id: item.id,
                              table: item.table,
                              name: item.displayName,
                            });
                            setShowDeleteModal(true);
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
              <p className="text-sm text-gray-500 mb-6 font-medium">
                Đối tượng: <span className="text-gray-800 font-bold">{selectedItem.name}</span>
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setShowRestoreModal(true);
                  }}
                  className="w-full py-4 px-4 rounded-xl font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-center gap-3 shadow-sm border border-green-100"
                >
                  <RefreshCw size={20} /> Khôi phục dữ liệu
                </button>
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full py-4 px-4 rounded-xl font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-3 shadow-sm border border-red-100"
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

        {showRestoreModal && selectedItem && (
          <ConfirmModal
            show={showRestoreModal}
            title="Xác nhận khôi phục"
            message={`Bạn có chắc muốn khôi phục ${selectedItem.name} trở lại danh mục chính?`}
            confirmText="Khôi phục ngay"
            cancelText="Hủy bỏ"
            onConfirm={confirmRestore}
            onCancel={() => setShowRestoreModal(false)}
            type="success"
          />
        )}

        {showDeleteModal && selectedItem && (
          <ConfirmModal
            show={showDeleteModal}
            title="Xóa vĩnh viễn?"
            message={`Hành động này KHÔNG thể hoàn tác. ${selectedItem.name} sẽ bị xóa sạch khỏi hệ thống.`}
            confirmText="Xác nhận xóa"
            cancelText="Hủy bỏ"
            onConfirm={confirmDelete}
            onCancel={() => setShowDeleteModal(false)}
            type="danger"
          />
        )}

        <ConfirmModal
          show={showBulkDeleteModal}
          title={`Xóa vĩnh viễn ${selectedIds.size} mục?`}
          message="Hành động này sẽ xóa vĩnh viễn tất cả các mục đã chọn. Các mục đang được sử dụng sẽ bị bỏ qua để bảo mật dữ liệu."
          confirmText="Xác nhận xóa"
          onConfirm={bulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
          type="danger"
        />

        <ConfirmModal
          show={showEmptyTrashModal}
          title="Dọn sạch thùng rác?"
          message="Bạn có chắc chắn muốn xóa vĩnh viễn tất cả vật tư và nhóm trong thùng rác không? Chỉ những mục không còn liên kết dữ liệu mới bị xóa."
          confirmText="Dọn sạch ngay"
          onConfirm={emptyTrash}
          onCancel={() => setShowEmptyTrashModal(false)}
          type="danger"
        />
      </AnimatePresence>
    </div>
  );
};
