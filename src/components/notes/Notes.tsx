import { useState, useEffect } from 'react';
import { FileText, Plus, Search, X, Save, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { isActiveWarehouse } from '@/utils/inventory';
import { ToastType } from '../shared/Toast';
import { FAB } from '../shared/FAB';
import { Button } from '../shared/Button';

export const WEATHER_OPTIONS = [
  { value: 'sunny', label: '☀️ Nắng nóng gay gắt' },
  { value: 'sudden-rain', label: '⛈️ Mưa rào đột ngột' },
  { value: 'cloudy', label: '☁️ Trời âm u, oi bức' },
  { value: 'long-rain', label: '🌧️ Mưa dầm kéo dài' },
  { value: 'strong-wind', label: '💨 Gió giật mạnh trong cơn dông' },
  { value: 'thunderstorm', label: '🌩️ Sấm chớp dữ dội' },
  { value: 'flood', label: '🌊 Ngập lụt cục bộ' },
  { value: 'cool', label: '🌬️ Trời se lạnh vào sáng sớm' },
  { value: 'smog', label: '🌫️ Sương mù quang hóa' },
  { value: 'pleasant', label: '🌤️ Trời trong xanh, nắng dịu' },
];

export const Notes = ({ user, onBack, addToast, initialAction, setHideBottomNav }: { 
  user: Employee, 
  onBack: () => void, 
  addToast?: (msg: string, type?: ToastType) => void, 
  initialAction?: string,
  setHideBottomNav?: (hide: boolean) => void 
}) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNew, setShowAddNew] = useState(initialAction === 'add');
  const [showQuickNote, setShowQuickNote] = useState(false);

  useEffect(() => {
    if (setHideBottomNav) {
      setHideBottomNav(showAddNew || showQuickNote);
    }
  }, [showAddNew, showQuickNote, setHideBottomNav]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    employee: '',
    warehouse: '',
    search: ''
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    weather: '',
    related_object: '',
    object_code: '',
    note_code: '',
    location: '',
    related_personnel: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: notesData } = await supabase.from('notes').select('*, users(full_name)').order('created_at', { ascending: false });
    if (notesData) setNotes(notesData);

    let empQuery = supabase.from('users').select('*').neq('status', 'Nghỉ việc');
    if (user.role !== 'Admin App') {
      empQuery = empQuery.neq('role', 'Admin App');
    }
    const { data: empData } = await empQuery.order('full_name');
    if (empData) setEmployees(empData);

    const { data: whData } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (whData) {
      setWarehouses(whData.filter(isActiveWarehouse));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.content) {
      if (addToast) addToast('Vui lòng nhập nội dung ghi chú', 'error');
      return;
    }

    try {
      // Auto-compute related_object from selected personnel
      const computedRelatedObject = formData.related_personnel.length > 0
        ? employees.filter(e => formData.related_personnel.includes(e.id)).map(e => e.full_name).join(', ')
        : "Tất cả nhân viên"; // fallback

      const payload = {
        title: formData.title,
        content: formData.content,
        date: formData.date,
        weather: formData.weather,
        related_object: computedRelatedObject,
        object_code: formData.object_code,
        note_code: formData.note_code,
        location: formData.location,
        related_personnel: formData.related_personnel,
        created_by: user.id
      };

      if (editingId) {
        const { error } = await supabase.from('notes').update(payload).eq('id', editingId);
        if (error) throw error;
        if (addToast) addToast('Cập nhật ghi chú thành công!', 'success');
      } else {
        const { error } = await supabase.from('notes').insert([payload]);
        if (error) throw error;
        if (addToast) addToast('Lưu ghi chú thành công!', 'success');
      }

      setShowQuickNote(false);
      setShowAddNew(false);
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0],
        weather: '',
        related_object: '',
        object_code: '',
        note_code: '',
        location: '',
        related_personnel: []
      });
      fetchData();
    } catch (error: any) {
      if (addToast) addToast('Lỗi: ' + error.message, 'error');
    }
  };

  const handleEdit = (note: any) => {
    setFormData({
      title: note.title || '',
      content: note.content || '',
      date: note.date || new Date().toISOString().split('T')[0],
      weather: note.weather || '',
      related_object: note.related_object || '',
      object_code: note.object_code || '',
      note_code: note.note_code || '',
      location: note.location || '',
      related_personnel: note.related_personnel || []
    });
    setEditingId(note.id);
    setShowAddNew(true);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
  };

  const executeDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase.from('notes').update({ status: 'Đã xóa' }).eq('id', deletingId);
      if (error) throw error;
      if (addToast) addToast('Đã chuyển ghi chú vào thùng rác', 'success');
      setDeletingId(null);
      fetchData();
    } catch (error: any) {
      if (addToast) addToast('Lỗi khi xóa: ' + error.message, 'error');
      setDeletingId(null);
    }
  };

  const filteredNotes = notes.filter(n => {
    if (filters.fromDate && n.date < filters.fromDate) return false;
    if (filters.toDate && n.date > filters.toDate) return false;
    if (filters.employee && n.created_by !== filters.employee) return false;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const titleMatch = (n.title || "").toLowerCase().includes(searchLower);
      const contentMatch = (n.content || "").toLowerCase().includes(searchLower);
      if (!(titleMatch || contentMatch)) return false;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Nhật ký & Ghi chú" onBack={onBack} />
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter(f => !f)}
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
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={e => setFilters({ ...filters, toDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự</label>
                  <select
                    value={filters.employee}
                    onChange={e => setFilters({ ...filters, employee: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  >
                    <option value="">-- Tất cả --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
                  <select
                    value={filters.warehouse}
                    onChange={e => setFilters({ ...filters, warehouse: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  >
                    <option value="">-- Tất cả kho --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Gõ để tìm..."
                      value={filters.search}
                      onChange={e => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-primary/5">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
            <FileText size={18} /> Bảng ghi chú tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Tiêu đề / Nội dung</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Đối tượng liên quan</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Mã đối tượng</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Mã ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredNotes.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Không có ghi chú nào</td></tr>
              ) : filteredNotes.map((note) => (
                <tr 
                  key={note.id} 
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  onClick={() => handleEdit(note)}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-gray-900 leading-tight">{note.title || 'Không có tiêu đề'}</span>
                      <span className="text-xs text-gray-500 truncate max-w-[300px]">{note.content}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{note.related_object || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{note.object_code || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{note.note_code || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                        icon={Edit}
                        iconSize={14}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); confirmDelete(note.id); }}
                        icon={Trash2}
                        iconSize={14}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showQuickNote && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowQuickNote(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-white flex items-center justify-between bg-amber-500 rounded-t-[2rem] md:rounded-t-[2.5rem]">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowQuickNote(false)}
                  >
                    <FileText size={20} />
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-wide">Ghi chú nhanh</h3>
                </div>
                <button 
                  onClick={() => setShowQuickNote(false)} 
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tiêu đề</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                    placeholder="VD: Nhật ký công trình sáng..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung <span className="text-red-500">*</span></label>
                  <textarea
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[100px]"
                    placeholder="Nhập nội dung ghi chú..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Thời tiết</label>
                    <select
                      value={formData.weather}
                      onChange={e => setFormData({ ...formData, weather: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                    >
                      <option value="">-- Chọn --</option>
                      {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự liên quan <span className="text-gray-400 font-normal italic">- Chọn nhiều</span></label>
                  <div className="mt-1 border border-gray-200 rounded-xl max-h-40 overflow-y-auto bg-white/50">
                    {employees.map(emp => (
                      <label key={emp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.related_personnel.includes(emp.id)}
                          onChange={e => {
                            const newPersonnel = e.target.checked
                              ? [...formData.related_personnel, emp.id]
                              : formData.related_personnel.filter(id => id !== emp.id);
                            setFormData({ ...formData, related_personnel: newPersonnel });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700 font-medium truncate">{emp.full_name} <span className="text-gray-400 text-xs font-normal">({emp.code})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Lưu ghi chú
                </button>
                <button onClick={() => setShowQuickNote(false)} className="px-6 py-3 bg-gray-400 text-white rounded-xl font-bold text-sm hover:bg-gray-500 transition-all">Hủy</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddNew && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowAddNew(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 m-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-white flex items-center justify-between bg-primary rounded-t-[2rem] md:rounded-t-[2.5rem] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => { setShowAddNew(false); setEditingId(null); }}
                  >
                    <FileText size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold tracking-wide">{editingId ? 'Chỉnh sửa ghi chú' : 'Thêm Mới'}</h3>
                </div>
                <button 
                  onClick={() => { setShowAddNew(false); setEditingId(null); }} 
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tiêu đề</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                      placeholder="VD: Nhật ký công trình sáng..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự liên quan <span className="text-gray-400 font-normal italic">- Chọn nhiều</span></label>
                    <div className="mt-1 border border-gray-200 rounded-xl max-h-48 overflow-y-auto bg-white/50">
                      {employees.map(emp => (
                        <label key={emp.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.related_personnel.includes(emp.id)}
                            onChange={e => {
                              const newPersonnel = e.target.checked
                                ? [...formData.related_personnel, emp.id]
                                : formData.related_personnel.filter(id => id !== emp.id);
                              setFormData({ ...formData, related_personnel: newPersonnel });
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                          />
                          <span className="text-sm text-gray-700 font-medium truncate">{emp.full_name} <span className="text-gray-400 text-xs font-normal">({emp.code})</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã ghi chú</label>
                    <input type="text" value={formData.note_code} onChange={e => setFormData({ ...formData, note_code: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày tạo</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung</label>
                    <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[80px]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Thời tiết</label>
                    <select value={formData.weather} onChange={e => setFormData({ ...formData, weather: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                      <option value="">-- Chọn --</option>
                      {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã đối tượng</label>
                    <input type="text" value={formData.object_code} onChange={e => setFormData({ ...formData, object_code: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Vị trí / Tọa độ</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" placeholder="0.000000, 0.000000" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Người tạo</label>
                    <input type="text" value={user.full_name} disabled className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 mt-1" />
                  </div>
                  <div className="flex-1" />
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                <Button 
                  variant="ghost"
                  onClick={() => { setShowAddNew(false); setEditingId(null); }}
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  icon={Save}
                >
                  {editingId ? 'Cập nhật dữ liệu' : 'Lưu dữ liệu'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingId(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 w-full max-w-sm">
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Chuyển vào thùng rác?</h3>
                <p className="text-gray-500 text-sm">Bạn có chắc chắn muốn chuyển ghi chú này vào thùng rác?</p>
                <div className="flex gap-3 pt-4">
                  <Button 
                    fullWidth
                    variant="outline"
                    onClick={() => setDeletingId(null)}
                  >
                    Hủy
                  </Button>
                  <Button 
                    fullWidth
                    variant="danger"
                    onClick={executeDelete}
                  >
                    Di chuyển
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <FAB 
        onClick={() => {
          setEditingId(null);
          setFormData({
            content: '',
            date: new Date().toISOString().split('T')[0],
            weather: '',
            related_object: '',
            object_code: '',
            note_code: '',
            location: '',
            related_personnel: []
          });
          setShowAddNew(true);
        }}
        label="Thêm ghi chú mới"
        color="bg-amber-500"
      />
    </div>
  );
};
