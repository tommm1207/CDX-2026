import { useState, useEffect, FormEvent } from 'react';
import { Warehouse, Plus, Search, Edit, Trash2, X, Navigation, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';

export const Warehouses = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
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
    code: '',
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
        .or('status.is.null,status.neq.Đã xóa')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching warehouses with join:', error);
        const { data: simpleData, error: simpleError } = await supabase
          .from('warehouses')
          .select('*')
          .or('status.is.null,status.neq.Đã xóa')
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
    let query = supabase.from('users').select('*');
    if (user.role !== 'Admin App') {
      query = query.neq('role', 'Admin App');
    }
    const { data } = await query;
    if (data) setEmployees(data);
  };

  const generateNextWarehouseCode = async () => {
    try {
      const { data } = await supabase
        .from('warehouses')
        .select('code')
        .like('code', 'WH%')
        .order('code', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].code) {
        const lastCode = data[0].code;
        const lastNumber = parseInt(lastCode.replace('WH', ''));
        if (!isNaN(lastNumber)) {
          const nextNumber = lastNumber + 1;
          return `WH${nextNumber.toString().padStart(3, '0')}`;
        }
      }
      return 'WH001';
    } catch (err) {
      console.error('Error generating warehouse code:', err);
      return 'WH001';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { id, ...dbPayload } = formData;
      if (isEditing && id) {
        const { error } = await supabase.from('warehouses').update(dbPayload).eq('id', id);
        if (error) throw error;
      } else {
        const nextCode = formData.code || await generateNextWarehouseCode();
        const { error } = await supabase.from('warehouses').insert([{ ...dbPayload, code: nextCode }]);
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
      code: item.code || '',
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
    const { error } = await supabase.from('warehouses').update({ status: 'Đã xóa' }).eq('id', itemToDelete);
    if (error) alert('Lỗi: ' + error.message);
    else {
      alert('Đã chuyển kho vào thùng rác');
      fetchWarehouses();
    }
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
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Danh sách Kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Warehouse className="text-primary" /> Danh sách Kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý hệ thống bãi đúc và kho bãi công trình</p>
        </div>
        <button
          onClick={async () => {
            const nextCode = await generateNextWarehouseCode();
            setFormData({ ...initialFormState, code: nextCode });
            setIsEditing(false);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {/* Simplified filters, same as in original App.tsx */}
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
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{item.code || item.id.slice(0, 8)}</td>
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
                      <div className="flex items-center justify-center gap-1 transition-opacity">
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
              <h3 className="text-lg font-bold text-gray-800 mb-2">Chuyển vào thùng rác?</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn chuyển kho <strong>{warehouses.find(w => w.id === itemToDelete)?.code || itemToDelete?.slice(0, 8)}</strong> vào thùng rác?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">Hủy bỏ</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">Di chuyển</button>
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
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã kho</label>
                        <input
                          required
                          type="text"
                          disabled={isEditing}
                          placeholder="Ví dụ: WH001"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Địa chỉ</label>
                        <input
                          type="text"
                          placeholder="Địa chỉ cụ thể..."
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân viên phụ trách</label>
                        <select
                          value={formData.manager_id}
                          onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">-- Chọn nhân sự --</option>
                          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.code || emp.id.slice(0, 8)})</option>)}
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
                            onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
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
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Sức chứa</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 1000 tấn"
                          value={formData.capacity}
                          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
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
