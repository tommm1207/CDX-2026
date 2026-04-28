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
  AlertCircle,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ToastType } from '../shared/Toast';
import { Button } from '../shared/Button';
import { SortButton, SortOption } from '../shared/SortButton';
import { checkUsage, UsageResult } from '@/utils/dataIntegrity';
import { purgeDependencies } from '@/utils/dataFixer';

export const DeletedMaterials = ({
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_trashMat_${user.id}`) as SortOption) || 'newest',
  );
  const [showFilter, setShowFilter] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showUsageDetails, setShowUsageDetails] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [usageInfo, setUsageInfo] = useState<UsageResult>({
    inUse: false,
    tables: [],
    details: [],
  });

  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    table: string;
    name?: string;
    code?: string;
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
    setSelectedItem({ id: item.id, table: item.table, name: item.displayName, code: item.code });
    setShowActionModal(true);
  };

  const handleRestoreClick = (item: any) => {
    setSelectedItem({ id: item.id, table: item.table, name: item.displayName });
    setShowActionModal(false);
    setShowRestoreModal(true);
  };

  const handleDeleteClick = async (item: any) => {
    setSelectedItem({ id: item.id, table: item.table, name: item.displayName, code: item.code });
    setShowActionModal(false);
    setShowDeleteModal(true);
    setShowUsageDetails(false);
    setUsageInfo({ inUse: false, tables: [], details: [] });
    try {
      const usage = await checkUsage(item.table === 'materials' ? 'material' : 'group', item.id);
      setUsageInfo(usage);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
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
          selectedItem.table === 'materials' ? 'material' : 'group',
          selectedItem.id,
        );
      }

      const { error } = await supabase.from(selectedItem.table).delete().eq('id', selectedItem.id);
      if (error) throw error;

      if (addToast) addToast('Đã xóa vĩnh viễn thành công!', 'success');
      fetchDeletedItems();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa vĩnh viễn: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const restoreSelected = async () => {
    setSubmitting(true);
    try {
      const promises = Array.from(selectedIds).map((sid) => {
        const [table, id] = (sid as string).split('-');
        return supabase.from(table).update({ status: null }).eq('id', id);
      });
      await Promise.all(promises);
      if (addToast) addToast(`Đã khôi phục ${selectedIds.size} mục thành công!`, 'success');
      fetchDeletedItems();
    } catch (err: any) {
      if (addToast) addToast('Lỗi khôi phục hàng loạt: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const bulkDelete = async () => {
    setSubmitting(true);
    try {
      const isDevelop = user.role === 'Develop';
      let successCount = 0;
      let failCount = 0;

      for (const sid of selectedIds) {
        const [table, id] = (sid as string).split('-');
        const usage = await checkUsage(table === 'materials' ? 'material' : 'group', id);

        if (!usage.inUse || isDevelop) {
          if (usage.inUse && isDevelop) {
            await purgeDependencies(table === 'materials' ? 'material' : 'group', id);
          }
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (!error) successCount++;
          else failCount++;
        } else {
          failCount++;
        }
      }

      if (addToast)
        addToast(
          `Đã xóa vĩnh viễn ${successCount} mục. ${failCount > 0 ? `Bỏ qua ${failCount} mục đang được dùng.` : ''}`,
          successCount > 0 ? 'success' : 'error',
        );
      fetchDeletedItems();
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa hàng loạt: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const emptyTrash = async () => {
    setSubmitting(true);
    try {
      const isDevelop = user.role === 'Develop';
      let successCount = 0;
      let failCount = 0;

      for (const item of items) {
        const usage = await checkUsage(item.table === 'materials' ? 'material' : 'group', item.id);
        if (!usage.inUse || isDevelop) {
          if (usage.inUse && isDevelop) {
            await purgeDependencies(item.table === 'materials' ? 'material' : 'group', item.id);
          }
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
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items
    .filter((i) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        (i.name || '').toLowerCase().includes(s) ||
        (i.code || '').toLowerCase().includes(s) ||
        (i.table || '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest')
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'code') return (a.code || a.name || '').localeCompare(b.code || b.name || '');
      return 0;
    });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <PageBreadcrumb title="Vật tư & Nhóm đã xóa" onBack={onBack} />
        <div className="flex items-center gap-2">
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_trashMat_${user.id}`, val);
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'code', label: 'Tên/Mã' },
            ]}
          />
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter((f) => !f)}
            icon={Search}
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
                placeholder="Tên vật tư, mã, nhóm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredItems.length > 0 && (
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 text-gray-400 hover:text-primary transition-colors"
                >
                  {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
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
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-primary" />
                    Đang tải danh sách...
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                  {searchTerm ? 'Không tìm thấy kết quả' : 'Thùng rác trống'}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
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
                        <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                          Mã: {item.code}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreClick(item);
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
            className="fixed inset-0 z-[61] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setShowActionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Tùy chọn thao tác
              </h3>
              <p className="text-sm text-gray-500 mb-8 font-medium">
                Đối tượng: <span className="text-primary font-black">{selectedItem.name}</span>
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
                  HỦY BỎ
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && selectedItem && (
          <div
            className="fixed inset-0 z-[131] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
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
                  Đối tượng: <strong className="text-primary">{selectedItem.name}</strong>
                </p>
                {selectedItem.code && (
                  <p>
                    Mã: <strong className="text-primary">{selectedItem.code}</strong>
                  </p>
                )}

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
                      Lưu ý: Bạn đang thực hiện "Xóa cưỡng bức". Toàn bộ phiếu kho và tồn kho liên
                      quan đến vật tư này sẽ bị xóa.
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
                    disabled={usageInfo.inUse && user.role?.toLowerCase() !== 'develop'}
                    isLoading={submitting}
                  >
                    {usageInfo.inUse && user.role?.toLowerCase() === 'develop'
                      ? 'XÓA CƯỞNG BỨC'
                      : 'Xác nhận xóa'}
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
        message={`Bạn có chắc muốn khôi phục ${selectedItem?.name} trở lại danh mục chính?`}
        onConfirm={confirmRestore}
        onCancel={() => setShowRestoreModal(false)}
        type="success"
        isLoading={submitting}
      />

      <ConfirmModal
        show={showBulkDeleteModal}
        title={`Xóa vĩnh viễn ${selectedIds.size} mục?`}
        message={`Hành động này sẽ xóa vĩnh viễn tất cả các mục đã chọn. Nếu là Develop, toàn bộ dữ liệu liên quan cũng sẽ bị dọn dẹp.`}
        onConfirm={bulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
        type="danger"
        isLoading={submitting}
      />

      <ConfirmModal
        show={showEmptyTrashModal}
        title="Dọn sạch thùng rác?"
        message="Xác nhận xóa VĨNH VIỄN toàn bộ vật tư và nhóm trong thùng rác? Với quyền Develop, các dữ liệu ràng buộc sẽ bị xóa/dọn sạch."
        onConfirm={emptyTrash}
        onCancel={() => setShowEmptyTrashModal(false)}
        type="danger"
        isLoading={submitting}
      />
    </div>
  );
};
