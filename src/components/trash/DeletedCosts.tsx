import { useState, useEffect } from 'react';
import {
  DollarSign,
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
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ToastType } from '../shared/Toast';
import { Button } from '../shared/Button';
import { SortButton, SortOption } from '../shared/SortButton';
import { formatCurrency } from '@/utils/format';
import { checkUsage, UsageResult } from '@/utils/dataIntegrity';
import { purgeDependencies } from '@/utils/dataFixer';

export const DeletedCosts = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack: () => void;
  addToast: (msg: string, type?: ToastType) => void;
}) => {
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_trashCosts_${user.id}`) as SortOption) || 'newest',
  );
  const [showFilter, setShowFilter] = useState(false);
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
    code?: string;
    amount?: number;
  } | null>(null);

  useEffect(() => {
    fetchDeletedCosts();
  }, []);

  const fetchDeletedCosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('costs').select('*').eq('status', 'Đã xóa');
      if (error) throw error;
      setCosts(data || []);
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
    if (selectedIds.size === costs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(costs.map((c) => c.id)));
  };

  const handleRowClick = (item: any) => {
    setSelectedItem({ id: item.id, code: item.cost_code, amount: item.total_amount });
    setShowActionModal(true);
  };

  const handleDeleteClick = async (item: any) => {
    setSelectedItem({ id: item.id, code: item.cost_code, amount: item.total_amount });
    setShowActionModal(false);
    setShowDeleteModal(true);
    setShowUsageDetails(false);
    setUsageInfo({ inUse: false, tables: [], details: [] });
    try {
      const usage = await checkUsage('material', item.id); // Costs usually link to materials or employees
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
        .from('costs')
        .update({ status: 'Chờ duyệt' })
        .eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast(`Đã khôi phục chi phí ${selectedItem.code} thành công!`, 'success');
      fetchDeletedCosts();
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
      // Costs don't have many dependencies usually, but the standard delete works
      const { error } = await supabase.from('costs').delete().eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast('Đã xóa vĩnh viễn chi phí thành công!', 'success');
      fetchDeletedCosts();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa vĩnh viễn: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCosts = costs
    .filter((c) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        (c.code || '').toLowerCase().includes(s) ||
        (c.description || '').toLowerCase().includes(s) ||
        (c.category || '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest')
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
      if (sortBy === 'price') return (b.amount || 0) - (a.amount || 0);
      return 0;
    });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Chi phí đã xóa" onBack={onBack} />
        <div className="flex items-center gap-2">
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_trashCosts_${user.id}`, val);
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'code', label: 'Mã chi phí' },
              { value: 'price', label: 'Giá trị' },
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
            className="overflow-hidden"
          >
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm</label>
              <input
                type="text"
                placeholder="Mã, mô tả, danh mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 text-gray-400 hover:text-primary transition-colors"
                >
                  {selectedIds.size === filteredCosts.length && filteredCosts.length > 0 ? (
                    <CheckSquare size={20} className="text-primary" />
                  ) : (
                    <Square size={20} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Mã chi phí
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Giá trị
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
            ) : filteredCosts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                  {searchTerm ? 'Không tìm thấy kết quả' : 'Thùng rác trống'}
                </td>
              </tr>
            ) : (
              filteredCosts.map((item) => {
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
                      {item.cost_code || item.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-bold">
                      {formatCurrency(item.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({
                              id: item.id,
                              code: item.cost_code,
                              amount: item.total_amount,
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
                  Mã chi phí: <strong className="text-primary">{selectedItem.code}</strong>
                </p>
                <p>
                  Số tiền:{' '}
                  <strong className="text-primary">{formatCurrency(selectedItem.amount)}</strong>
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
                    Xác nhận xóa
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        show={showRestoreModal}
        title="Khôi phục chi phí?"
        message={`Khôi phục chi phí ${selectedItem?.code} về danh sách chính?`}
        onConfirm={confirmRestore}
        onCancel={() => setShowRestoreModal(false)}
        type="success"
        isLoading={submitting}
      />
    </div>
  );
};
