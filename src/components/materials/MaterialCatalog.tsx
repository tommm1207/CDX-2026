import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Package, Plus, Search, Edit, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { CreatableSelect } from '../shared/CreatableSelect';

export const MaterialCatalog = ({ user, onBack, onNavigate }: { user: Employee, onBack?: () => void, onNavigate?: (page: string) => void }) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const initialFormState = {
    id: '',
    code: '',
    name: '',
    group_id: '',
    specification: '',
    unit: '',
    description: '',
    image_url: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchMaterials();
    fetchGroups();
    fetchWarehouses();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*, material_groups(name)')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      } else {
        setMaterials(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching materials:', err);
      alert('Lỗi tải danh mục vật tư: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    const { data } = await supabase.from('material_groups').select('*').order('name');
    if (data) setGroups(data);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setWarehouses(data);
  };

  const generateNextMaterialCode = async (groupId: string) => {
    if (!groupId) return '';
    try {
      // Get the group code first
      const { data: groupData } = await supabase
        .from('material_groups')
        .select('code')
        .eq('id', groupId)
        .single();

      if (!groupData || !groupData.code) return '';

      const groupPrefix = groupData.code;
      const { data } = await supabase
        .from('materials')
        .select('code')
        .eq('group_id', groupId)
        .order('code', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].code) {
        const lastCode = data[0].code;
        const parts = lastCode.split('-');
        const lastNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNum)) {
          return `${groupPrefix}-${(lastNum + 1).toString().padStart(3, '0')}`;
        }
      }
      return `${groupPrefix}-001`;
    } catch (err) {
      console.error('Error generating material code:', err);
      return '';
    }
  };

  const isUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalGroupId = formData.group_id;
      if (formData.group_id && !isUUID(formData.group_id)) {
        const groupByName = groups.find(g => g.name.toLowerCase() === formData.group_id.toLowerCase());
        if (groupByName) {
          finalGroupId = groupByName.id;
        } else {
          const { data: newGroup, error: groupErr } = await supabase.from('material_groups').insert([{ name: formData.group_id }]).select();
          if (groupErr) throw groupErr;
          if (newGroup) {
            finalGroupId = newGroup[0].id;
            fetchGroups();
          }
        }
      }

      const dbPayload = {
        code: formData.code,
        name: formData.name,
        group_id: finalGroupId || null,
        warehouse_id: formData.warehouse_id || null,
        specification: formData.specification,
        unit: formData.unit,
        description: formData.description,
        image_url: formData.image_url
      };

      if (isEditing && formData.id) {
        const { error } = await supabase.from('materials').update(dbPayload).eq('id', formData.id);
        if (error) throw error;
      } else {
        dbPayload.code = formData.code || await generateNextMaterialCode(finalGroupId);
        const { error } = await supabase.from('materials').insert([dbPayload]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchMaterials();
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setFormData(item);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('materials').delete().eq('id', itemToDelete);
      if (error) throw error;
      fetchMaterials();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
    setShowDeleteModal(false);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredMaterials = materials.filter(m => {
    const name = m.name || '';
    const code = m.code || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = groupFilter === '' || m.group_id === groupFilter;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Danh mục Vật tư" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-primary" /> Danh mục Vật tư ({filteredMaterials.length})
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý toàn bộ danh sách vật tư, thiết bị trong hệ thống</p>
        </div>
        <button
          onClick={async () => {
            setFormData({ ...initialFormState });
            setIsEditing(false);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm vật tư</label>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">-- Tất cả nhóm --</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã vật tư..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchMaterials}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
          >
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 w-32">Mã vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Tên vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Nhóm</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Quy cách</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">ĐVT</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredMaterials.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Không tìm thấy vật tư nào</td></tr>
              ) : (
                filteredMaterials.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => { setSelectedMaterial(item); setShowDetailModal(true); }}
                  >
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{item.code || item.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                      <div className="flex items-center gap-2">
                        {item.image_url && (
                          <div className="w-6 h-6 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        {item.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.material_groups?.name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.specification || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.unit || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
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
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa vật tư <strong>{materials.find(m => m.id === itemToDelete)?.code || itemToDelete?.slice(0, 8)}</strong>? Hành động này không thể hoàn tác.</p>
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
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Package size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật vật tư' : 'Thêm vật tư mới'}</h3>
                    <p className="text-xs text-white/70">Nhập thông tin chi tiết vật tư vào hệ thống</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư</label>
                        <input
                          required
                          type="text"
                          disabled
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư *</label>
                        <input
                          required
                          type="text"
                          placeholder="Ví dụ: Tôn kẽm 0.4mm"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <CreatableSelect
                        label="Nhóm vật tư *"
                        value={formData.group_id}
                        options={groups}
                        onChange={async (val) => {
                          let nextCode = formData.code;
                          if (!isEditing && val && isUUID(val)) {
                            nextCode = await generateNextMaterialCode(val);
                          }
                          setFormData({ ...formData, group_id: val, code: nextCode });
                        }}
                        onCreate={async (val) => {
                          setFormData({ ...formData, group_id: val });
                        }}
                        placeholder="Chọn nhóm..."
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <CreatableSelect
                        label="Đơn vị tính"
                        value={formData.unit}
                        options={Array.from(new Set(materials.map(m => m.unit))).filter(Boolean).map((u: any) => ({ id: String(u), name: String(u) }))}
                        onChange={(val) => setFormData({ ...formData, unit: val })}
                        onCreate={(val) => setFormData({ ...formData, unit: val })}
                        placeholder="Chọn hoặc nhập mới..."
                      />

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách / Kích thước</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 1200mm x 2400mm"
                          value={formData.specification}
                          onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả chi tiết</label>
                        <textarea
                          rows={3}
                          placeholder="Thông tin thêm về vật tư..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Hình ảnh vật tư</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group relative">
                          {formData.image_url ? (
                            <>
                              <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, image_url: '' })}
                                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <ImageIcon className="text-gray-300" size={24} />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="file"
                            id="material-image"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="material-image"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 cursor-pointer transition-colors"
                          >
                            <ImageIcon size={14} /> Tải ảnh từ máy
                          </label>
                          <p className="text-[10px] text-gray-400 italic">Dung lượng tối đa 2MB. Hỗ trợ JPG, PNG.</p>
                        </div>
                      </div>
                    </div>
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
        {showDetailModal && selectedMaterial && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
                <div className="text-center flex-1">
                  <h3 className="text-xl font-bold text-primary uppercase tracking-widest">Chi tiết vật tư</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto flex-1">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-48 h-48 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                    {selectedMaterial.image_url ? (
                      <img src={selectedMaterial.image_url} alt={selectedMaterial.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                        <ImageIcon size={48} />
                        <span className="text-[10px] font-bold uppercase">Không có ảnh</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.code || selectedMaterial.id.slice(0, 8)}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.name}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm vật tư</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.material_groups?.name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Kho lưu trữ</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.warehouses?.name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.unit || '-'}</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách / Kích thước</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.specification || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả chi tiết</label>
                  <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 italic">
                    {selectedMaterial.description || 'Chưa có mô tả cho vật tư này.'}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => { setShowDetailModal(false); handleDeleteClick(selectedMaterial.id); }}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Trash2 size={16} /> Xóa
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDetailModal(false); handleEdit(selectedMaterial); }}
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
    </div>
  );
};
