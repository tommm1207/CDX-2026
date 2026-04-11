import { useState, useEffect, FormEvent, MouseEvent, ChangeEvent } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Package,
  Eye,
  Image as ImageIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { isActiveWarehouse } from '@/utils/inventory';
import { ToastType } from '../shared/Toast';
import { FAB } from '../shared/FAB';
import { checkUsage } from '@/utils/dataIntegrity';

export const MaterialGroups = ({
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
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showMaterialDetailModal, setShowMaterialDetailModal] = useState(false);

  const [groups, setGroups] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'group' | 'material'>('group');

  const initialFormState = { id: '', code: '', name: '', notes: '' };
  const initialMaterialFormState = {
    id: '',
    name: '',
    group_id: '',
    warehouse_id: '',
    specification: '',
    unit: '',
    description: '',
    image_url: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [materialFormData, setMaterialFormData] = useState(initialMaterialFormState);

  useEffect(() => {
    fetchGroups();
    fetchWarehouses();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('material_groups')
      .select('*')
      .or('status.is.null,status.neq.Đã xóa')
      .order('id', { ascending: true });
    if (data) setGroups(data);
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase
      .from('warehouses')
      .select('*')
      .or('status.is.null,status.neq.Đã xóa')
      .order('name');
    if (data) {
      setWarehouses(data.filter(isActiveWarehouse));
    }
  };

  // Nhận group object trực tiếp để tránh lỗi stale state (selectedGroup chưa cập nhật kịp)
  const fetchMaterialsByGroup = async (groupId: string, groupObj?: any) => {
    setMaterialsLoading(true);
    try {
      // 1. Fetch theo group_id (UUID)
      const { data, error } = await supabase
        .from('materials')
        .select('*, warehouses(name), material_groups(name)')
        .eq('group_id', groupId)
        .or('status.is.null,status.neq.Đã xóa')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Fallback: Nếu không có kết quả, lọc theo tên nhóm
      // groupObj được truyền trực tiếp để đảm bảo dùng đúng giá trị mới nhất
      const groupName = groupObj?.name ?? selectedGroup?.name;
      if ((!data || data.length === 0) && groupName) {
        const { data: allMats, error: allError } = await supabase
          .from('materials')
          .select('*, warehouses(name), material_groups(name)')
          .order('created_at', { ascending: false });

        if (!allError && allMats) {
          const filtered = allMats.filter(
            (m) =>
              m.group_id === groupId ||
              m.material_groups?.name?.toLowerCase() === groupName.toLowerCase(),
          );

          if (filtered.length > 0) {
            setMaterials(filtered);
            setMaterialsLoading(false);
            return;
          }
        }
      }

      setMaterials(data || []);
    } catch (err: any) {
      console.error('Error fetching materials:', err);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const generateNextGroupCode = async () => {
    const random = Math.floor(100 + Math.random() * 900);
    try {
      const { data } = await supabase
        .from('material_groups')
        .select('code')
        .like('code', 'VAT%')
        .order('code', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].code) {
        const lastCode = data[0].code;
        const match = lastCode.match(/VAT(\d+)/);
        if (match && match[1]) {
          const nextNumber = parseInt(match[1]) + 1;
          return `VAT${nextNumber.toString().padStart(3, '0')}`;
        }
      }
      return `VAT001`;
    } catch (err) {
      console.error('Error generating group code:', err);
      return `VAT001`;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('material_groups')
          .update({
            name: formData.name,
            notes: formData.notes,
          })
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const generatedCode = await generateNextGroupCode();
        const { error } = await supabase.from('material_groups').insert([
          {
            code: generatedCode,
            name: formData.name,
            notes: formData.notes,
          },
        ]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchGroups();
      setFormData(initialFormState);
      if (addToast)
        addToast(isEditing ? 'Cập nhật nhóm thành công!' : 'Thêm nhóm thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaterialSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditingMaterial) {
        const { id, ...rest } = materialFormData;
        const dataToSubmit = { ...rest, group_id: selectedGroup.id };
        const { error } = await supabase.from('materials').update(dataToSubmit).eq('id', id);
        if (error) throw error;
      } else {
        const { id, ...rest } = materialFormData;
        const dataToSubmit = { ...rest, group_id: selectedGroup.id };
        const { error } = await supabase.from('materials').insert([dataToSubmit]);
        if (error) throw error;
      }
      setShowMaterialModal(false);
      fetchMaterialsByGroup(selectedGroup.id);
      setMaterialFormData(initialMaterialFormState);
      if (addToast)
        addToast(
          isEditingMaterial ? 'Cập nhật vật tư thành công!' : 'Thêm vật tư thành công!',
          'success',
        );
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (group: any) => {
    setSelectedGroup(group);
    // Truyền group trực tiếp để tránh stale state trong fetchMaterialsByGroup
    fetchMaterialsByGroup(group.id, group);
    setShowDetailModal(true);
  };

  const handleEdit = async (e: MouseEvent, item: any) => {
    e.stopPropagation();

    setFormData({
      id: item.id,
      code: item.code || '',
      name: item.name,
      notes: item.notes || '',
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleEditMaterial = async (item: any) => {
    const usage = await checkUsage('material', item.id);
    if (usage.inUse && addToast) {
      addToast(`Vật tư đang được sử dụng — một số trường sẽ bị khóa.`, 'info');
    }

    setMaterialFormData({ ...item, _inUse: usage.inUse });
    setIsEditingMaterial(true);
    setShowMaterialModal(true);
  };

  const handleDeleteClick = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete(id);
    setDeleteType('group');
    setShowDeleteModal(true);
  };

  const handleDeleteMaterialClick = (id: string) => {
    setItemToDelete(id);
    setDeleteType('material');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (deleteType === 'group') {
        // Check for linked materials first
        const { count, error: checkError } = await supabase
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', itemToDelete);

        if (checkError) throw checkError;

        if (count && count > 0) {
          if (addToast)
            addToast(`Không thể xóa nhóm này vì đang có ${count} vật tư thuộc nhóm.`, 'error');
          else
            alert(
              `Không thể xóa nhóm này vì đang có ${count} vật tư thuộc nhóm. Vui lòng xóa hoặc chuyển các vật tư này sang nhóm khác trước.`,
            );
          setShowDeleteModal(false);
          return;
        }

        // Double check with integrity helper
        const usage = await checkUsage('group', itemToDelete);
        if (usage.inUse) {
          if (addToast) addToast(`Nhóm đang được sử dụng, không thể xóa.`, 'error');
          setShowDeleteModal(false);
          return;
        }

        const { error } = await supabase
          .from('material_groups')
          .update({ status: 'Đã xóa' })
          .eq('id', itemToDelete);
        if (error) throw error;
        fetchGroups();
      } else {
        // Material delete usage check
        const usage = await checkUsage('material', itemToDelete);
        if (usage.inUse) {
          if (addToast) addToast(`Vật tư đang được sử dụng, không thể xóa.`, 'error');
          setShowDeleteModal(false);
          return;
        }

        const { error } = await supabase
          .from('materials')
          .update({ status: 'Đã xóa' })
          .eq('id', itemToDelete);
        if (error) throw error;
        fetchMaterialsByGroup(selectedGroup.id);
      }
      if (addToast) addToast('Đã chuyển dữ liệu vào thùng rác!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    }
    setShowDeleteModal(false);
  };

  const handleMaterialImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMaterialFormData({ ...materialFormData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const uniqueMaterialIds = Array.from(new Set(materials.map((m) => m.id)));

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Nhóm vật tư" onBack={onBack} />
        <button
          onClick={() => setShowFilter((f) => !f)}
          className={`p-2.5 rounded-xl border transition-colors ${
            showFilter
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
          }`}
        >
          <Search size={16} />
        </button>
      </div>

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhóm vật tư..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FAB
        onClick={async () => {
          const nextCode = await generateNextGroupCode();
          setFormData({ ...initialFormState, code: nextCode });
          setIsEditing(false);
          setShowModal(true);
        }}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 w-32">
                  Mã nhóm
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">
                  Nhóm vật tư
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">
                  Ghi chú
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-24">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                    Chưa có nhóm vật tư nào
                  </td>
                </tr>
              ) : (
                filteredGroups.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">
                      {item.code || item.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic">{item.notes || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 transition-opacity">
                        <button
                          onClick={(e) => handleEdit(e, item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, item.id)}
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

      <AnimatePresence>
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Bạn có chắc chắn muốn xóa {deleteType === 'group' ? 'nhóm vật tư' : 'vật tư'}? Hành
                động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col my-8 m-4 overflow-hidden relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-[2rem] md:rounded-t-[2.5rem] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowModal(false)}
                  >
                    <Layers size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {isEditing ? 'Cập nhật nhóm' : 'Thêm nhóm'}
                    </h3>
                    <p className="text-xs text-white/70">Mã nhóm tự động sinh</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Mã nhóm vật tư
                    </label>
                    <input
                      required
                      disabled
                      type="text"
                      placeholder="Hệ thống tự động sinh..."
                      value={formData.code}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Tên nhóm vật tư *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ví dụ: Tôn, sắt, thép..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                    <textarea
                      rows={3}
                      placeholder="Thông tin thêm về nhóm này..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <div className="mt-8 flex justify-end gap-3 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailModal && selectedGroup && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col my-8 m-4 overflow-hidden relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-[2rem] md:rounded-t-[2.5rem] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowDetailModal(false)}
                  >
                    <Layers size={24} />
                  </div>
                  <h3 className="text-xl font-bold uppercase tracking-widest">
                    Chi tiết nhóm vật tư
                  </h3>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Mã nhóm vật tư
                    </label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                      {selectedGroup.code || selectedGroup.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Nhóm vật tư
                    </label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                      {selectedGroup.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                        <Package size={16} />
                      </div>
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Danh mục vật tư trong nhóm
                      </h4>
                      <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                        {materials.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setMaterialFormData(initialMaterialFormState);
                        setIsEditingMaterial(false);
                        setShowMaterialModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={14} /> Thêm dòng
                    </button>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-primary text-white text-[10px] uppercase font-bold tracking-wider">
                          <th className="px-4 py-2 border-r border-white/10">Mã vật tư</th>
                          <th className="px-4 py-2 border-r border-white/10">Tên vật tư</th>
                          <th className="px-4 py-2 border-r border-white/10">Kho</th>
                          <th className="px-4 py-2 border-r border-white/10">Quy cách</th>
                          <th className="px-4 py-2 text-center w-24">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {materialsLoading ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                              Đang tải vật tư...
                            </td>
                          </tr>
                        ) : materials.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                              Nhóm này chưa có vật tư nào
                            </td>
                          </tr>
                        ) : (
                          materials.map((mat) => (
                            <tr
                              key={mat.id}
                              className="hover:bg-gray-50 transition-colors group cursor-pointer"
                              onClick={() => {
                                setSelectedMaterial(mat);
                                setShowMaterialDetailModal(true);
                              }}
                            >
                              <td className="px-4 py-2 text-xs font-medium text-gray-700">
                                {mat.code || mat.id.slice(0, 8)}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-600">{mat.name}</td>
                              <td className="px-4 py-2 text-xs text-gray-500">
                                {mat.warehouses?.name || '-'}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-500">
                                {mat.specification || '-'}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMaterial(mat);
                                      setShowMaterialDetailModal(true);
                                    }}
                                    className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditMaterial(mat);
                                    }}
                                    className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMaterialClick(mat.id);
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
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
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={(e) => handleDeleteClick(e, selectedGroup.id)}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Trash2 size={16} /> Xóa
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={(e) => handleEdit(e, selectedGroup)}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors shadow-lg shadow-yellow-500/20"
                  >
                    <Edit size={16} /> Sửa
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded-xl text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg shadow-gray-500/20"
                  >
                    <X size={16} /> Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMaterialModal && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowMaterialModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8 m-4 overflow-hidden relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-blue-600 p-6 text-white flex items-center justify-between rounded-t-[2rem] md:rounded-t-[2.5rem] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowMaterialModal(false)}
                  >
                    <Package size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {isEditingMaterial ? 'Cập nhật vật tư' : 'Thêm vật tư mới'}
                    </h3>
                    <p className="text-xs text-white/70">Thuộc nhóm: {selectedGroup?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMaterialModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form
                  onSubmit={handleMaterialSubmit}
                  className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Mã vật tư *
                    </label>
                    <div className="relative">
                      <input
                        list="material-ids-group"
                        required
                        type="text"
                        value={materialFormData.code || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMaterialFormData({ ...materialFormData, code: val });
                          const existing = materials.find((m) => m.code === val);
                          if (existing) {
                            setMaterialFormData({ ...existing, code: val });
                          }
                        }}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <datalist id="material-ids-group">
                        {uniqueMaterialIds.map((code) => (
                          <option key={code} value={code} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Tên vật tư *
                    </label>
                    <input
                      required
                      type="text"
                      value={materialFormData.name}
                      onChange={(e) =>
                        setMaterialFormData({ ...materialFormData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Kho lưu trữ
                    </label>
                    <select
                      value={materialFormData.warehouse_id}
                      onChange={(e) =>
                        setMaterialFormData({ ...materialFormData, warehouse_id: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Chọn kho --</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Quy cách
                    </label>
                    <input
                      type="text"
                      value={materialFormData.specification}
                      onChange={(e) =>
                        setMaterialFormData({ ...materialFormData, specification: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Đơn vị tính
                    </label>
                    <input
                      type="text"
                      value={materialFormData.unit}
                      onChange={(e) =>
                        setMaterialFormData({ ...materialFormData, unit: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả</label>
                    <textarea
                      rows={2}
                      value={materialFormData.description}
                      onChange={(e) =>
                        setMaterialFormData({ ...materialFormData, description: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Hình ảnh vật tư
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group relative">
                        {materialFormData.image_url ? (
                          <>
                            <img
                              src={materialFormData.image_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setMaterialFormData({ ...materialFormData, image_url: '' })
                              }
                              className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <ImageIcon className="text-gray-300" size={20} />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          id="group-material-image"
                          accept="image/*"
                          onChange={handleMaterialImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="group-material-image"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-gray-200 cursor-pointer transition-colors"
                        >
                          <ImageIcon size={12} /> Tải ảnh
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowMaterialModal(false)}
                      className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu vật tư'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMaterialDetailModal && selectedMaterial && (
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowMaterialDetailModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col my-8 m-4 overflow-hidden relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-[2rem] md:rounded-t-[2.5rem] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowMaterialDetailModal(false)}
                  >
                    <Package size={24} />
                  </div>
                  <h3 className="text-xl font-bold uppercase tracking-widest">Chi tiết vật tư</h3>
                </div>
                <button
                  onClick={() => setShowMaterialDetailModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Mã vật tư
                    </label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                      {selectedMaterial.code || selectedMaterial.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Tên vật tư
                    </label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                      {selectedMaterial.name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Kho lưu trữ
                    </label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                      {selectedMaterial.warehouses?.name || '-'}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Quy cách
                    </label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                      {selectedMaterial.specification || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Nhóm vật tư
                    </label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                      {selectedGroup?.name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Đơn vị tính
                    </label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                      {selectedMaterial.unit || '-'}
                    </p>
                  </div>
                </div>

                {selectedMaterial.image_url && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Hình ảnh
                    </label>
                    <div className="w-full h-48 rounded-2xl overflow-hidden border border-gray-100">
                      <img
                        src={selectedMaterial.image_url}
                        alt={selectedMaterial.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowMaterialDetailModal(false);
                    handleDeleteMaterialClick(selectedMaterial.id);
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Trash2 size={16} /> Xóa
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowMaterialDetailModal(false);
                      handleEditMaterial(selectedMaterial);
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors shadow-lg shadow-yellow-500/20"
                  >
                    <Edit size={16} /> Sửa
                  </button>
                  <button
                    onClick={() => setShowMaterialDetailModal(false)}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded-xl text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg shadow-gray-500/20"
                  >
                    <X size={16} /> Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
