import { useState, useEffect, FormEvent, MouseEvent, ChangeEvent } from 'react';
import { Layers, Plus, Search, Edit, Trash2, X, Package, Eye, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';

export const MaterialGroups = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'group' | 'material'>('group');

  const initialFormState = { id: '', name: '', notes: '' };
  const initialMaterialFormState = {
    id: '',
    name: '',
    group_id: '',
    warehouse_id: '',
    specification: '',
    unit: '',
    description: '',
    image_url: ''
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
      .order('id', { ascending: true });
    if (data) setGroups(data);
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterialsByGroup = async (groupId: string) => {
    setMaterialsLoading(true);
    const { data, error } = await supabase
      .from('materials')
      .select('*, warehouses(name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching materials:', error);
    }
    if (data) setMaterials(data);
    setMaterialsLoading(false);
  };

  const generateNextGroupCode = async () => {
    const random = Math.floor(100 + Math.random() * 900);
    try {
      const { data } = await supabase
        .from('material_groups')
        .select('code')
        .like('code', 'MAT%')
        .order('code', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].code) {
        const lastCode = data[0].code;
        const match = lastCode.match(/MAT(\d+)/);
        if (match && match[1]) {
          const nextNumber = parseInt(match[1]) + 1;
          return `MAT${nextNumber.toString().padStart(3, '0')}-${random}`;
        }
      }
      return `MAT001-${random}`;
    } catch (err) {
      console.error('Error generating group code:', err);
      return `MAT001-${random}`;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        const { error } = await supabase.from('material_groups').update({
          name: formData.name,
          notes: formData.notes
        }).eq('id', formData.id);
        if (error) throw error;
      } else {
        const generatedCode = await generateNextGroupCode();
        const { error } = await supabase.from('material_groups').insert([{
          code: generatedCode,
          name: formData.name,
          notes: formData.notes
        }]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchGroups();
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaterialSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dataToSubmit = { ...materialFormData, group_id: selectedGroup.id };
      if (isEditingMaterial) {
        const { error } = await supabase.from('materials').update(dataToSubmit).eq('id', materialFormData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materials').insert([dataToSubmit]);
        if (error) throw error;
      }
      setShowMaterialModal(false);
      fetchMaterialsByGroup(selectedGroup.id);
      setMaterialFormData(initialMaterialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (group: any) => {
    setSelectedGroup(group);
    fetchMaterialsByGroup(group.id);
    setShowDetailModal(true);
  };

  const handleEdit = (e: MouseEvent, item: any) => {
    e.stopPropagation();
    setFormData({
      id: item.id,
      name: item.name,
      notes: item.notes || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleEditMaterial = (item: any) => {
    setMaterialFormData(item);
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
          alert(`Không thể xóa nhóm này vì đang có ${count} vật tư thuộc nhóm. Vui lòng xóa hoặc chuyển các vật tư này sang nhóm khác trước.`);
          setShowDeleteModal(false);
          return;
        }

        const { error } = await supabase.from('material_groups').delete().eq('id', itemToDelete);
        if (error) throw error;
        fetchGroups();
      } else {
        const { error } = await supabase.from('materials').delete().eq('id', itemToDelete);
        if (error) throw error;
        fetchMaterialsByGroup(selectedGroup.id);
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
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

  const uniqueMaterialIds = Array.from(new Set(materials.map(m => m.id)));

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Nhóm vật tư" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-primary" /> Nhóm vật tư
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý phân loại danh mục vật tư hệ thống</p>
        </div>
        <button
          onClick={() => { setFormData(initialFormState); setIsEditing(false); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
          <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
          <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự</label>
          <select className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Tất cả --</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
          <select className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Tất cả kho --</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Gõ để tìm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 w-32">Mã nhóm</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Nhóm vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredGroups.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Chưa có nhóm vật tư nào</td></tr>
              ) : (
                filteredGroups.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{item.code || item.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic">{item.notes || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 transition-opacity">
                        <button onClick={(e) => handleEdit(e, item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                        <button onClick={(e) => handleDeleteClick(e, item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
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
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa {deleteType === 'group' ? 'nhóm vật tư' : 'vật tư'}? Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">Hủy bỏ</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">Xóa ngay</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col my-8"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Layers size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật nhóm' : 'Thêm nhóm vật tư'}</h3>
                    <p className="text-xs text-white/70">Mã nhóm sẽ được hệ thống tự động sinh</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tên nhóm vật tư *</label>
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
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
                <div className="text-center flex-1">
                  <h3 className="text-xl font-bold text-primary uppercase tracking-widest">Chi tiết nhóm vật tư</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã nhóm vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedGroup.code || selectedGroup.id.slice(0, 8)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedGroup.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 text-primary rounded-lg"><Package size={16} /></div>
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Danh mục vật tư trong nhóm</h4>
                      <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">{materials.length}</span>
                    </div>
                    <button
                      onClick={() => { setMaterialFormData(initialMaterialFormState); setIsEditingMaterial(false); setShowMaterialModal(true); }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={14} /> Thêm dòng
                    </button>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-primary text-white">
                          <th className="px-4 py-2 text-[10px] font-bold uppercase border-r border-white/10">Mã vật tư</th>
                          <th className="px-4 py-2 text-[10px] font-bold uppercase border-r border-white/10">Tên vật tư</th>
                          <th className="px-4 py-2 text-[10px] font-bold uppercase border-r border-white/10">Kho</th>
                          <th className="px-4 py-2 text-[10px] font-bold uppercase border-r border-white/10">Quy cách</th>
                          <th className="px-4 py-2 text-[10px] font-bold uppercase text-center w-24">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {materialsLoading ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Đang tải vật tư...</td></tr>
                        ) : materials.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Nhóm này chưa có vật tư nào</td></tr>
                        ) : (
                          materials.map((mat) => (
                            <tr key={mat.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-4 py-2 text-xs font-medium text-gray-700">{mat.code || mat.id.slice(0, 8)}</td>
                              <td className="px-4 py-2 text-xs text-gray-600">{mat.name}</td>
                              <td className="px-4 py-2 text-xs text-gray-500">{mat.warehouses?.name || '-'}</td>
                              <td className="px-4 py-2 text-xs text-gray-500">{mat.specification || '-'}</td>
                              <td className="px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => { setSelectedMaterial(mat); setShowMaterialDetailModal(true); }} className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"><Eye size={14} /></button>
                                  <button onClick={() => handleEditMaterial(mat)} className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"><Edit size={14} /></button>
                                  <button onClick={() => handleDeleteMaterialClick(mat.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
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
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8"
            >
              <div className="bg-blue-600 p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Package size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditingMaterial ? 'Cập nhật vật tư' : 'Thêm vật tư mới'}</h3>
                    <p className="text-xs text-white/70">Thuộc nhóm: {selectedGroup?.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowMaterialModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleMaterialSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư (ID) *</label>
                    <div className="relative">
                      <input
                        list="material-ids-group"
                        required
                        type="text"
                        value={materialFormData.id}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMaterialFormData({ ...materialFormData, id: val });
                          const existing = materials.find(m => m.id === val);
                          if (existing) {
                            setMaterialFormData(existing);
                          }
                        }}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <datalist id="material-ids-group">
                        {uniqueMaterialIds.map(id => <option key={id} value={id} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư *</label>
                    <input
                      required
                      type="text"
                      value={materialFormData.name}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Kho lưu trữ</label>
                    <select
                      value={materialFormData.warehouse_id}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, warehouse_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Chọn kho --</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách</label>
                    <input
                      type="text"
                      value={materialFormData.specification}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, specification: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                    <input
                      type="text"
                      value={materialFormData.unit}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, unit: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả</label>
                    <textarea
                      rows={2}
                      value={materialFormData.description}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Hình ảnh vật tư</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group relative">
                        {materialFormData.image_url ? (
                          <>
                            <img src={materialFormData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setMaterialFormData({ ...materialFormData, image_url: '' })}
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
                    <button type="button" onClick={() => setShowMaterialModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
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
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
                <div className="text-center flex-1">
                  <h3 className="text-xl font-bold text-primary uppercase tracking-widest">Chi tiết danh mục vật tư</h3>
                </div>
                <button onClick={() => setShowMaterialDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.code || selectedMaterial.id.slice(0, 8)}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Kho lưu trữ</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.warehouses?.name || '-'}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.specification || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedGroup?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.unit || '-'}</p>
                  </div>
                </div>

                {selectedMaterial.image_url && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Hình ảnh</label>
                    <div className="w-full h-48 rounded-2xl overflow-hidden border border-gray-100">
                      <img src={selectedMaterial.image_url} alt={selectedMaterial.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => { setShowMaterialDetailModal(false); handleDeleteMaterialClick(selectedMaterial.id); }}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Trash2 size={16} /> Xóa
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowMaterialDetailModal(false); handleEditMaterial(selectedMaterial); }}
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
