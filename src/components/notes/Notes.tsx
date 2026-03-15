import { useState, useEffect } from 'react';
import { FileText, Plus, Search, X, Save, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';

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

export const Notes = ({ user, onBack }: { user: Employee, onBack: () => void }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    employee: '',
    warehouse: '',
    search: ''
  });

  const [formData, setFormData] = useState({
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

    const { data: whData } = await supabase.from('warehouses').select('*').order('name');
    if (whData) setWarehouses(whData);
    setLoading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase.from('notes').insert([{
      ...formData,
      created_by: user.id
    }]);
    if (!error) {
      setShowQuickNote(false);
      setShowAddNew(false);
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
      fetchData();
    }
  };

  const filteredNotes = notes.filter(n => {
    if (filters.fromDate && n.date < filters.fromDate) return false;
    if (filters.toDate && n.date > filters.toDate) return false;
    if (filters.employee && n.created_by !== filters.employee) return false;
    if (filters.search && !n.content.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Nhật ký / Ghi chú" onBack={onBack} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickNote(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
          >
            <FileText size={18} /> Ghi chú nhanh
          </button>
          <button
            onClick={() => setShowAddNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Plus size={18} /> Thêm mới
          </button>
        </div>
      </div>

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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-primary/5">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
            <FileText size={18} /> Bảng ghi chú tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Đối tượng liên quan</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Mã đối tượng</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Mã ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Vị trí / Tọa độ</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredNotes.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Không có ghi chú nào</td></tr>
              ) : filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-700">{note.related_object || 'N/A'}</p>
                    <p className="text-[10px] text-gray-400">{note.content}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{note.object_code || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{note.note_code || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{note.location || '0.000000, 0.000000'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                      <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQuickNote(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-amber-50">
                <h3 className="text-lg font-bold text-amber-700 flex items-center gap-2 uppercase tracking-wide">
                  <FileText size={20} /> Ghi chú nhanh
                </h3>
                <button onClick={() => setShowQuickNote(false)} className="p-2 hover:bg-amber-100 rounded-full transition-colors"><X size={20} className="text-amber-700" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đối tượng liên quan</label>
                  <input
                    type="text"
                    placeholder="VD: Chuẩn bị vật tư..."
                    value={formData.related_object}
                    onChange={e => setFormData({ ...formData, related_object: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự liên quan</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto p-2 border border-gray-100 rounded-xl">
                    {employees.map(emp => (
                      <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.related_personnel.includes(emp.id)}
                          onChange={e => {
                            const newPersonnel = e.target.checked
                              ? [...formData.related_personnel, emp.id]
                              : formData.related_personnel.filter(id => id !== emp.id);
                            setFormData({ ...formData, related_personnel: newPersonnel });
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-gray-600 truncate">{emp.full_name}</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddNew(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden relative z-10">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-primary">
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">Thêm Mới</h3>
                <button onClick={() => setShowAddNew(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-white" /></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Đối tượng liên quan</label>
                    <input type="text" value={formData.related_object} onChange={e => setFormData({ ...formData, related_object: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
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
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú thêm</label>
                    <textarea className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[80px]" placeholder="Ghi chú thêm..." />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setShowAddNew(false)} className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition-all">Hủy bỏ</button>
                <button onClick={handleSave} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">Lưu dữ liệu</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
