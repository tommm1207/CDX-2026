import { useState, useEffect, FormEvent } from 'react';
import { Warehouse, Plus, Search, Edit, Trash2, X, Navigation, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { Button } from '../shared/Button';
import { FAB } from '../shared/FAB';

export const Warehouses = ({ user, onBack, addToast }: { 
  user: Employee, 
  onBack?: () => void,
  addToast?: (message: string, type?: ToastType) => void 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
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
      if (addToast) addToast('Lỗi tải dữ liệu kho: ' + err.message, 'error');
      else alert('Lỗi tải dữ liệu kho: ' + err.message);
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
      if (addToast) addToast(isEditing ? 'Cập nhật kho thành công!' : 'Thêm mới kho thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
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
    if (error) {
      const msg = error.message.includes('foreign key constraint') 
        ? 'Không thể xóa kho này vì đang có dữ liệu liên quan khác.' 
        : error.message;
      if (addToast) addToast('Lỗi: ' + msg, 'error');
      else alert('Lỗi: ' + msg);
    } else {
      if (addToast) addToast('Đã chuyển kho vào thùng rác', 'success');
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
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Danh sách Kho" onBack={onBack} />
        <button
          onClick={() => setShowFilter(f => !f)}
          className={`p-2.5 rounded-xl border transition-colors ${
            showFilter ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
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
                <select 
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => {
                    // Logic lọc nội bộ nếu cần
                  }}
                >
                  <option value="">-- Tất cả kho --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
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
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
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
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => handleEdit(item)}
                  >
                    <td className="px-4 py-3 text-xs text-gray-600">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.address}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.users?.full_name || item.manager_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[100px]">{item.coordinates}</span>
                        {item.coordinates && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openInGoogleMaps(item.coordinates); }}
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
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
              <h3 className="text-lg font-bold text-gray-800 mb-2">Chuyển vào thùng rác?</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn chuyển kho <strong>{warehouses.find(w => w.id === itemToDelete)?.code || itemToDelete?.slice(0, 8)}</strong> vào thùng rác?</p>
              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={() => setShowDeleteModal(false)}>Hủy bỏ</Button>
                <Button variant="danger" fullWidth onClick={confirmDelete}>Di chuyển</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowModal(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer">
                    <Warehouse size={24} />
                  </button>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật thông tin kho' : 'Thêm mới kho bãi'}</h3>
                    <p className="text-xs text-white/70">Vui lòng điền đầy đủ thông tin chi tiết</p>
                  </div>
                </div>
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
                    <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                    <Button
                      type="submit"
                      isLoading={submitting}
                      className="min-w-[140px]"
                    >
                      Lưu dữ liệu
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* FAB — Thêm kho */}
      <FAB
        onClick={async () => {
          const nextCode = await generateNextWarehouseCode();
          setFormData({ ...initialFormState, code: nextCode });
          setIsEditing(false);
          setShowModal(true);
        }}
        label="Thêm kho mới"
      />
    </div>
  );
};
