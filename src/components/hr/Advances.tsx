import { useState, useEffect, FormEvent } from 'react';
import { Plus, X, Edit2, Trash2, AlertTriangle, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { formatDate, formatCurrency } from '@/utils/format';
import { FAB } from '../shared/FAB';

export const Advances = ({ user, onBack, addToast, initialAction }: { user: Employee, onBack?: () => void, addToast?: (msg: string, type?: any) => void, initialAction?: string }) => {
  const [advances, setAdvances] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(initialAction === 'add');
  const [activeTab, setActiveTab] = useState<'advances' | 'allowances'>('advances');
  const [submitting, setSubmitting] = useState(false);
  const [allowanceOptions, setAllowanceOptions] = useState<{id: string, name: string}[]>([
    { id: 'Tiền cơm', name: 'Tiền cơm' },
    { id: 'Xăng xe', name: 'Xăng xe' },
    { id: 'Điện thoại', name: 'Điện thoại' },
    { id: 'Khác', name: 'Khác' }
  ]);

  const initialFormState = {
    employee_id: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    type: 'Tiền cơm'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: empData } = await supabase.from('users').select('*').neq('status', 'Nghỉ việc').neq('role', 'Admin App').order('full_name');
    if (empData) setEmployees(empData);

    const { data: advData } = await supabase.from('advances').select('*, users(full_name)').order('date', { ascending: false });
    if (advData) setAdvances(advData);

    const { data: allData } = await supabase.from('allowances').select('*, users(full_name)').order('date', { ascending: false });
    if (allData) {
      setAllowances(allData);
      
      // Extract unique types for the dropdown
      const dbTypes = allData
        .map(t => t.type)
        .filter(Boolean)
        .map(t => {
           if (t === 'meal') return 'Tiền cơm';
           if (t === 'travel') return 'Xăng xe';
           if (t === 'phone') return 'Điện thoại';
           if (t === 'other') return 'Khác';
           return t;
        });
      
      const uniqueTypes = Array.from(new Set(dbTypes));
      const baseOptions = [
        { id: 'Tiền cơm', name: 'Tiền cơm' },
        { id: 'Xăng xe', name: 'Xăng xe' },
        { id: 'Điện thoại', name: 'Điện thoại' },
        { id: 'Khác', name: 'Khác' }
      ];
      
      const mergedOptions = [...baseOptions];
      uniqueTypes.forEach(t => {
        if (!mergedOptions.find(o => o.id === t)) {
          mergedOptions.push({ id: t as string, name: t as string });
        }
      });
      setAllowanceOptions(mergedOptions);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        employee_id: formData.employee_id,
        amount: formData.amount,
        date: formData.date,
        type: activeTab === 'advances' ? 'Tạm ứng' : formData.type,
        notes: formData.notes
      };

      if (isEditing && selectedItem) {
        const { error } = await supabase.from(activeTab === 'advances' ? 'advances' : 'allowances').update(payload).eq('id', selectedItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(activeTab === 'advances' ? 'advances' : 'allowances').insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchData();
      setFormData(initialFormState);
      setIsEditing(false);
      setSelectedItem(null);
      if (addToast) addToast('Đã lưu dữ liệu thành công!', 'success');
      else alert('Đã lưu dữ liệu thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      employee_id: item.employee_id,
      amount: item.amount,
      date: item.date,
      notes: item.notes || '',
      type: item.type
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      console.log(`[CDX] Attempting to delete from ${activeTab}...`);
      if (addToast) addToast('Đang thực hiện xóa...', 'info');
      
      const table = activeTab === 'advances' ? 'advances' : 'allowances';
      const { error, status } = await supabase
        .from(table)
        .delete()
        .eq('id', deletingId);
      
      if (error) {
        console.error(`[CDX] Error deleting from ${table}:`, error);
        throw new Error(`${error.message} (Status: ${status})`);
      }
      
      console.log('[CDX] Deletion successful');
      if (addToast) addToast('Xóa thành công!', 'success');
      
      setShowDeleteModal(false);
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      console.error('[CDX] Deletion failed:', err);
      if (addToast) addToast('Không thể xóa: ' + err.message, 'error');
      else alert('Không thể xóa: ' + err.message);
    }
  };

  const confirmDelete = (id: string) => {
    console.log('[CDX] confirmDelete called for ID:', id);
    setDeletingId(id);
    setShowDeleteModal(true);
  };
  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Tạm ứng & Phụ cấp" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setActiveTab('advances')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'advances' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}>Tạm ứng</button>
          <button onClick={() => setActiveTab('allowances')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'allowances' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}>Phụ cấp</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto custom-scrollbar pb-2">
        <table className="w-full text-left border-collapse min-w-[600px] whitespace-nowrap">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Nhân viên</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Số tiền</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">{activeTab === 'advances' ? 'Lý do' : 'Loại / Ghi chú'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm">Đang tải dữ liệu...</p>
                  </div>
                </td>
              </tr>
            ) : (activeTab === 'advances' ? advances : allowances).length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Chưa có dữ liệu</td></tr>
            ) : (
              (activeTab === 'advances' ? advances : allowances).map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-gray-50 transition-colors group cursor-pointer"
                  onClick={() => handleEdit(item)}
                >
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-800">{item.users?.full_name}</td>
                  <td className="px-4 py-3 text-xs font-black text-red-600">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 italic">
                    <div className="flex items-center justify-between">
                      <span>
                        {(item.notes || item.type) ? (
                          (item.type === 'meal' ? 'Tiền cơm' : 
                          item.type === 'travel' ? 'Xăng xe' : 
                          item.type === 'phone' ? 'Điện thoại' : 
                          item.type === 'other' ? 'Khác' : 
                          (item.notes || item.type))
                        ) : '-'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }} 
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100" 
                          title="Sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('[CDX] Delete button clicked for item:', item.id);
                            confirmDelete(item.id);
                          }} 
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100" 
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => { setShowModal(false); setIsEditing(false); setSelectedItem(null); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden m-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-[2rem] md:rounded-t-[2.5rem] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => { setShowModal(false); setIsEditing(false); setSelectedItem(null); }}
                  >
                    <Wallet size={24} />
                  </div>
                  <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật' : 'Thêm'} {activeTab === 'advances' ? 'tạm ứng' : 'phụ cấp'}</h3>
                </div>
                <button 
                  onClick={() => { setShowModal(false); setIsEditing(false); setSelectedItem(null); }} 
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân viên *</label>
                  <select required value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày *</label>
                  <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <NumericInput
                  label="Số tiền *"
                  required
                  value={formData.amount}
                  onChange={(val) => setFormData({ ...formData, amount: val })}
                />
                {activeTab === 'allowances' && (
                  <CreatableSelect
                    label="Loại phụ cấp"
                    value={formData.type}
                    options={allowanceOptions}
                    onChange={(val) => setFormData({ ...formData, type: val })}
                    onCreate={(val) => {
                      if (!allowanceOptions.find(o => o.id === val)) {
                        setAllowanceOptions(prev => [...prev, { id: val, name: val }]);
                      }
                      setFormData({ ...formData, type: val });
                    }}
                    placeholder="Chọn hoặc nhập loại mới..."
                  />
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú / Lý do</label>
                  <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <div 
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowDeleteModal(false); setDeletingId(null); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-red-100">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Xóa vĩnh viễn</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Bạn có chắc chắn muốn xóa vĩnh viễn mục này không?
                </p>
                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-[11px] font-bold text-red-600 leading-tight">
                    Hành động này sẽ giải phóng dữ liệu liên quan và KHÔNG THỂ hoàn tác!
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => { setShowDeleteModal(false); setDeletingId(null); }} 
                  className="py-3 px-4 rounded-xl bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleDelete} 
                  className="py-3 px-4 rounded-xl bg-red-600 text-white text-sm font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Xóa vĩnh viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* FAB — Thêm tạm ứng/phụ cấp */}
      <FAB
        onClick={() => setShowModal(true)}
        label={activeTab === 'advances' ? 'Thêm tạm ứng' : 'Thêm phụ cấp'}
      />
    </div>
  );
};
