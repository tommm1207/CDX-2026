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
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '@/components/shared';
import { ConfirmModal } from '@/components/shared';
import { ToastType } from '@/components/shared';
import { Button } from '@/components/shared';
import { SortButton, SortOption } from '@/components/shared';
import { checkUsage, UsageResult } from '@/utils/dataIntegrity';
import { purgeDependencies } from '@/utils/dataFixer';

export const DeletedWarehouses = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack: () => void;
  addToast: (msg: string, type?: ToastType) => void;
}) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_trashWH_${user.id}`) as SortOption) || 'newest',
  );
  const [showFilter, setShowFilter] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkRestoreModal, setShowBulkRestoreModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
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
    name?: string;
    code?: string;
  } | null>(null);

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

  const handleRowClick = (item: any) => {
    setSelectedItem({ id: item.id, name: item.name, code: item.code });
    setShowActionModal(true);
  };

  const handleDeleteClick = async (item: any) => {
    setSelectedItem({ id: item.id, name: item.name, code: item.code });
    setShowActionModal(false);
    setShowDeleteModal(true);
    setShowUsageDetails(false);
    setUsageInfo({ inUse: false, tables: [], details: [] });
    try {
      const usage = await checkUsage('warehouse', item.id);
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
        .from('warehouses')
        .update({ status: 'Đang hoạt động' })
        .eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast(`Đã khôi phục kho ${selectedItem.name} thành công!`, 'success');
      fetchDeletedWarehouses();
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
      const isDevelop = user.role?.toLowerCase() === 'develop';
      if (isDevelop && usageInfo.inUse) {
        await purgeDependencies('warehouse', selectedItem.id);
      }

      const { error } = await supabase.from('warehouses').delete().eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast('Đã xóa vĩnh viễn kho thành công!', 'success');
      fetchDeletedWarehouses();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa vĩnh viễn: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const bulkRestore = async () => {
    setSubmitting(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        supabase.from('warehouses').update({ status: 'Đang hoạt động' }).eq('id', id),
      );
      await Promise.all(promises);
      if (addToast) addToast(`Đã khôi phục ${selectedIds.size} kho thành công!`, 'success');
      fetchDeletedWarehouses();
      setShowBulkRestoreModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi khôi phục hàng loạt: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const bulkDelete = async () => {
    setSubmitting(true);
    try {
      const isDevelop = user.role?.toLowerCase() === 'develop';
      let successCount = 0;
      let failCount = 0;

      for (const id of selectedIds) {
        const usage = await checkUsage('warehouse', id);
        if (!usage.inUse || isDevelop) {
          if (usage.inUse && isDevelop) {
            await purgeDependencies('warehouse', id);
          }
          const { error } = await supabase.from('warehouses').delete().eq('id', id);
          if (!error) successCount++;
          else failCount++;
        } else {
          failCount++;
        }
      }

      if (addToast) addToast(`Đã xóa ${successCount} kho. Thất bại/Bỏ qua ${failCount}.`, 'info');
      fetchDeletedWarehouses();
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      console.warn(err);
    } finally {
      setSubmitting(false);
    }
  };

  const emptyTrash = async () => {
    setSubmitting(true);
    try {
      const isDevelop = user.role?.toLowerCase() === 'develop';
      let count = 0;
      for (const w of warehouses) {
        const usage = await checkUsage('warehouse', w.id);
        if (usage.inUse && !isDevelop) continue;
        if (usage.inUse && isDevelop) await purgeDependencies('warehouse', w.id);

        await supabase.from('warehouses').delete().eq('id', w.id);
        count++;
      }
      if (addToast) addToast(`Đã dọn sạch ${count} kho khỏi thùng rác`, 'success');
      fetchDeletedWarehouses();
      setShowEmptyTrashModal(false);
    } catch (err: any) {
      console.warn(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWarehouses = warehouses
    .filter((w) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (w.name || '').toLowerCase().includes(s) || (w.code || '').toLowerCase().includes(s);
    })
    .sort((a, b) => {
      if (sortBy === 'newest')
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
      return 0;
    });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <PageBreadcrumb title="Kho đã xóa" onBack={onBack} />
        <div className="flex items-center gap-2">
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_trashWH_${user.id}`, val);
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'code', label: 'Mã kho' },
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
                placeholder="Tên kho, mã kho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredWarehouses.length > 0 && (
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 text-gray-400 hover:text-primary transition-colors"
                >
                  {selectedIds.size === filteredWarehouses.length &&
                  filteredWarehouses.length > 0 ? (
                    <CheckSquare size={20} className="text-primary" />
                  ) : (
                    <Square size={20} />
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
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-primary" />
                    Đang tải danh sách...
                  </div>
                </td>
              </tr>
            ) : filteredWarehouses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                  {searchTerm ? 'Không tìm thấy kết quả' : 'Thùng rác trống'}
                </td>
              </tr>
            ) : (
              filteredWarehouses.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer group ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
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
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono font-bold text-primary">
                      {item.code || item.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-bold">{item.name}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({ id: item.id, name: item.name, code: item.code });
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
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
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
                Đối tượng: <span className="font-black text-primary">{selectedItem.name}</span>
              </p>
              <div className="flex flex-col gap-4">
                <Button
                  fullWidth
                  variant="success"
                  onClick={() => {
                    setShowActionModal(false);
                    setShowRestoreModal(true);
                  }}
                  icon={RefreshCw}
                >
                  KHÔI PHỤC DỮ LIỆU
                </Button>
                <Button
                  fullWidth
                  variant="danger"
                  onClick={() => {
                    setShowActionModal(false);
                    setShowDeleteModal(true);
                  }}
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
                  Tên kho: <strong className="text-primary">{selectedItem.name}</strong>
                </p>
                <p>
                  Mã kho: <strong className="text-primary">{selectedItem.code}</strong>
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
                {usageInfo.inUse && user.role?.toLowerCase() === 'develop' && (
                  <div className="p-3 bg-red-50 rounded-2xl border border-red-100 mb-2">
                    <p className="text-[10px] text-red-600 font-bold leading-relaxed italic">
                      Lưu ý: Bạn đang thực hiện "Xóa cưỡng bức". Mọi phiếu nhập/xuất, tồn kho và
                      nhật ký liên quan đến kho này sẽ bị xóa.
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
        title="Khôi phục kho?"
        message={`Khôi phục kho ${selectedItem?.name} về trạng thái đang hoạt động?`}
        onConfirm={confirmRestore}
        onCancel={() => setShowRestoreModal(false)}
        type="success"
        isLoading={submitting}
      />

      <ConfirmModal
        show={showBulkRestoreModal}
        title="Khôi phục đã chọn?"
        message={`Bạn muốn khôi phục ${selectedIds.size} kho về trạng thái hoạt động?`}
        onConfirm={bulkRestore}
        onCancel={() => setShowBulkRestoreModal(false)}
        type="success"
        isLoading={submitting}
      />
      <ConfirmModal
        show={showBulkDeleteModal}
        title="Xóa vĩnh viễn đã chọn?"
        message={`Hành động này sẽ xóa vĩnh viễn ${selectedIds.size} kho khỏi hệ thống. Với Develop, toàn bộ dữ liệu liên quan cũng sẽ bị dọn dẹp.`}
        onConfirm={bulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
        type="danger"
        isLoading={submitting}
      />
      <ConfirmModal
        show={showEmptyTrashModal}
        title="Dọn sạch thùng rác?"
        message="Xác nhận xóa VĨNH VIỄN toàn bộ kho trong thùng rác? Với quyền Develop, các dữ liệu ràng buộc sẽ bị xóa/dọn sạch."
        onConfirm={emptyTrash}
        onCancel={() => setShowEmptyTrashModal(false)}
        type="danger"
        isLoading={submitting}
      />
    </div>
  );
};
