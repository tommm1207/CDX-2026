import { useState, useEffect } from 'react';
import {
  Wallet,
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
import { formatCurrency } from '@/utils/format';
import { ToastType } from '../shared/Toast';

export const DeletedCosts = ({
  onBack,
  addToast,
}: {
  onBack: () => void;
  addToast: (msg: string, type?: ToastType) => void;
}) => {
  const [costs, setCosts] = useState<any[]>([]);
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
    fetchDeletedCosts();
  }, []);

  const fetchDeletedCosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('costs')
        .select('*, users(full_name), warehouses(name), materials(name)')
        .eq('status', 'Đã xóa')
        .order('date', { ascending: false });

      if (error) {
        const { data: simpleData, error: simpleError } = await supabase
          .from('costs')
          .select('*')
          .eq('status', 'Đã xóa')
          .order('date', { ascending: false });
        if (simpleError) throw simpleError;
        setCosts(simpleData || []);
      } else {
        setCosts(data || []);
      }
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error fetching deleted costs:', err);
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
    if (selectedIds.size === costs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(costs.map((c) => c.id)));
  };

  const handleRestoreClick = (id: string, name: string) => {
    setSelectedItem({ id, name });
    setShowRestoreModal(true);
  };

  const handleRowClick = (item: any) => {
    setSelectedItem({
      id: item.id,
      name: item.cost_code || item.materials?.name || item.content || 'Chi phí',
    });
    setShowActionModal(true);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase
        .from('costs')
        .update({ status: 'Đã hoàn thành' })
        .eq('id', selectedItem.id);
      if (error) throw error;
      addToast(`Đã khôi phục chi phí thành công!`, 'success');
      fetchDeletedCosts();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from('costs').delete().eq('id', selectedItem.id);
      if (error) {
        if (error.code === '23503' || error.message.includes('violates foreign key constraint')) {
          throw new Error('Dữ liệu đang được sử dụng, không thể xóa vĩnh viễn.');
        }
        throw error;
      }
      addToast('Đã xóa vĩnh viễn thành công!', 'success');
      fetchDeletedCosts();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const bulkRestore = async () => {
    try {
      const promises = Array.from(selectedIds).map((id) =>
        supabase.from('costs').update({ status: 'Đã hoàn thành' }).eq('id', id),
      );
      await Promise.all(promises);
      addToast(`Đã khôi phục ${selectedIds.size} mục thành công!`, 'success');
      fetchDeletedCosts();
      setShowBulkRestoreModal(false);
    } catch (err: any) {
      addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const bulkDelete = async () => {
    try {
      const promises = Array.from(selectedIds).map((id) =>
        supabase.from('costs').delete().eq('id', id),
      );
      const results = await Promise.all(promises);
      const fails = results.filter((r) => r.error).length;
      addToast(`Đã xóa ${selectedIds.size - fails} mục. Thất bại ${fails}.`, 'info');
      fetchDeletedCosts();
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      console.warn(err);
    }
  };

  const emptyTrash = async () => {
    try {
      const promises = costs.map((c) => supabase.from('costs').delete().eq('id', c.id));
      await Promise.all(promises);
      addToast('Đã dọn sạch thùng rác', 'success');
      fetchDeletedCosts();
      setShowEmptyTrashModal(false);
    } catch (err: any) {
      console.warn(err);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Chi phí đã xóa" onBack={onBack} />
        {costs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {selectedIds.size > 0 ? (
              <>
                <button
                  onClick={() => setShowBulkRestoreModal(true)}
                  className="whitespace-nowrap px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-xs flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Khôi phục ({selectedIds.size})
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="whitespace-nowrap px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs flex items-center gap-2"
                >
                  <Trash2 size={14} /> Xóa vĩnh viễn ({selectedIds.size})
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowEmptyTrashModal(true)}
                className="whitespace-nowrap px-4 py-2 bg-gray-800 text-white rounded-xl font-bold text-xs flex items-center gap-2"
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
                <button onClick={toggleSelectAll}>
                  {selectedIds.size === costs.length && costs.length > 0 ? (
                    <CheckSquare size={20} className="text-primary" />
                  ) : (
                    <Square size={20} className="text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Ngày chi
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Nội dung
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">
                Số tiền
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">
                  Đang tải...
                </td>
              </tr>
            ) : costs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">
                  Thùng rác trống
                </td>
              </tr>
            ) : (
              costs.map((item) => {
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
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(item.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-gray-800">{item.cost_type}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">
                        {item.content}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 text-xs font-bold text-right ${item.transaction_type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {item.transaction_type === 'Thu' ? '+' : '-'}
                      {formatCurrency(item.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreClick(item.id, item.cost_code || item.cost_type);
                          }}
                          className="p-2 bg-green-50 text-green-600 rounded-lg"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id, item.cost_code || item.cost_type);
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
                Đối tượng: <span className="font-bold text-gray-800">{selectedItem.name}</span>
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
          title="Khôi phục chi phí?"
          message={`Khôi phục chi phí ${selectedItem?.name} về danh sách chính?`}
          onConfirm={confirmRestore}
          onCancel={() => setShowRestoreModal(false)}
          type="success"
        />
        <ConfirmModal
          show={showDeleteModal}
          title="Xóa vĩnh viễn?"
          message={`Hành động này KHÔNG thể hoàn tác. Chi phí ${selectedItem?.name} sẽ bị xóa.`}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          type="danger"
        />
        <ConfirmModal
          show={showBulkRestoreModal}
          title="Khôi phục đã chọn?"
          message={`Bạn muốn khôi phục ${selectedIds.size} mục?`}
          onConfirm={bulkRestore}
          onCancel={() => setShowBulkRestoreModal(false)}
          type="success"
        />
        <ConfirmModal
          show={showBulkDeleteModal}
          title="Xóa vĩnh viễn đã chọn?"
          message={`Hành động này sẽ xóa ${selectedIds.size} mục vĩnh viễn.`}
          onConfirm={bulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
          type="danger"
        />
        <ConfirmModal
          show={showEmptyTrashModal}
          title="Dọn sạch thùng rác?"
          message="Xác nhận xóa VĨNH VIỄN toàn bộ chi phí trong thùng rác?"
          onConfirm={emptyTrash}
          onCancel={() => setShowEmptyTrashModal(false)}
          type="danger"
        />
      </AnimatePresence>
    </div>
  );
};
