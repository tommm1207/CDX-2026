import { CanvasLogo } from '@/components/shared/ReportExportHeader';
import { exportTableImage } from '../../utils/reportExport';
import { useState, useEffect, FormEvent, MouseEvent } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Wallet,
  Eye,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useRef } from 'react';

import { SaveImageButton } from '../shared/SaveImageButton';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee, CostGroup, CostItem } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { checkUsage } from '@/utils/dataIntegrity';
import { SortButton, SortOption } from '../shared/SortButton';
import { Button } from '../shared/Button';
import { FAB } from '../shared/FAB';

export const CostGroups = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  const [groups, setGroups] = useState<CostGroup[]>([]);
  const [items, setItems] = useState<CostItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CostGroup | null>(null);

  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [isCapturingTable, setIsCapturingTable] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'group' | 'item'>('group');
  const [usageInfo, setUsageInfo] = useState<any>({ inUse: false, details: [] });

  const initialFormState = { id: '', code: '', name: '', notes: '' };
  const initialItemFormState = {
    id: '',
    name: '',
    group_id: '',
    unit: 'Lần',
    notes: '',
    code: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [itemFormData, setItemFormData] = useState(initialItemFormState);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cost_groups')
      .select(
        `
        *,
        cost_items(id, status)
      `,
      )
      .or('status.is.null,status.neq.Đã xóa')
      .order('code', { ascending: true });
    if (data) {
      const groupsWithCount = data.map((g: any) => ({
        ...g,
        items_count: (g.cost_items || []).filter((i: any) => i.status !== 'Đã xóa').length,
      }));
      setGroups(groupsWithCount);
    }
    setLoading(false);
  };

  const fetchItemsByGroup = async (groupId: string) => {
    setItemsLoading(true);
    const { data } = await supabase
      .from('cost_items')
      .select('*')
      .eq('group_id', groupId)
      .or('status.is.null,status.neq.Đã xóa')
      .order('code', { ascending: true });
    if (data) setItems(data);
    setItemsLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('cost_groups')
          .update({
            name: formData.name,
            notes: formData.notes,
          })
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const code = `CG${(groups.length + 1).toString().padStart(3, '0')}`;
        const { error } = await supabase.from('cost_groups').insert([
          {
            code,
            name: formData.name,
            notes: formData.notes,
          },
        ]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchGroups();
      setFormData(initialFormState);
      if (addToast) addToast('Thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditingItem) {
        const { error } = await supabase
          .from('cost_items')
          .update({
            name: itemFormData.name,
            unit: itemFormData.unit,
            notes: itemFormData.notes,
          })
          .eq('id', itemFormData.id);
        if (error) throw error;
      } else {
        const code = `CI${(items.length + 1).toString().padStart(3, '0')}`;
        const { error } = await supabase.from('cost_items').insert([
          {
            group_id: selectedGroup?.id,
            code,
            name: itemFormData.name,
            unit: itemFormData.unit,
            notes: itemFormData.notes,
          },
        ]);
        if (error) throw error;
      }
      setShowItemModal(false);
      if (selectedGroup) fetchItemsByGroup(selectedGroup.id);
      setItemFormData(initialItemFormState);
      if (addToast) addToast('Thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (group: CostGroup) => {
    setSelectedGroup(group);
    fetchItemsByGroup(group.id);
    setShowDetailModal(true);
  };

  const handleEdit = (e: MouseEvent, group: CostGroup) => {
    e.stopPropagation();
    setFormData({
      id: group.id,
      code: group.code || '',
      name: group.name,
      notes: group.notes || '',
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = async (e: MouseEvent, id: string, type: 'group' | 'item' = 'group') => {
    e.stopPropagation();
    setItemToDelete(id);
    setDeleteType(type);
    setShowDeleteModal(true);
    setUsageInfo({ inUse: false, details: [] }); // Reset
    const usage = await checkUsage(type === 'group' ? 'group' : 'cost_item', id);
    setUsageInfo(usage);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setSubmitting(true);
    try {
      const table = deleteType === 'group' ? 'cost_groups' : 'cost_items';
      const { error } = await supabase
        .from(table)
        .update({ status: 'Đã xóa' })
        .eq('id', itemToDelete);
      if (error) throw error;

      if (deleteType === 'group') {
        fetchGroups();
        setShowDetailModal(false);
      } else {
        if (selectedGroup) fetchItemsByGroup(selectedGroup.id);
      }
      if (addToast) addToast('Đã xóa', 'success');
      setShowDeleteModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between gap-2 mb-4">
        <PageBreadcrumb title="Nhóm chi phí" onBack={onBack} />
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter(!showFilter)}
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
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhóm chi phí..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Mã</th>
                <th className="px-6 py-4">Tên nhóm</th>
                <th className="px-6 py-4 text-center">Số mục chi tiết</th>
                <th className="px-6 py-4">Ghi chú</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr
                    key={group.id}
                    onClick={() => handleRowClick(group)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-primary">{group.code}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{group.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase">
                        {(group as any).items_count || 0} mục
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{group.notes || '---'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => handleEdit(e, group)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, group.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm/Sửa Nhóm */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers size={24} />
                  <h3 className="font-bold text-lg">{isEditing ? 'Sửa nhóm' : 'Thêm nhóm'}</h3>
                </div>
                <button onClick={() => setShowModal(false)}>
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Tên nhóm *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Ví dụ: Chi phí cố định"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    placeholder="Thông tin thêm..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" isLoading={submitting}>
                    Lưu
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Chi tiết nhóm & Chi phí chi tiết */}
      <AnimatePresence>
        {showDetailModal && selectedGroup && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet size={24} />
                  <div>
                    <h3 className="font-bold text-lg">{selectedGroup.name}</h3>
                    <p className="text-xs text-white/70">{selectedGroup.code}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-700 uppercase tracking-widest text-xs flex items-center gap-2">
                    <Plus size={16} className="text-primary" /> Chi phí chi tiết
                  </h4>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setIsEditingItem(false);
                      setItemFormData({ ...initialItemFormState, group_id: selectedGroup.id });
                      setShowItemModal(true);
                    }}
                    icon={Plus}
                  >
                    Thêm dòng
                  </Button>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400">
                        <th className="px-4 py-3">Mã</th>
                        <th className="px-4 py-3">Tên chi phí</th>
                        <th className="px-4 py-3">Đơn vị</th>
                        <th className="px-4 py-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {itemsLoading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                            Đang tải...
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-400 italic">
                            Chưa có chi tiết chi phí
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-bold text-primary">
                              {item.code}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setIsEditingItem(true);
                                    setItemFormData({
                                      id: item.id,
                                      name: item.name,
                                      group_id: item.group_id || '',
                                      unit: item.unit || 'Lần',
                                      notes: item.notes || '',
                                      code: item.code || '',
                                    });
                                    setShowItemModal(true);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(e, item.id, 'item');
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Thêm/Sửa Chi tiết chi phí */}
      <AnimatePresence>
        {showItemModal && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowItemModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg">
                  {isEditingItem ? 'Sửa chi phí chi tiết' : 'Thêm chi phí chi tiết'}
                </h3>
                <button onClick={() => setShowItemModal(false)}>
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleItemSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Tên chi phí *
                  </label>
                  <input
                    required
                    type="text"
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Ví dụ: Tiền điện kho"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Đơn vị tính
                  </label>
                  <input
                    type="text"
                    value={itemFormData.unit}
                    onChange={(e) => setItemFormData({ ...itemFormData, unit: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Lần, Tháng, VND..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowItemModal(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" isLoading={submitting}>
                    Lưu
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Xác nhận xóa */}
      <AnimatePresence>
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {usageInfo.inUse ? 'Không thể xóa!' : 'Xác nhận xóa?'}
              </h3>

              {usageInfo.inUse ? (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6 text-left">
                  <p className="text-xs text-amber-800 font-bold mb-2 uppercase flex items-center gap-2">
                    <AlertCircle size={14} /> Dữ liệu đang được sử dụng tại:
                  </p>
                  <ul className="space-y-1">
                    {usageInfo.details.map((d: any, idx: number) => (
                      <li key={idx} className="text-xs text-amber-700 flex justify-between">
                        <span>• {d.label}</span>
                        <span className="font-bold">{d.count + d.softDeletedCount} bản ghi</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-amber-600 mt-3 italic">
                    * Bạn cần xóa hoặc chuyển các dữ liệu liên quan trước khi xóa{' '}
                    {deleteType === 'group' ? 'nhóm' : 'hạng mục'} này.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-6 italic">
                  Hành động này sẽ chuyển {deleteType === 'group' ? 'nhóm' : 'hạng mục'} này vào
                  thùng rác.
                </p>
              )}

              <div className="flex gap-3">
                <Button fullWidth variant="outline" onClick={() => setShowDeleteModal(false)}>
                  {usageInfo.inUse ? 'Đóng' : 'Hủy'}
                </Button>
                {!usageInfo.inUse && (
                  <Button fullWidth variant="danger" onClick={confirmDelete} isLoading={submitting}>
                    Xác nhận xóa
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FAB
        onClick={() => {
          setIsEditing(false);
          setFormData(initialFormState);
          setShowModal(true);
        }}
        icon={Plus}
        label="Thêm nhóm"
      />
    </div>
  );
};
