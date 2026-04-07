import { useState, useEffect } from 'react';
import { Bell, Plus, Search, X, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';

export const Reminders = ({ user, onBack, addToast, initialAction }: { 
  user: Employee, 
  onBack: () => void, 
  addToast?: (message: string, type?: ToastType) => void,
  initialAction?: string 
}) => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetReminder, setShowSetReminder] = useState(false);
  const [showAddNew, setShowAddNew] = useState(initialAction === 'add');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const getDefaultTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    employee: '',
    search: ''
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    reminder_time: getDefaultTime(),
    browser_notification: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: remData } = await supabase.from('reminders').select('*').order('reminder_time', { ascending: false });
    if (remData) setReminders(remData);

    let empQuery = supabase.from('users').select('*').neq('status', 'Nghỉ việc');
    if (user.role !== 'Admin App') {
      empQuery = empQuery.neq('role', 'Admin App');
    }
    const { data: empData } = await empQuery.order('code');
    if (empData) setEmployees(empData);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        reminder_time: new Date(formData.reminder_time).toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from('reminders').update(payload).eq('id', editingId);
        if (error) throw error;
        if (addToast) addToast('Đã cập nhật lịch nhắc thành công', 'success');
      } else {
        const { error } = await supabase.from('reminders').insert([{ ...payload, status: 'pending' }]);
        if (error) throw error;
        if (addToast) addToast('Đã thêm mới lịch nhắc thành công', 'success');
      }

      setShowSetReminder(false);
      setShowAddNew(false);
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        reminder_time: getDefaultTime(),
        browser_notification: true
      });
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    }
  };

  const handleEdit = (rem: any) => {
    const d = new Date(rem.reminder_time);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localStr = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setFormData({
      title: rem.title || '',
      content: rem.content || '',
      reminder_time: localStr,
      browser_notification: rem.browser_notification ?? true
    });
    setEditingId(rem.id);
    setShowSetReminder(true);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
  };

  const executeDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase.from('reminders').update({ status: 'Đã xóa' }).eq('id', deletingId);
      if (error) throw error;
      if (addToast) addToast('Đã chuyển lịch nhắc vào thùng rác', 'success');
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
      setDeletingId(null);
    }
  };

  const filteredReminders = reminders.filter(r => {
    if (filters.fromDate && r.reminder_time < filters.fromDate) return false;
    if (filters.toDate && r.reminder_time > filters.toDate) return false;
    if (filters.search && !r.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Thiết lập Lịch nhắc" onBack={onBack} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(f => !f)}
            className={`p-2.5 rounded-xl border transition-colors ${
              showFilter ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
            }`}
          >
            <Search size={16} />
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ title: '', content: '', reminder_time: getDefaultTime(), browser_notification: true });
              setShowSetReminder(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <Bell size={18} /> Đặt lịch nhắc
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ title: '', content: '', reminder_time: getDefaultTime(), browser_notification: true });
              setShowAddNew(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Plus size={18} /> Thêm mới
          </button>
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
                  <input type="date" value={filters.fromDate} onChange={e => setFilters({ ...filters, fromDate: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
                  <input type="date" value={filters.toDate} onChange={e => setFilters({ ...filters, toDate: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự</label>
                  <select value={filters.employee} onChange={e => setFilters({ ...filters, employee: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                    <option value="">-- Tất cả --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
                  <select className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                    <option value="">-- Tất cả kho --</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="Gõ để tìm..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
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
            <Bell size={18} /> Danh sách lịch nhắc tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Đã nhắc (Trạng thái)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Mã nhắc nhở</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Thời gian nhắc</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Nội dung</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Tiêu đề</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredReminders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">Không có lịch nhắc nào</td></tr>
              ) : filteredReminders.map((rem) => (
                <tr 
                  key={rem.id} 
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  onClick={() => handleEdit(rem)}
                >
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${rem.status === 'reminded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {rem.status === 'reminded' ? 'Đã nhắc' : 'Chờ nhắc'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(rem.reminder_time).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{rem.content}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{rem.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(rem); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); confirmDelete(rem.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showSetReminder && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowSetReminder(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 m-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-white flex items-center justify-between bg-primary rounded-t-[2rem] md:rounded-t-[2.5rem] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowSetReminder(false)}
                  >
                    <Bell size={20} />
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-wide">{editingId ? 'Sửa lịch nhắc' : 'Đặt lịch nhắc'}</h3>
                </div>
                <button 
                  onClick={() => setShowSetReminder(false)} 
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tiêu đề <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="VD: Họp giao ban sáng..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung chi tiết</label>
                  <textarea
                    placeholder="Mô tả thêm..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Thời gian nhắc <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={formData.reminder_time}
                    onChange={e => setFormData({ ...formData, reminder_time: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <input
                    type="checkbox"
                    id="notify"
                    checked={formData.browser_notification}
                    onChange={e => setFormData({ ...formData, browser_notification: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="notify" className="text-sm text-gray-700 font-medium cursor-pointer">Nhắc qua thông báo trình duyệt</label>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3 flex-shrink-0">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Bell size={18} /> {editingId ? 'Cập nhật' : 'Đặt nhắc'}
                </button>
                <button onClick={() => setShowSetReminder(false)} className="px-6 py-3 bg-gray-400 text-white rounded-xl font-bold text-sm hover:bg-gray-500 transition-all">Hủy</button>
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
                    onClick={() => setShowAddNew(false)}
                  >
                    <Bell size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold tracking-wide">Thêm Mới</h3>
                </div>
                <button 
                  onClick={() => setShowAddNew(false)} 
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Đã nhắc (Trạng thái)</label>
                    <input 
                      type="text" 
                      value="pending" 
                      disabled 
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 mt-1" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Thời gian nhắc</label>
                    <input 
                      type="datetime-local" 
                      value={formData.reminder_time}
                      onChange={e => setFormData({ ...formData, reminder_time: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung</label>
                    <textarea 
                      value={formData.content}
                      onChange={e => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[80px]" 
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tiêu đề</label>
                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                <button onClick={() => setShowAddNew(false)} className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition-all">Hủy bỏ</button>
                <button onClick={handleSave} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">Lưu dữ liệu</button>
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
                <p className="text-gray-500 text-sm">Bạn có chắc chắn muốn chuyển lịch nhắc này vào thùng rác?</p>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Hủy</button>
                  <button onClick={executeDelete} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">Di chuyển</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
