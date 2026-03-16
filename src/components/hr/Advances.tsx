import { useState, useEffect, FormEvent } from 'react';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { formatDate, formatCurrency } from '../../utils/format';

export const Advances = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [advances, setAdvances] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'advances' | 'allowances'>('advances');
  const [submitting, setSubmitting] = useState(false);

  const initialFormState = {
    employee_id: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reason: '',
    type: 'meal'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

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
    if (allData) setAllowances(allData);
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
        notes: formData.reason
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
      reason: item.notes || '',
      type: item.type
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
    try {
      const { error } = await supabase.from(activeTab === 'advances' ? 'advances' : 'allowances').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Tạm ứng & Phụ cấp" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setActiveTab('advances')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'advances' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}>Tạm ứng</button>
          <button onClick={() => setActiveTab('allowances')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'allowances' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}>Phụ cấp</button>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20">
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto custom-scrollbar pb-2">
        <table className="w-full text-left border-collapse min-w-[600px]">
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
                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-800">{item.users?.full_name}</td>
                  <td className="px-4 py-3 text-xs font-black text-red-600">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 italic">
                    <div className="flex items-center justify-between">
                      <span>{item.reason || item.notes || item.type || '-'}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật' : 'Thêm'} {activeTab === 'advances' ? 'tạm ứng' : 'phụ cấp'} mới</h3>
                <button onClick={() => { setShowModal(false); setIsEditing(false); setSelectedItem(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
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
                    options={[
                      { id: 'meal', name: 'Tiền cơm' },
                      { id: 'travel', name: 'Xăng xe' },
                      { id: 'phone', name: 'Điện thoại' },
                      { id: 'other', name: 'Khác' }
                    ]}
                    onChange={(val) => setFormData({ ...formData, type: val })}
                    onCreate={(val) => setFormData({ ...formData, type: val })}
                    placeholder="Chọn hoặc nhập loại mới..."
                  />
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú / Lý do</label>
                  <textarea rows={3} value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
