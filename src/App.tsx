/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, FormEvent, MouseEvent, ChangeEvent, useRef, useMemo, useCallback } from 'react';
import { utils, writeFile } from 'xlsx';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Settings, 
  LogOut, 
  Menu as MenuIcon, 
  X, 
  Warehouse, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowLeftRight, 
  BarChart3, 
  CalendarCheck, 
  Wallet, 
  Banknote, 
  UserCircle, 
  Settings2, 
  List, 
  Boxes, 
  Layers, 
  Handshake,
  Plus,
  Search,
  Edit,
  Home,
  User as UserIcon,
  ChevronDown,
  FileSpreadsheet,
  Info,
  MapPin,
  Navigation,
  Eye,
  Image as ImageIcon,
  FileText,
  Save,
  ArrowLeft,
  ChevronRight,
  Filter,
  Calculator,
  FilePieChart,
  Archive,
  History,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabaseClient';
import { Employee } from './types';

// --- Constants ---
const LOGO_URL = "/logo.png"; // Đường dẫn đến file logo trong thư mục public

// --- Components ---

const LoginPage = ({ onLogin }: { onLogin: (user: Employee) => void }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use 'users' table for login as requested
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', employeeId)
        .eq('app_pass', password)
        .single();

      if (fetchError || !data) {
        setError('Mã nhân viên hoặc mật khẩu không đúng');
      } else {
        onLogin(data as Employee);
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-light flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-primary rounded-lg flex items-center justify-center mb-4 overflow-hidden">
             <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <h2 className="text-primary font-bold text-lg tracking-wider uppercase">Hệ Thống Quản Lý</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã nhân viên (ID)</label>
            <input 
              type="text" 
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Nhập mã nhân viên"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-green-900/20 disabled:opacity-50"
          >
            {loading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-primary-light text-primary font-semibold' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon size={20} className={active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'} />
    <span className="text-sm flex-1 text-left">{label}</span>
    {badge && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
  </button>
);

const MaterialGroups = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
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
    const { data, error } = await supabase
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
      alert('Lỗi tải vật tư: ' + error.message);
    }
    if (data) setMaterials(data);
    setMaterialsLoading(false);
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
        const { error } = await supabase.from('material_groups').insert([{
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
    <div className="p-4 md:p-6 space-y-6">
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
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{item.id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic">{item.notes || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Delete Confirmation Modal */}
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
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa {deleteType === 'group' ? 'nhóm vật tư' : 'vật tư'} <strong>{itemToDelete}</strong>? Hành động này không thể hoàn tác.</p>
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
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                    <textarea 
                      rows={3}
                      placeholder="Thông tin thêm về nhóm này..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
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

      {/* Group Detail Modal */}
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
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedGroup.id}</p>
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
                          <th className="px-4 py-2 text-[10px] font-bold uppercase border-r border-white/10">Mã vật tư (ID)</th>
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
                              <td className="px-4 py-2 text-xs font-medium text-gray-700">{mat.id}</td>
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
                        setMaterialFormData({...materialFormData, id: val});
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
                    onChange={(e) => setMaterialFormData({...materialFormData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Kho lưu trữ</label>
                  <select 
                    value={materialFormData.warehouse_id}
                    onChange={(e) => setMaterialFormData({...materialFormData, warehouse_id: e.target.value})}
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
                    onChange={(e) => setMaterialFormData({...materialFormData, specification: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                  <input 
                    type="text" 
                    value={materialFormData.unit}
                    onChange={(e) => setMaterialFormData({...materialFormData, unit: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả</label>
                  <textarea 
                    rows={2}
                    value={materialFormData.description}
                    onChange={(e) => setMaterialFormData({...materialFormData, description: e.target.value})}
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
                            onClick={() => setMaterialFormData({...materialFormData, image_url: ''})}
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

      {/* Material Detail Modal (The Eye) */}
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư (ID)</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.id}</p>
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
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedGroup?.id}</p>
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

const Materials = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
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
    name: '',
    group_id: '',
    warehouse_id: '',
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
    console.log('Fetching materials...');
    // Đơn giản hóa truy vấn, bỏ join tạm thời để kiểm tra dữ liệu gốc
    const { data, error } = await supabase
      .from('materials')
      .select('*') 
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching materials:', error);
      alert('Lỗi tải danh mục vật tư: ' + error.message);
    }
    
    console.log('Materials data received:', data);
    if (data) setMaterials(data);
    setLoading(false);
  };

  const fetchGroups = async () => {
    const { data } = await supabase.from('material_groups').select('*').order('name');
    if (data) setGroups(data);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Resolve group_id if it's a name
      let finalGroupId = formData.group_id;
      const groupByName = groups.find(g => g.name === formData.group_id);
      if (groupByName) {
        finalGroupId = groupByName.id;
      } else if (formData.group_id && !groups.find(g => g.id === formData.group_id)) {
        // Create new group
        const { data: newGroup, error: groupErr } = await supabase.from('material_groups').insert([{ name: formData.group_id }]).select();
        if (!groupErr && newGroup) {
          finalGroupId = newGroup[0].id;
          fetchGroups();
        }
      }

      // Resolve warehouse_id
      let finalWarehouseId = formData.warehouse_id;
      const warehouseByName = warehouses.find(w => w.name === formData.warehouse_id);
      if (warehouseByName) {
        finalWarehouseId = warehouseByName.id;
      } else if (formData.warehouse_id && !warehouses.find(w => w.id === formData.warehouse_id)) {
        const { data: newWh, error: whErr } = await supabase.from('warehouses').insert([{ name: formData.warehouse_id }]).select();
        if (!whErr && newWh) {
          finalWarehouseId = newWh[0].id;
          fetchWarehouses();
        }
      }

      const payload = { ...formData, group_id: finalGroupId, warehouse_id: finalWarehouseId };

      if (isEditing) {
        const { error } = await supabase.from('materials').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materials').insert([payload]);
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
    const id = m.id || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = groupFilter === '' || m.group_id === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const uniqueMaterialIds = Array.from(new Set(materials.map(m => m.id)));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Danh mục Vật tư" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-primary" /> Danh mục Vật tư ({filteredMaterials.length})
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý toàn bộ danh sách vật tư, thiết bị trong hệ thống</p>
        </div>
        <button 
          onClick={() => { setFormData(initialFormState); setIsEditing(false); setShowModal(true); }}
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
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Kho</th>
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
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{item.id}</td>
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
                    <td className="px-4 py-3 text-xs text-gray-500">{item.group_id || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.warehouse_id || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.specification || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.unit || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Delete Confirmation Modal */}
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
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa vật tư <strong>{itemToDelete}</strong>? Hành động này không thể hoàn tác.</p>
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
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư (ID) *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Ví dụ: VT001"
                          value={formData.id}
                          onChange={(e) => setFormData({...formData, id: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Ví dụ: Tôn kẽm 0.4mm"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      
                      <CustomCombobox 
                        label="Nhóm vật tư *"
                        value={groups.find(g => g.id === formData.group_id)?.name || formData.group_id}
                        onChange={(val) => setFormData({...formData, group_id: val})}
                        options={groups}
                        placeholder="Chọn hoặc nhập mới..."
                        required
                      />

                      <CustomCombobox 
                        label="Kho lưu trữ"
                        value={warehouses.find(w => w.id === formData.warehouse_id)?.name || formData.warehouse_id}
                        onChange={(val) => setFormData({...formData, warehouse_id: val})}
                        options={warehouses}
                        placeholder="Chọn hoặc nhập mới..."
                      />
                    </div>

                    <div className="space-y-4">
                      <CustomCombobox 
                        label="Đơn vị tính"
                        value={formData.unit}
                        onChange={(val) => setFormData({...formData, unit: val})}
                        options={Array.from(new Set(materials.map(m => m.unit))).filter(Boolean).map((u, i) => ({ id: i, name: u }))}
                        placeholder="Chọn hoặc nhập mới..."
                      />

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách / Kích thước</label>
                        <input 
                          type="text" 
                          placeholder="Ví dụ: 1200mm x 2400mm"
                          value={formData.specification}
                          onChange={(e) => setFormData({...formData, specification: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả chi tiết</label>
                        <textarea 
                          rows={3}
                          placeholder="Thông tin thêm về vật tư..."
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                                onClick={() => setFormData({...formData, image_url: ''})}
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

      {/* Detail Modal */}
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
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư (ID)</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.id}</p>
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

const Placeholder = ({ title, onBack }: { title: string, onBack?: () => void }) => (
  <div className="p-4 md:p-6 space-y-6">
    <PageBreadcrumb title={title} onBack={onBack} />
    <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-4 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="p-4 bg-gray-50 rounded-full">
        <Settings size={48} className="animate-spin-slow" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-700">{title}</h3>
        <p className="text-sm">Tính năng này đang được phát triển...</p>
      </div>
    </div>
  </div>
);

const PageBreadcrumb = ({ title, onBack }: { title: string, onBack?: () => void }) => {
  if (!onBack) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 mb-6"
    >
      <button 
        onClick={onBack} 
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all group shadow-sm active:scale-95"
        title="Quay lại"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
      </button>
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
          <span>Hệ thống</span>
          <ChevronRight size={10} />
        </div>
        <h2 className="text-lg font-bold text-gray-800 leading-none">{title}</h2>
      </div>
    </motion.div>
  );
};

const Trash = ({ onNavigate, onBack }: { onNavigate: (page: string) => void, onBack: () => void }) => {
  const trashItems = [
    { id: 'deleted-materials', label: 'Danh sách vật tư xóa', icon: Package, color: 'bg-red-50 text-red-600' },
    { id: 'deleted-warehouses', label: 'Danh sách kho xóa', icon: Warehouse, color: 'bg-orange-50 text-orange-600' },
    { id: 'deleted-slips', label: 'Phiếu nhập xuất đã xóa', icon: Archive, color: 'bg-blue-50 text-blue-600' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Thùng rác" onBack={onBack} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {trashItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ y: -4 }}
            onClick={() => onNavigate(item.id)}
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4 cursor-pointer group"
          >
            <div className={`p-6 rounded-2xl ${item.color} group-hover:scale-110 transition-transform`}>
              <item.icon size={40} />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-800">{item.label}</h3>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Xem dữ liệu đã xóa</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Warehouses = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const initialFormState = {
    id: '',
    name: '',
    address: '',
    manager_id: '',
    coordinates: '',
    notes: '',
    capacity: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchWarehouses();
    fetchEmployees();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching warehouses with join:', error);
        // Fallback to simple fetch if join fails
        const { data: simpleData, error: simpleError } = await supabase
          .from('warehouses')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        setWarehouses(simpleData || []);
      } else {
        setWarehouses(data || []);
      }
    } catch (err: any) {
      console.error('Final fetch error:', err);
      alert('Lỗi tải dữ liệu kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) setEmployees(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isEditing) {
        const { error } = await supabase.from('warehouses').update(formData).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('warehouses').insert([formData]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchWarehouses();
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      id: item.id,
      name: item.name,
      address: item.address || '',
      manager_id: item.manager_id || '',
      coordinates: item.coordinates || '',
      notes: item.notes || '',
      capacity: item.capacity || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from('warehouses').delete().eq('id', itemToDelete);
    if (error) alert('Lỗi: ' + error.message);
    else fetchWarehouses();
    setShowDeleteModal(false);
  };

  const openInGoogleMaps = (coords: string) => {
    if (!coords) return;
    if (coords.startsWith('http')) {
      window.open(coords, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`, '_blank');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Danh sách Kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Warehouse className="text-primary" /> Danh sách Kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý hệ thống bãi đúc và kho bãi công trình</p>
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
            <input type="text" placeholder="Gõ để tìm..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Mã kho (ID)</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Tên kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Địa chỉ</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Nhân viên phụ trách</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Tọa độ</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Sức chứa</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : warehouses.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 italic">Chưa có dữ liệu kho bãi</td></tr>
              ) : (
                warehouses.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{item.id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.address}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.users?.full_name || item.manager_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[100px]">{item.coordinates}</span>
                        {item.coordinates && (
                          <button 
                            onClick={() => openInGoogleMaps(item.coordinates)}
                            className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Chỉ đường Google Maps"
                          >
                            <Navigation size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.notes}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.capacity}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                        <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa kho <strong>{itemToDelete}</strong>? Hành động này không thể hoàn tác.</p>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Warehouse size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật thông tin kho' : 'Thêm mới kho bãi'}</h3>
                    <p className="text-xs text-white/70">Vui lòng điền đầy đủ thông tin chi tiết</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã kho (ID) *</label>
                        <input 
                          required
                          type="text" 
                          disabled={isEditing}
                          placeholder="Ví dụ: KHO_CDX_01"
                          value={formData.id}
                          onChange={(e) => setFormData({...formData, id: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tên kho *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Nhập tên kho..."
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Địa chỉ</label>
                        <input 
                          type="text" 
                          placeholder="Địa chỉ cụ thể..."
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân viên phụ trách</label>
                        <select 
                          value={formData.manager_id}
                          onChange={(e) => setFormData({...formData, manager_id: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">-- Chọn nhân sự --</option>
                          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.id})</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tọa độ / Link Google Maps</label>
                        <div className="relative">
                          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input 
                            type="text" 
                            placeholder="10.43, 106.59 hoặc dán link..."
                            value={formData.coordinates}
                            onChange={(e) => setFormData({...formData, coordinates: e.target.value})}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                        <textarea 
                          rows={3}
                          placeholder="Thông tin thêm..."
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Sức chứa</label>
                        <input 
                          type="text" 
                          placeholder="Ví dụ: 1000 tấn"
                          value={formData.capacity}
                          onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
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
    </div>
  );
};
const CustomCombobox = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  required = false 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  options: any[], 
  placeholder: string,
  required?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const search = (value || '').toLowerCase();
    return options.filter(opt => (opt.name || '').toLowerCase().includes(search));
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`space-y-1 relative ${isOpen ? 'z-[200]' : 'z-10'}`} ref={containerRef}>
      {label && <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>}
      <div className="relative">
        <input
          type="text"
          required={required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 pr-10 bg-white transition-all"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      <AnimatePresence>
        {isOpen && filteredOptions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-40 overflow-y-auto py-1 z-[210] custom-scrollbar"
            >
            {filteredOptions.map((opt, idx) => (
              <button
                key={opt.id || idx}
                type="button"
                onClick={() => {
                  onChange(opt.name);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 hover:text-primary transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between group"
              >
                <span>{opt.name}</span>
                <Plus size={12} className="opacity-0 group-hover:opacity-100 text-primary/40" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Costs = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<any>(null);
  const [costs, setCosts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [costTypes, setCostTypes] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    cost_type: '',
    content: '',
    warehouse_name: '',
    quantity: 0,
    unit: '',
    total_amount: 0,
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchCosts();
    fetchMaterials();
    fetchWarehouses();
    fetchCostTypes();
    fetchUnits();
  }, []);

  const fetchCosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('costs')
      .select('*, users(full_name), warehouses(name), materials(name)')
      .order('date', { ascending: false });
    
    if (error) console.error('Error fetching costs:', error);
    if (data) setCosts(data);
    setLoading(false);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('id, name');
    if (data) setMaterials(data);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name');
    if (data) setWarehouses(data);
  };

  const fetchCostTypes = async () => {
    // Lấy các loại chi phí duy nhất từ bảng costs
    const { data } = await supabase.from('costs').select('cost_type');
    if (data) {
      const uniqueTypes = Array.from(new Set(data.map(item => item.cost_type)))
        .filter(Boolean)
        .map((name, index) => ({ id: index, name }));
      setCostTypes(uniqueTypes);
    }
  };

  const fetchUnits = async () => {
    // Lấy các đơn vị tính duy nhất từ bảng costs
    const { data } = await supabase.from('costs').select('unit');
    if (data) {
      const uniqueUnits = Array.from(new Set(data.map(item => item.unit)))
        .filter(Boolean)
        .map((name, index) => ({ id: index, name }));
      setUnits(uniqueUnits);
    }
  };

  const ensureValueExists = async (table: string, name: string, currentList: any[], fetchFn: () => void) => {
    if (!name) return null;
    
    // Nếu là bảng costs thì không cần lưu vào bảng danh mục riêng
    if (table === 'costs') return null;

    const existing = currentList.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    // Auto-save new value for warehouses and materials
    const { data, error } = await supabase.from(table).insert([{ name }]).select();
    if (!error && data && data[0]) {
      fetchFn();
      return data[0].id;
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Resolve warehouse_id
      const warehouse_id = await ensureValueExists('warehouses', formData.warehouse_name, warehouses, fetchWarehouses);
      
      // Resolve content/material
      const material_id = await ensureValueExists('materials', formData.content, materials, fetchMaterials);

      const dateObj = new Date(formData.date);
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = String(dateObj.getFullYear()).slice(-2);
      const finalCode = `${user.id.toUpperCase()}-${d}${m}${y}`;

      const payload: any = {
        date: formData.date,
        cost_code: finalCode,
        employee_id: user.id,
        cost_type: formData.cost_type,
        content: formData.content,
        warehouse_id: warehouse_id,
        material_id: material_id,
        quantity: formData.quantity,
        unit: formData.unit,
        total_amount: formData.total_amount,
        notes: formData.notes
      };

      let error;
      if (isEditing && editingId) {
        const { error: err } = await supabase.from('costs').update(payload).eq('id', editingId);
        error = err;
      } else {
        const { error: err } = await supabase.from('costs').insert([payload]);
        error = err;
      }

      if (error) throw error;

      setShowModal(false);
      setFormData(initialFormState);
      setIsEditing(false);
      setEditingId(null);
      fetchCosts();
      fetchCostTypes();
      fetchUnits();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      date: item.date,
      cost_type: item.cost_type,
      content: item.content || '',
      warehouse_name: item.warehouses?.name || '',
      quantity: item.quantity,
      unit: item.unit || '',
      total_amount: item.total_amount,
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setIsEditing(true);
    setShowModal(true);
    setShowDetailModal(false);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('costs').delete().eq('id', itemToDelete);
      if (error) throw error;
      fetchCosts();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      alert('Lỗi khi xóa chi phí: ' + err.message);
    }
  };

  const exportToExcel = () => {
    const data = costs.map(item => ({
      'Mã chi phí': item.cost_code,
      'Ngày chi': item.date,
      'Người lập': item.users?.full_name || item.employee_id,
      'Loại chi phí': item.cost_type,
      'Nội dung': item.content,
      'Vật tư': item.materials?.name || '',
      'Kho': item.warehouses?.name || '',
      'Số lượng': item.quantity,
      'ĐVT': item.unit,
      'Đơn giá': item.unit_price,
      'Thành tiền': item.total_amount,
      'Ghi chú': item.notes
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Chi phí");
    writeFile(wb, `QuanLyChiPhi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Quản lý Chi phí" onBack={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="text-primary" /> Quản lý Chi phí
          </h2>
          <p className="text-xs text-gray-500 mt-1">Theo dõi và quản lý các khoản chi phí phát sinh</p>
        </div>
        <div className="flex gap-2">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <FileSpreadsheet size={18} className="text-green-600" /> Xuất Excel
          </motion.button>
          <button 
            onClick={() => { setIsEditing(false); setFormData(initialFormState); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
          >
            <Plus size={18} /> Nhập chi phí
          </button>
        </div>
      </div>

      {/* Filters Placeholder */}
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
            <input type="text" placeholder="Gõ để tìm..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ngày chi</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Tên kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Loại chi phí</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Nội dung chi</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-center">SL</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-center">ĐVT</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-right">Số tiền</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Người chi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : costs.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 italic">Chưa có dữ liệu chi phí</td></tr>
              ) : (
                costs.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => { setSelectedCost(item); setShowDetailModal(true); }}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.warehouses?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.cost_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.content}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{item.unit}</td>
                    <td className="px-4 py-3 text-xs font-bold text-primary text-right">
                      {item.total_amount.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 italic truncate max-w-[150px]">{item.notes}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.users?.full_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedCost && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Wallet size={24} /></div>
                  <h3 className="font-bold text-lg">Chi tiết chi phí</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ngày chi</p>
                    <p className="font-medium">{new Date(selectedCost.date).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Người chi</p>
                    <p className="font-medium">{selectedCost.users?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Kho</p>
                    <p className="font-medium">{selectedCost.warehouses?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Loại chi phí</p>
                    <p className="font-medium">{selectedCost.cost_type}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Nội dung</p>
                    <p className="font-medium">{selectedCost.content}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Số lượng</p>
                    <p className="font-medium">{selectedCost.quantity} {selectedCost.unit}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Số tiền</p>
                    <p className="font-bold text-primary text-lg">{selectedCost.total_amount.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</p>
                    <p className="text-gray-600 italic">{selectedCost.notes || 'Không có ghi chú'}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => handleEdit(selectedCost)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Edit size={18} /> Sửa
                  </button>
                  <button 
                    onClick={() => { setShowDetailModal(false); handleDeleteClick(selectedCost.id); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} /> Xóa
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
              <p className="text-sm text-gray-500 mb-6">Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa bản ghi này?</p>
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

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Wallet size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật chi phí' : 'Nhập chi phí'}</h3>
                    <p className="text-xs text-white/70">Vui lòng điền đầy đủ thông tin chi phí</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit}>
                  <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex items-start gap-3 border border-blue-100">
                    <Info size={18} className="text-blue-600 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Hệ thống tự động tạo/gom phiếu theo <strong>ngày + người lập</strong>. Thành tiền = SL × Đơn giá.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày chi *</label>
                          <input 
                            type="date" 
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Người lập</label>
                          <input 
                            type="text" 
                            readOnly
                            value={user.full_name}
                            className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 outline-none" 
                          />
                        </div>
                      </div>

                      <CustomCombobox 
                        label="Loại chi phí *"
                        value={formData.cost_type}
                        onChange={(val) => setFormData({...formData, cost_type: val})}
                        options={costTypes}
                        placeholder="Chọn hoặc nhập mới..."
                        required
                      />

                      <CustomCombobox 
                        label="Tên kho *"
                        value={formData.warehouse_name}
                        onChange={(val) => setFormData({...formData, warehouse_name: val})}
                        options={warehouses}
                        placeholder="Chọn hoặc nhập mới..."
                        required
                      />

                      <CustomCombobox 
                        label="Nội dung chi *"
                        value={formData.content}
                        onChange={(val) => setFormData({...formData, content: val})}
                        options={materials}
                        placeholder="Chọn hoặc nhập mới..."
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Số lượng</label>
                          <input 
                            type="number" 
                            value={formData.quantity}
                            onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                          />
                        </div>
                        <CustomCombobox 
                          label="Đơn vị tính"
                          value={formData.unit}
                          onChange={(val) => setFormData({...formData, unit: val})}
                          options={units}
                          placeholder="Chọn/Nhập..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Số tiền *</label>
                        <input 
                          type="number" 
                          required
                          value={formData.total_amount}
                          onChange={(e) => setFormData({...formData, total_amount: parseFloat(e.target.value) || 0})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold text-primary" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                        <textarea 
                          rows={3}
                          placeholder="Ghi chú thêm..."
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu chi phí'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
const Dashboard = ({ user, onNavigate }: { user: Employee, onNavigate: (page: string) => void }) => {
  const [counts, setCounts] = useState({
    employees: 0,
    materials: 0,
    warehouses: 0,
    slips: 0,
    costs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        // Fetch Employees
        const { count: empCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        
        // Fetch Materials (Vật tư link với danh mục vật tư)
        const { count: matCount } = await supabase.from('materials').select('*', { count: 'exact', head: true });
        
        // Fetch Warehouses (Kho link với danh sách kho)
        const { count: whCount } = await supabase.from('warehouses').select('*', { count: 'exact', head: true });
        
        // Fetch Slips (Phiếu NX link với các phiếu báo cáo kho)
        const { count: siCount } = await supabase.from('stock_in').select('*', { count: 'exact', head: true });
        const { count: soCount } = await supabase.from('stock_out').select('*', { count: 'exact', head: true });
        const { count: trCount } = await supabase.from('transfers').select('*', { count: 'exact', head: true });
        const { count: adjCount } = await supabase.from('adjustments').select('*', { count: 'exact', head: true });
        const { count: costCount } = await supabase.from('costs').select('*', { count: 'exact', head: true });
        
        setCounts({
          employees: empCount || 0,
          materials: matCount || 0,
          warehouses: whCount || 0,
          slips: (siCount || 0) + (soCount || 0) + (trCount || 0) + (adjCount || 0),
          costs: costCount || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard counts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  const stats = [
    { label: 'NHÂN SỰ', value: counts.employees, icon: Users, color: 'bg-blue-50 text-blue-600', page: 'hr-records' },
    { label: 'VẬT TƯ', value: counts.materials, icon: Package, color: 'bg-green-50 text-green-600', page: 'materials' },
    { label: 'KHO BÃI', value: counts.warehouses, icon: Warehouse, color: 'bg-orange-50 text-orange-600', page: 'warehouses' },
    { label: 'CHI PHÍ', value: counts.costs, icon: Wallet, color: 'bg-purple-50 text-purple-600', page: 'costs' },
  ];

  const sections = [
    {
      title: 'QUẢN LÝ TÀI CHÍNH',
      items: [
        { label: 'Chi phí', icon: Wallet, page: 'costs' },
        { label: 'Báo cáo chi phí', icon: FileText, page: 'cost-report' },
        { label: 'Lọc chi phí', icon: Filter, page: 'cost-filter' },
      ]
    },
    {
      title: 'QUẢN LÝ KHO',
      items: [
        { label: 'Nhập kho', icon: ArrowDownCircle, page: 'stock-in' },
        { label: 'Xuất kho', icon: ArrowUpCircle, page: 'stock-out' },
        { label: 'Luân chuyển kho', icon: ArrowLeftRight, page: 'transfer' },
        { label: 'Báo cáo nhập xuất tồn', icon: BarChart3, page: 'inventory-report' },
        { label: 'Danh sách kho', icon: Warehouse, page: 'warehouses' },
        { label: 'Thư viện vật tư', icon: Settings, page: 'materials' },
      ]
    },
    {
      title: 'TIỀN LƯƠNG',
      items: [
        { label: 'Chấm công', icon: CalendarCheck, page: 'attendance' },
        { label: 'Tạm ứng & phụ cấp', icon: Banknote, page: 'advances' },
        { label: 'Báo cáo lương', icon: FilePieChart, page: 'payroll-report' },
        { label: 'Tổng hợp lương/tháng', icon: Wallet, page: 'payroll' },
        { label: 'Tính lương', icon: Calculator, page: 'salary-calculation' },
        { label: 'Cài đặt lương', icon: Settings2, page: 'salary-settings' },
      ]
    },
    {
      title: 'ĐỐI TÁC',
      items: [
        { label: 'Khách hàng & nhà cung cấp', icon: Handshake, page: 'partners' },
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { label: 'Quản lý nhân sự', icon: UserCircle, page: 'hr-records' },
        { label: 'Thùng rác', icon: Trash2, page: 'trash' },
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (user.role === 'User') {
        const allowed = ['stock-in', 'stock-out', 'transfer', 'inventory-report', 'attendance'];
        return allowed.includes(item.page);
      }
      return true;
    })
  })).filter(section => section.items.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h2 className="text-xs font-bold text-primary mb-4 flex items-center gap-2">
          <LayoutDashboard size={16} /> TỔNG QUAN
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ scale: 1.02 }}
              onClick={() => onNavigate(stat.page)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-xl ${stat.color === 'bg-green-50 text-green-600' ? 'bg-primary-light text-primary' : stat.color}`}>
                <stat.icon size={24} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {filteredSections.map((section, sIdx) => (
        <div key={sIdx}>
          <h2 className="text-xs font-bold text-primary mb-4 flex items-center gap-2">
            <Boxes size={16} /> {section.title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {section.items.map((item, iIdx) => (
              <motion.div 
                key={iIdx}
                whileHover={{ y: -4 }}
                onClick={() => onNavigate(item.page)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer group"
              >
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary-light transition-colors">
                  <item.icon size={24} className="text-gray-600 group-hover:text-primary" />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const HRRecords = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const initialFormState = {
    id: '',
    full_name: '',
    email: '',
    phone: '',
    id_card: '',
    dob: '',
    join_date: new Date().toISOString().split('T')[0],
    tax_id: '',
    app_pass: '',
    department: '',
    position: '',
    has_salary: false,
    role: 'User',
    data_view_permission: '',
    avatar_url: '',
    resign_date: '',
    initial_budget: 0,
    status: 'Đang làm việc'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) setEmployees(data);
    setLoading(false);
  };

  const handleEdit = (emp: Employee) => {
    setFormData({
      ...emp,
      dob: emp.dob || '',
      resign_date: emp.resign_date || '',
      email: emp.email || '',
      phone: emp.phone || '',
      id_card: emp.id_card || '',
      tax_id: emp.tax_id || '',
      department: emp.department || '',
      position: emp.position || '',
      data_view_permission: emp.data_view_permission || '',
      avatar_url: emp.avatar_url || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', itemToDelete);
      if (error) throw error;
      fetchEmployees();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      alert('Lỗi khi xóa nhân sự: ' + err.message);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dataToSubmit = {
        ...formData,
        dob: formData.dob || null,
        join_date: formData.join_date || null,
        resign_date: formData.resign_date || null,
        email: formData.email || null,
        phone: formData.phone || null,
        id_card: formData.id_card || null,
        tax_id: formData.tax_id || null,
        department: formData.department || null,
        position: formData.position || null,
        data_view_permission: formData.data_view_permission || null,
        avatar_url: formData.avatar_url || null
      };

      if (isEditing) {
        const { error } = await supabase.from('users').update(dataToSubmit).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('users').insert([dataToSubmit]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchEmployees();
      setFormData(initialFormState);
      setIsEditing(false);
    } catch (err: any) {
      alert('Lỗi khi lưu nhân sự: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Hồ sơ Nhân sự" onBack={onBack} />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Users size={20} className="text-primary" /> Hồ sơ Nhân sự
        </h2>
        <button 
          onClick={() => {
            setFormData(initialFormState);
            setIsEditing(false);
            setShowModal(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-hover transition-colors"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none">
            <option>-- Nhân sự --</option>
          </select>
          <select className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none">
            <option>-- Kho --</option>
          </select>
          <input type="date" className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
          <input type="date" className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-primary text-white text-[11px] uppercase tracking-wider whitespace-nowrap">
                <th className="p-3 first:rounded-tl-lg sticky left-0 bg-primary z-10">Mã NV (ID)</th>
                <th className="p-3">Họ và tên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Số điện thoại</th>
                <th className="p-3">Ngày vào làm</th>
                {user.role === 'Admin App' && <th className="p-3">Mật khẩu ứng dụng</th>}
                <th className="p-3">Bộ phận</th>
                <th className="p-3">Chức vụ</th>
                <th className="p-3">Phân quyền</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 last:rounded-tr-lg">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-600">
              {loading ? (
                <tr><td colSpan={user.role === 'Admin App' ? 11 : 10} className="p-8 text-center">Đang tải dữ liệu...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={user.role === 'Admin App' ? 11 : 10} className="p-8 text-center">Không tìm thấy nhân sự nào</td></tr>
              ) : filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors whitespace-nowrap">
                  <td className="p-3 font-bold text-gray-800 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-b border-gray-50">{emp.id}</td>
                  <td className="p-3">{emp.full_name}</td>
                  <td className="p-3">{emp.email || '-'}</td>
                  <td className="p-3">{emp.phone || '-'}</td>
                  <td className="p-3">{emp.join_date || '-'}</td>
                  {user.role === 'Admin App' && <td className="p-3 font-mono text-blue-600">{emp.app_pass}</td>}
                  <td className="p-3">{emp.department || '-'}</td>
                  <td className="p-3">{emp.position || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.role === 'Admin App' ? 'bg-purple-100 text-purple-600' :
                      emp.role === 'Admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.status === 'Đang làm việc' || emp.status === 'Hoạt động' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(emp)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(emp.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa nhân sự <strong>{itemToDelete}</strong>? Dữ liệu liên quan có thể bị ảnh hưởng.</p>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative z-10 my-8 max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-4 flex items-center justify-between text-white rounded-t-3xl flex-shrink-0">
                <h3 className="font-bold">{isEditing ? 'Cập Nhật Nhân Sự' : 'Thêm Mới Nhân Sự'}</h3>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit}>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã nhân viên (ID)</label>
                        <input 
                          required
                          type="text" 
                          disabled={isEditing}
                          value={formData.id}
                          onChange={(e) => setFormData({...formData, id: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Họ và tên</label>
                        <input 
                          required
                          type="text" 
                          value={formData.full_name}
                          onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
                        <input 
                          type="email" 
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Số điện thoại</label>
                        <input 
                          type="text" 
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">CMND / CCCD</label>
                        <input 
                          type="text" 
                          value={formData.id_card}
                          onChange={(e) => setFormData({...formData, id_card: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày sinh</label>
                        <input 
                          type="date" 
                          value={formData.dob}
                          onChange={(e) => setFormData({...formData, dob: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày vào làm</label>
                        <input 
                          type="date" 
                          value={formData.join_date}
                          onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã số thuế</label>
                        <input 
                          type="text" 
                          value={formData.tax_id}
                          onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mật khẩu ứng dụng</label>
                        <input 
                          required
                          type="text" 
                          value={formData.app_pass}
                          onChange={(e) => setFormData({...formData, app_pass: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Bộ phận</label>
                        <input 
                          type="text" 
                          value={formData.department}
                          onChange={(e) => setFormData({...formData, department: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Chức vụ</label>
                        <input 
                          type="text" 
                          value={formData.position}
                          onChange={(e) => setFormData({...formData, position: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Có tính lương</label>
                        <select 
                          value={formData.has_salary ? 'true' : 'false'}
                          onChange={(e) => setFormData({...formData, has_salary: e.target.value === 'true'})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="false">Không</option>
                          <option value="true">Có</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Phân quyền</label>
                        <select 
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="User">User</option>
                          <option value="Admin">Admin</option>
                          <option value="Admin App">Admin App</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Quyền xem dữ liệu</label>
                        <input 
                          type="text" 
                          value={formData.data_view_permission}
                          onChange={(e) => setFormData({...formData, data_view_permission: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ảnh cá nhân (URL)</label>
                        <input 
                          type="text" 
                          value={formData.avatar_url}
                          onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày nghỉ việc</label>
                        <input 
                          type="date" 
                          value={formData.resign_date}
                          onChange={(e) => setFormData({...formData, resign_date: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ngân sách đầu kỳ</label>
                        <input 
                          type="number" 
                          value={formData.initial_budget}
                          onChange={(e) => setFormData({...formData, initial_budget: parseFloat(e.target.value)})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái</label>
                        <select 
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="Đang làm việc">Đang làm việc</option>
                          <option value="Nghỉ việc">Nghỉ việc</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors">Hủy bỏ</button>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
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
    </div>
  );
};

const Attendance = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    work_hours: 0,
    overtime_hours: 0,
    workplace: '',
    work_content: '',
    daily_overtime_pay: 0,
    salary_at_time: 0,
    daily_work_pay: 0,
    overtime_rate: 1.5,
    daily_total_pay: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('users').select('id, full_name');
    if (data) setEmployees(data as any);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('attendance')
      .select('*, users(full_name)')
      .order('date', { ascending: false });
    if (data) setAttendanceList(data);
    setLoading(false);
  };

  const handleEdit = (item: any) => {
    setFormData({
      employee_id: item.employee_id,
      date: item.date,
      work_hours: item.work_hours,
      overtime_hours: item.overtime_hours,
      workplace: item.workplace,
      work_content: item.work_content,
      daily_overtime_pay: item.daily_overtime_pay,
      salary_at_time: item.salary_at_time,
      daily_work_pay: item.daily_work_pay,
      overtime_rate: item.overtime_rate,
      daily_total_pay: item.daily_total_pay
    });
    setEditingId(item.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('attendance').delete().eq('id', itemToDelete);
      if (error) throw error;
      fetchAttendance();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err) {
      alert('Lỗi khi xóa dữ liệu chấm công');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        const { error } = await supabase.from('attendance').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance').insert([formData]);
        if (error) throw error;
      }
      
      setShowModal(false);
      fetchAttendance();
      setFormData(initialFormState);
      setIsEditing(false);
      setEditingId(null);
    } catch (err) {
      alert('Lỗi khi lưu dữ liệu chấm công');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = attendanceList.map(item => ({
      'Ngày': item.date,
      'Mã NV': item.employee_id,
      'Họ tên': item.users?.full_name,
      'Giờ công': item.work_hours,
      'Tăng ca': item.overtime_hours,
      'Kho làm việc': item.workplace,
      'Nội dung': item.work_content,
      'Tổng tiền': item.daily_total_pay
    }));

    const ws = utils.json_to_sheet(dataToExport);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Chấm công");
    writeFile(wb, `Bang_Cham_Cong_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Bảng Chấm công" onBack={onBack} />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <CalendarCheck size={20} className="text-primary" /> Bảng Chấm công
        </h2>
        <button 
          onClick={() => {
            setFormData(initialFormState);
            setIsEditing(false);
            setEditingId(null);
            setShowModal(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-hover transition-colors"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <select className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none">
            <option>Tháng 3</option>
          </select>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportExcel}
            className="ml-auto text-xs font-bold text-gray-500 flex items-center gap-2 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 shadow-sm"
          >
            <FileSpreadsheet size={14} className="text-green-600" /> Xuất Excel
          </motion.button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-primary text-white text-[11px] uppercase tracking-wider whitespace-nowrap">
                <th className="p-3 first:rounded-tl-lg sticky left-0 bg-primary z-10">Ngày</th>
                <th className="p-3">Mã NV</th>
                <th className="p-3">Họ tên</th>
                <th className="p-3">Giờ công</th>
                <th className="p-3">Tăng ca</th>
                <th className="p-3">Kho làm việc</th>
                <th className="p-3">Nội dung</th>
                <th className="p-3">Tổng tiền</th>
                <th className="p-3 last:rounded-tr-lg">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-600">
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center">Đang tải dữ liệu...</td></tr>
              ) : attendanceList.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center italic">Chưa có dữ liệu chấm công</td></tr>
              ) : attendanceList.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors whitespace-nowrap">
                  <td className="p-3 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-b border-gray-50">{item.date}</td>
                  <td className="p-3 font-bold">{item.employee_id}</td>
                  <td className="p-3">{item.users?.full_name}</td>
                  <td className="p-3">{item.work_hours}h</td>
                  <td className="p-3">{item.overtime_hours}h</td>
                  <td className="p-3">{item.workplace}</td>
                  <td className="p-3">{item.work_content}</td>
                  <td className="p-3 font-bold text-primary">{item.daily_total_pay?.toLocaleString()}đ</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa bản ghi chấm công này?</p>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10"
            >
              <div className="bg-primary p-4 flex items-center justify-between text-white rounded-t-3xl">
                <h3 className="font-bold">{isEditing ? 'Cập Nhật Chấm Công' : 'Thêm Mới Chấm Công'}</h3>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Mã nhân viên</label>
                      <select 
                        required
                        value={formData.employee_id}
                        onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">-- Chọn --</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.id} - {e.full_name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày (Ghi nhận)</label>
                      <input 
                        type="date" 
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Số giờ công</label>
                      <input 
                        type="number" 
                        step="0.5"
                        value={formData.work_hours}
                        onChange={(e) => setFormData({...formData, work_hours: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Số giờ tăng ca</label>
                      <input 
                        type="number" 
                        step="0.5"
                        value={formData.overtime_hours}
                        onChange={(e) => setFormData({...formData, overtime_hours: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Kho làm việc</label>
                      <input 
                        type="text" 
                        value={formData.workplace}
                        onChange={(e) => setFormData({...formData, workplace: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung công việc</label>
                      <input 
                        type="text" 
                        value={formData.work_content}
                        onChange={(e) => setFormData({...formData, work_content: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Tiền tăng ca ngày</label>
                      <input 
                        type="number" 
                        value={formData.daily_overtime_pay}
                        onChange={(e) => setFormData({...formData, daily_overtime_pay: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Lương tại thời điểm</label>
                      <input 
                        type="number" 
                        value={formData.salary_at_time}
                        onChange={(e) => setFormData({...formData, salary_at_time: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Lương công nhật</label>
                      <input 
                        type="number" 
                        value={formData.daily_work_pay}
                        onChange={(e) => setFormData({...formData, daily_work_pay: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Hệ số tăng ca thời điểm</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={formData.overtime_rate}
                        onChange={(e) => setFormData({...formData, overtime_rate: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Tiền công ngày (Tổng)</label>
                      <input 
                        type="number" 
                        value={formData.daily_total_pay}
                        onChange={(e) => setFormData({...formData, daily_total_pay: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold text-primary" 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors">Hủy bỏ</button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Stock Management Components ---

const StockIn = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    material_id: '',
    quantity: 0,
    unit_price: 0,
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
    fetchWarehouses();
    fetchMaterials();
  }, []);

  const fetchSlips = async () => {
    setLoading(true);
    const { data } = await supabase.from('stock_in').select('*, warehouses(name), materials(name)').order('created_at', { ascending: false });
    if (data) setSlips(data);
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').order('name');
    if (data) setMaterials(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const wh = warehouses.find(w => w.name === formData.warehouse_id || w.id === formData.warehouse_id);
      const mat = materials.find(m => m.name === formData.material_id || m.id === formData.material_id);
      
      const { error } = await supabase.from('stock_in').insert([{
        ...formData,
        warehouse_id: wh?.id || formData.warehouse_id,
        material_id: mat?.id || formData.material_id,
        employee_id: user.id,
        total_amount: formData.quantity * formData.unit_price
      }]);
      if (error) throw error;
      setShowModal(false);
      fetchSlips();
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Nhập kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowDownCircle className="text-primary" /> Nhập kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý phiếu nhập vật tư vào kho</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Lập phiếu nhập
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">SL</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Thành tiền</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : slips.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Chưa có phiếu nhập nào</td></tr>
            ) : (
              slips.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.warehouses?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.materials?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 text-center font-bold">{item.quantity}</td>
                  <td className="px-4 py-3 text-xs text-primary font-bold text-right">{(item.total_amount || 0).toLocaleString('vi-VN')}đ</td>
                  <td className="px-4 py-3 text-xs text-gray-400 italic">{item.notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowDownCircle size={24} /></div>
                  <h3 className="font-bold text-lg">Lập phiếu nhập kho</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày nhập *</label>
                      <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    
                    <CustomCombobox 
                      label="Kho nhập *"
                      value={warehouses.find(w => w.id === formData.warehouse_id)?.name || formData.warehouse_id}
                      onChange={(val) => setFormData({...formData, warehouse_id: val})}
                      options={warehouses}
                      placeholder="Chọn kho..."
                      required
                    />

                    <CustomCombobox 
                      label="Vật tư *"
                      value={materials.find(m => m.id === formData.material_id)?.name || formData.material_id}
                      onChange={(val) => setFormData({...formData, material_id: val})}
                      options={materials}
                      placeholder="Chọn vật tư..."
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Số lượng *</label>
                        <input type="number" required value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn giá</label>
                        <input type="number" value={formData.unit_price} onChange={(e) => setFormData({...formData, unit_price: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                      <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button type="submit" disabled={submitting} className="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                      {submitting ? 'Đang lưu...' : 'Lưu phiếu nhập'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StockOut = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    material_id: '',
    quantity: 0,
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
    fetchWarehouses();
    fetchMaterials();
  }, []);

  const fetchSlips = async () => {
    setLoading(true);
    const { data } = await supabase.from('stock_out').select('*, warehouses(name), materials(name)').order('created_at', { ascending: false });
    if (data) setSlips(data);
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').order('name');
    if (data) setMaterials(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const wh = warehouses.find(w => w.name === formData.warehouse_id || w.id === formData.warehouse_id);
      const mat = materials.find(m => m.name === formData.material_id || m.id === formData.material_id);

      const { error } = await supabase.from('stock_out').insert([{
        ...formData,
        warehouse_id: wh?.id || formData.warehouse_id,
        material_id: mat?.id || formData.material_id,
        employee_id: user.id
      }]);
      if (error) throw error;
      setShowModal(false);
      fetchSlips();
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Xuất kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowUpCircle className="text-red-500" /> Xuất kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý phiếu xuất vật tư khỏi kho</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
        >
          <Plus size={18} /> Lập phiếu xuất
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-600 text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">SL</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : slips.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Chưa có phiếu xuất nào</td></tr>
            ) : (
              slips.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.warehouses?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.materials?.name}</td>
                  <td className="px-4 py-3 text-xs text-red-600 text-center font-bold">-{item.quantity}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 italic">{item.notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-red-600 p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowUpCircle size={24} /></div>
                  <h3 className="font-bold text-lg">Lập phiếu xuất kho</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày xuất *</label>
                      <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-600/20" />
                    </div>
                    
                    <CustomCombobox 
                      label="Kho xuất *"
                      value={warehouses.find(w => w.id === formData.warehouse_id)?.name || formData.warehouse_id}
                      onChange={(val) => setFormData({...formData, warehouse_id: val})}
                      options={warehouses}
                      placeholder="Chọn kho..."
                      required
                    />

                    <CustomCombobox 
                      label="Vật tư *"
                      value={materials.find(m => m.id === formData.material_id)?.name || formData.material_id}
                      onChange={(val) => setFormData({...formData, material_id: val})}
                      options={materials}
                      placeholder="Chọn vật tư..."
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Số lượng xuất *</label>
                      <input type="number" required value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-600/20" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú / Mục đích xuất</label>
                      <textarea rows={4} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-600/20 resize-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button type="submit" disabled={submitting} className="px-8 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50">
                      {submitting ? 'Đang lưu...' : 'Lưu phiếu xuất'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Transfer = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    from_warehouse_id: '',
    to_warehouse_id: '',
    material_id: '',
    quantity: 0,
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
    fetchWarehouses();
    fetchMaterials();
  }, []);

  const fetchSlips = async () => {
    setLoading(true);
    const { data } = await supabase.from('transfers').select('*, from_wh:warehouses!from_warehouse_id(name), to_wh:warehouses!to_warehouse_id(name), materials(name)').order('created_at', { ascending: false });
    if (data) setSlips(data);
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').order('name');
    if (data) setMaterials(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fromWh = warehouses.find(w => w.name === formData.from_warehouse_id || w.id === formData.from_warehouse_id);
      const toWh = warehouses.find(w => w.name === formData.to_warehouse_id || w.id === formData.to_warehouse_id);
      const mat = materials.find(m => m.name === formData.material_id || m.id === formData.material_id);

      const { error } = await supabase.from('transfers').insert([{
        ...formData,
        from_warehouse_id: fromWh?.id || formData.from_warehouse_id,
        to_warehouse_id: toWh?.id || formData.to_warehouse_id,
        material_id: mat?.id || formData.material_id,
        employee_id: user.id
      }]);
      if (error) throw error;
      setShowModal(false);
      fetchSlips();
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Luân chuyển kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowLeftRight className="text-orange-500" /> Luân chuyển kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Điều chuyển vật tư giữa các kho</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
        >
          <Plus size={18} /> Lập phiếu chuyển
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-orange-500 text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Từ kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Đến kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">SL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : slips.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Chưa có phiếu chuyển nào</td></tr>
            ) : (
              slips.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.from_wh?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.to_wh?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.materials?.name}</td>
                  <td className="px-4 py-3 text-xs text-orange-600 text-center font-bold">{item.quantity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-orange-500 p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowLeftRight size={24} /></div>
                  <h3 className="font-bold text-lg">Phiếu điều chuyển kho</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày chuyển *</label>
                      <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                    </div>
                    
                    <CustomCombobox 
                      label="Từ kho *"
                      value={warehouses.find(w => w.id === formData.from_warehouse_id)?.name || formData.from_warehouse_id}
                      onChange={(val) => setFormData({...formData, from_warehouse_id: val})}
                      options={warehouses}
                      placeholder="Chọn kho nguồn..."
                      required
                    />

                    <CustomCombobox 
                      label="Đến kho *"
                      value={warehouses.find(w => w.id === formData.to_warehouse_id)?.name || formData.to_warehouse_id}
                      onChange={(val) => setFormData({...formData, to_warehouse_id: val})}
                      options={warehouses}
                      placeholder="Chọn kho đích..."
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <CustomCombobox 
                      label="Vật tư điều chuyển *"
                      value={materials.find(m => m.id === formData.material_id)?.name || formData.material_id}
                      onChange={(val) => setFormData({...formData, material_id: val})}
                      options={materials}
                      placeholder="Chọn vật tư..."
                      required
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Số lượng chuyển *</label>
                      <input type="number" required value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                      <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button type="submit" disabled={submitting} className="px-8 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50">
                      {submitting ? 'Đang lưu...' : 'Lưu phiếu chuyển'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BottomNav = ({ currentPage, onNavigate, user }: { currentPage: string, onNavigate: (page: string) => void, user: Employee }) => {
  const navItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: Home },
    { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownCircle },
    { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle },
    { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
    { id: 'hr-records', label: 'Hồ sơ', icon: UserCircle },
  ].filter(item => {
    if (user.role === 'User') {
      const allowed = ['dashboard', 'stock-in', 'stock-out', 'attendance'];
      return allowed.includes(item.id);
    }
    return true;
  });

  return (
    <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/90 backdrop-blur-md border border-gray-100 flex items-center justify-around py-2 px-2 z-40 shadow-[0_8px_25px_rgba(0,0,0,0.1)] rounded-full">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex flex-col items-center gap-0.5 flex-1 transition-all ${
            currentPage === item.id ? 'text-primary scale-105' : 'text-gray-400'
          }`}
        >
          <item.icon size={20} className={currentPage === item.id ? 'text-primary' : 'text-gray-400'} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navigateTo = (page: string) => {
    if (page !== currentPage) {
      setNavigationHistory(prev => [...prev, currentPage]);
      setCurrentPage(page);
    }
  };

  const goBack = () => {
    if (navigationHistory.length > 0) {
      const prevPage = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentPage(prevPage);
    } else {
      setCurrentPage('dashboard');
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const menuGroups = [
    {
      title: 'QUẢN LÝ TÀI CHÍNH',
      items: [
        { id: 'costs', label: 'Chi phí', icon: Wallet },
        { id: 'cost-report', label: 'Báo cáo chi phí', icon: FileText },
        { id: 'cost-filter', label: 'Lọc chi phí', icon: Filter },
      ]
    },
    {
      title: 'QUẢN LÝ KHO',
      items: [
        { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownCircle },
        { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle },
        { id: 'transfer', label: 'Luân chuyển kho', icon: ArrowLeftRight },
        { id: 'inventory-report', label: 'Báo cáo nhập xuất tồn', icon: BarChart3 },
        { id: 'warehouses', label: 'Danh sách kho', icon: Warehouse },
        { id: 'materials', label: 'Thư viện vật tư', icon: Settings },
      ]
    },
    {
      title: 'TIỀN LƯƠNG',
      items: [
        { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
        { id: 'advances', label: 'Tạm ứng & phụ cấp', icon: Banknote },
        { id: 'payroll-report', label: 'Báo cáo lương', icon: FilePieChart },
        { id: 'payroll', label: 'Tổng hợp lương/tháng', icon: Wallet },
        { id: 'salary-calculation', label: 'Tính lương', icon: Calculator },
        { id: 'salary-settings', label: 'Cài đặt lương', icon: Settings2 },
      ]
    },
    {
      title: 'ĐỐI TÁC',
      items: [
        { id: 'partners', label: 'Khách hàng & nhà cung cấp', icon: Handshake },
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { id: 'hr-records', label: 'Quản lý nhân sự', icon: UserCircle },
        { id: 'trash', label: 'Thùng rác', icon: Trash2 },
      ]
    }
  ];

  const filteredMenuGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (user.role === 'User') {
        const allowed = ['stock-in', 'stock-out', 'transfer', 'inventory-report', 'attendance'];
        return allowed.includes(item.id);
      }
      return true;
    })
  })).filter(group => group.items.length > 0);

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} onNavigate={navigateTo} />;
      case 'hr-records': return <HRRecords user={user} onBack={goBack} />;
      case 'attendance': return <Attendance user={user} onBack={goBack} />;
      case 'costs': return <Costs user={user} onBack={goBack} />;
      case 'warehouses': return <Warehouses user={user} onBack={goBack} />;
      case 'materials': return <Materials user={user} onBack={goBack} />;
      case 'stock-in': return <StockIn user={user} onBack={goBack} />;
      case 'stock-out': return <StockOut user={user} onBack={goBack} />;
      case 'transfer': return <Transfer user={user} onBack={goBack} />;
      case 'cost-report': return <Placeholder title="Báo cáo chi phí" onBack={goBack} />;
      case 'cost-filter': return <Placeholder title="Lọc chi phí" onBack={goBack} />;
      case 'payroll-report': return <Placeholder title="Báo cáo lương" onBack={goBack} />;
      case 'salary-calculation': return <Placeholder title="Tính lương" onBack={goBack} />;
      case 'advances': return <Placeholder title="Tạm ứng & phụ cấp" onBack={goBack} />;
      case 'payroll': return <Placeholder title="Tổng hợp lương/tháng" onBack={goBack} />;
      case 'salary-settings': return <Placeholder title="Cài đặt lương" onBack={goBack} />;
      case 'partners': return <Placeholder title="Khách hàng & nhà cung cấp" onBack={goBack} />;
      case 'inventory-report': return <Placeholder title="Báo cáo nhập xuất tồn" onBack={goBack} />;
      case 'trash': return <Trash onNavigate={navigateTo} onBack={goBack} />;
      case 'deleted-materials': return <Placeholder title="Danh sách vật tư xóa" onBack={goBack} />;
      case 'deleted-warehouses': return <Placeholder title="Danh sách kho xóa" onBack={goBack} />;
      case 'deleted-slips': return <Placeholder title="Phiếu nhập xuất đã xóa" onBack={goBack} />;
      case 'material-groups': return <MaterialGroups user={user} onBack={goBack} />;
      default: return (
        <div className="p-4 md:p-6 space-y-6">
          <PageBreadcrumb title={currentPage} onBack={goBack} />
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-4 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="p-6 bg-gray-100 rounded-full"><Package size={48} /></div>
            <p className="text-lg font-medium italic">Tính năng "{currentPage}" đang được phát triển...</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-primary text-white h-14 flex items-center justify-between px-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="flex items-center gap-2 hover:bg-white/10 p-1.5 rounded-xl transition-all active:scale-95"
          >
            <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center p-1 shadow-sm">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="font-bold text-sm tracking-wide hidden sm:block">QUẢN LÝ KHO CDX</h1>
          </button>
          
          <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" />
          
          <button 
            onClick={() => navigateTo('dashboard')}
            className="hover:bg-white/10 p-2 rounded-xl transition-colors flex items-center gap-2 group"
            title="Về trang chủ"
          >
            <Home size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative">
          <div 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 bg-white/10 px-2 sm:px-3 py-1 rounded-full border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <UserIcon size={14} />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] sm:text-xs font-semibold truncate max-w-[80px] sm:max-w-none">{user.full_name}</span>
              <span className="text-[8px] opacity-70 hidden xs:block">{user.role}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </div>

          <AnimatePresence>
            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 text-gray-800"
                >
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tài khoản</p>
                    <p className="text-sm font-bold text-gray-800">{user.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{user.employee_id}</span>
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">{user.role}</span>
                    </div>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        navigateTo('hr-records');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                    >
                      <UserCircle size={18} className="text-gray-400" />
                      <span>Hồ sơ cá nhân</span>
                    </button>
                    <div className="h-px bg-gray-100 my-2 mx-2" />
                    <button 
                      onClick={() => setUser(null)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="font-bold">Đăng xuất</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Overlay for Mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed top-14 inset-x-0 bottom-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside 
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0 z-40 fixed lg:relative top-14 lg:top-0 h-[calc(100vh-3.5rem)] w-[280px] shadow-2xl lg:shadow-none"
            >
              <div className="p-4 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase">Menu</h2>
                </div>

                <div className="space-y-6">
                  <SidebarItem 
                    icon={LayoutDashboard} 
                    label="Trang chủ" 
                    active={currentPage === 'dashboard'} 
                    onClick={() => {
                      navigateTo('dashboard');
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }} 
                  />

                  {filteredMenuGroups.map((group, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-300 px-4 mb-2 tracking-wider">{group.title}</p>
                      {group.items.map((item) => (
                        <SidebarItem 
                          key={item.id}
                          icon={item.icon} 
                          label={item.label} 
                          active={currentPage === item.id} 
                          onClick={() => {
                            navigateTo(item.id);
                            if (window.innerWidth < 1024) setIsSidebarOpen(false);
                          }} 
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative bg-[#F8F9FA] pb-24 lg:pb-0">
          {renderContent()}
          
          <footer className="p-4 text-center text-[10px] text-gray-400 border-t border-gray-100 mt-auto">
            Hệ thống quản lý Con Đường Xanh CDX © 2025
          </footer>
        </main>
      </div>
      <BottomNav currentPage={currentPage} onNavigate={navigateTo} user={user} />
    </div>
  );
}
