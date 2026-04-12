import { useState, useEffect } from 'react';
import {
  Factory,
  RefreshCw,
  Trash2,
  AlertTriangle,
  X,
  Check,
  Square,
  CheckSquare,
  AlertCircle,
  Search,
  ClipboardList,
  Layers,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ToastType } from '../shared/Toast';
import { Button } from '../shared/Button';
import { SortButton } from '../shared/SortButton';
import { formatCurrency, formatDate } from '@/utils/format';

type TabType = 'production_orders' | 'boms' | 'split_merge_history' | 'construction_diaries';
type SortOption = 'newest' | 'code' | 'name';

export const DeletedProduction = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack: () => void;
  addToast: (msg: string, type?: ToastType) => void;
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('production_orders');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_trashProd_${user.id}`) as SortOption) || 'newest',
  );

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkRestoreModal, setShowBulkRestoreModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    table: string;
    code?: string;
    name?: string;
  } | null>(null);

  useEffect(() => {
    fetchDeletedItems();
  }, [activeTab]);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      let data: any[] | null = [];
      let error: any = null;

      if (activeTab === 'production_orders') {
        const res = await supabase.from('lenh_san_xuat').select('*').eq('trang_thai', 'Đã xóa');
        data = res.data;
        error = res.error;
      } else if (activeTab === 'boms') {
        const res = await supabase.from('san_pham_bom').select('*').eq('dang_hoat_dong', false);
        data = res.data;
        error = res.error;
      } else if (activeTab === 'split_merge_history') {
        const res = await supabase.from('xasa_gop_phieu').select('*').eq('trang_thai', 'Đã xóa');
        data = res.data;
        error = res.error;
      } else if (activeTab === 'construction_diaries') {
        const res = await supabase
          .from('construction_diaries')
          .select('*')
          .eq('trang_thai', 'Đã xóa');
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      setItems(data || []);
      setSelectedIds(new Set());
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getCode = (item: any) => {
    return item.ma_lenh || item.ma_phieu || item.diary_code || item.code || item.id.slice(0, 8);
  };

  const getName = (item: any) => {
    if (activeTab === 'production_orders') {
      return item.ghi_chu || 'Không mô tả';
    }
    if (activeTab === 'boms') return item.ten_san_pham || 'Không tên';
    if (activeTab === 'split_merge_history')
      return `${item.loai === 'xa' ? 'Xả' : 'Gộp'} vật tư - ${item.ghi_chu || ''}`;
    if (activeTab === 'construction_diaries')
      return `Nhật ký: ${item.work_progress || ''} (${formatDate(item.date)})`;
    return 'Không rõ';
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    const key = `${activeTab}-${id}`;
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => `${activeTab}-${i.id}`)));
    }
  };

  const handleRowClick = (item: any) => {
    setSelectedItem({ id: item.id, table: activeTab, code: getCode(item), name: getName(item) });
    setShowActionModal(true);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const isBom = selectedItem.table === 'boms';
      const actualTable =
        selectedItem.table === 'production_orders'
          ? 'lenh_san_xuat'
          : selectedItem.table === 'boms'
            ? 'san_pham_bom'
            : selectedItem.table === 'split_merge_history'
              ? 'xasa_gop_phieu'
              : selectedItem.table;

      const updateData = isBom ? { dang_hoat_dong: true } : { trang_thai: 'Chờ duyệt' };

      const { error } = await supabase
        .from(actualTable)
        .update(updateData)
        .eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast(`Đã khôi phục ${selectedItem.code} thành công!`, 'success');
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
      const actualTable =
        selectedItem.table === 'production_orders'
          ? 'lenh_san_xuat'
          : selectedItem.table === 'boms'
            ? 'san_pham_bom'
            : selectedItem.table === 'split_merge_history'
              ? 'xasa_gop_phieu'
              : selectedItem.table;

      // BOM configs have chi tiết taking cascade deletion or needing manual clean up.
      if (selectedItem.table === 'boms') {
        const { error: err1 } = await supabase
          .from('san_pham_bom_chi_tiet')
          .delete()
          .eq('san_pham_bom_id', selectedItem.id);
        if (err1) throw err1;
      }

      const { error } = await supabase.from(actualTable).delete().eq('id', selectedItem.id);
      if (error) {
        if (error.code === '23503' || error.message.includes('violates foreign key constraint')) {
          throw new Error('Dữ liệu đang được sử dụng, không thể xóa vĩnh viễn.');
        }
        throw error;
      }
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

  const bulkRestore = async () => {
    setSubmitting(true);
    try {
      const promises = Array.from(selectedIds).map((key) => {
        const [_, id] = key.split('-');
        return supabase.from(activeTab).update({ status: 'Chờ duyệt' }).eq('id', id);
      });
      await Promise.all(promises);
      if (addToast) addToast(`Đã khôi phục ${selectedIds.size} bản ghi thành công!`, 'success');
      fetchDeletedItems();
      setShowBulkRestoreModal(false);
      setSelectedIds(new Set());
    } catch (err: any) {
      if (addToast) addToast('Lỗi khôi phục hàng loạt: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const bulkDelete = async () => {
    setSubmitting(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const key of selectedIds) {
        const [_, id] = key.split('-');
        try {
          if (activeTab === 'bom_configs') {
            await supabase.from('bom_items').delete().eq('bom_id', id);
          }
          const { error } = await supabase.from(activeTab).delete().eq('id', id);
          if (!error) successCount++;
          else failCount++;
        } catch (e) {
          failCount++;
        }
      }

      if (addToast)
        addToast(`Đã xóa ${successCount} bản ghi. Thất bại/Bỏ qua ${failCount}.`, 'info');
      fetchDeletedItems();
      setShowBulkDeleteModal(false);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.warn(err);
    } finally {
      setSubmitting(false);
    }
  };

  const emptyTrash = async () => {
    setSubmitting(true);
    try {
      let count = 0;
      for (const item of items) {
        try {
          if (activeTab === 'bom_configs') {
            await supabase.from('bom_items').delete().eq('bom_id', item.id);
          }
          await supabase.from(activeTab).delete().eq('id', item.id);
          count++;
        } catch (e) {
          // skip if error
        }
      }
      if (addToast) addToast(`Đã dọn sạch ${count} bản ghi`, 'success');
      fetchDeletedItems();
      setShowEmptyTrashModal(false);
    } catch (err: any) {
      console.warn(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items
    .filter((w) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return getName(w).toLowerCase().includes(s) || getCode(w).toLowerCase().includes(s);
    })
    .sort((a, b) => {
      if (sortBy === 'code') return getCode(a).localeCompare(getCode(b));
      if (sortBy === 'newest')
        return (
          new Date(b.created_at || Date.now()).getTime() -
          new Date(a.created_at || Date.now()).getTime()
        );
      if (sortBy === 'name') return getName(a).localeCompare(getName(b), 'vi');
      return 0;
    });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Sản xuất đã xóa" onBack={onBack} />
        <div className="flex items-center gap-2">
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_trashProd_${user.id}`, val);
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'code', label: 'Mã' },
              { value: 'name', label: 'Tên/Mô tả (A-Z)' },
            ]}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-gray-100">
        {[
          { id: 'production_orders', label: 'Lệnh SX', icon: ClipboardList },
          { id: 'boms', label: 'Định mức', icon: Layers },
          { id: 'split_merge_history', label: 'Xả/Gộp', icon: Factory },
          { id: 'construction_diaries', label: 'Nhật ký thi công', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`whitespace-nowrap flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {filteredItems.length > 0 && (
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
              <Trash2 size={14} /> Dọn sạch mục này
            </button>
          )}
        </div>
      )}

      {/* Local Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Tìm mã, tên, mô tả..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo/20 outline-none bg-white shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                    <CheckSquare size={20} className="text-indigo-600" />
                  ) : (
                    <Square size={20} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Mã
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Tên / Mô tả
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
                    <RefreshCw size={16} className="animate-spin text-indigo-600" />
                    Đang tải danh sách...
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                  Không tìm thấy bản ghi nào
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const key = `${activeTab}-${item.id}`;
                const isSelected = selectedIds.has(key);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                    >
                      <div className="text-gray-400 hover:text-indigo-600 transition-colors">
                        {isSelected ? (
                          <CheckSquare size={20} className="text-indigo-600" />
                        ) : (
                          <Square size={20} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono font-bold text-indigo-600">
                      {getCode(item)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-bold">{getName(item)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({
                              id: item.id,
                              table: activeTab,
                              code: getCode(item),
                              name: getName(item),
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
                              table: activeTab,
                              code: getCode(item),
                              name: getName(item),
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
                Đối tượng: <span className="font-black text-indigo-600">{selectedItem.code}</span>
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

      <ConfirmModal
        show={showDeleteModal}
        title="Xác nhận xóa?"
        message={`Bạn đang xóa vĩnh viễn [${selectedItem?.code}] - [${selectedItem?.name}]. Hành động này không thể hoàn tác!`}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        type="danger"
        isLoading={submitting}
      />

      <ConfirmModal
        show={showRestoreModal}
        title="Khôi phục dữ liệu?"
        message={`Khôi phục [${selectedItem?.code}] về trạng thái chờ duyệt?`}
        onConfirm={confirmRestore}
        onCancel={() => setShowRestoreModal(false)}
        type="success"
        isLoading={submitting}
      />

      <ConfirmModal
        show={showBulkRestoreModal}
        title="Khôi phục đã chọn?"
        message={`Bạn muốn khôi phục ${selectedIds.size} bản ghi?`}
        onConfirm={bulkRestore}
        onCancel={() => setShowBulkRestoreModal(false)}
        type="success"
        isLoading={submitting}
      />
      <ConfirmModal
        show={showBulkDeleteModal}
        title="Xóa vĩnh viễn đã chọn?"
        message={`Hành động này sẽ xóa vĩnh viễn ${selectedIds.size} bản ghi khỏi hệ thống.`}
        onConfirm={bulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
        type="danger"
        isLoading={submitting}
      />
      <ConfirmModal
        show={showEmptyTrashModal}
        title="Dọn sạch thùng rác?"
        message="Xác nhận xóa VĨNH VIỄN toàn bộ danh sách ở tab này?"
        onConfirm={emptyTrash}
        onCancel={() => setShowEmptyTrashModal(false)}
        type="danger"
        isLoading={submitting}
      />
    </div>
  );
};
