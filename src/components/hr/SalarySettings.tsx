import { useState, useEffect, FormEvent } from 'react';
import { Settings2, X, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { NumericInput } from '../shared/NumericInput';
import { formatCurrency } from '../../utils/format';

export const SalarySettings = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    base_salary: 0,
    daily_rate: 0,
    insurance_deduction: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let empQuery = supabase.from('users').select('*').neq('status', 'Nghỉ việc');
    if (user.role !== 'Admin App') {
      empQuery = empQuery.neq('role', 'Admin App');
    }
    const { data: empData } = await empQuery.order('full_name');
    const { data: setData } = await supabase.from('salary_settings').select('*');

    if (empData) {
      const combined = empData.map(e => ({
        ...e,
        settings: setData?.find(s => s.employee_id === e.id) || { base_salary: 0, daily_rate: 0, insurance_deduction: 0 }
      }));
      setEmployees(combined);
    }
    setLoading(false);
  };

  const handleEdit = (emp: any) => {
    setSelectedEmp(emp);
    setFormData({
      base_salary: emp.settings.base_salary,
      daily_rate: emp.settings.daily_rate,
      insurance_deduction: emp.settings.insurance_deduction
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await supabase.from('salary_settings').upsert({
        employee_id: selectedEmp.id,
        ...formData
      }, { onConflict: 'employee_id' });
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Cài đặt lương" onBack={onBack} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings2 className="text-primary" /> Cài đặt lương
        </h2>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Nhân viên</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Lương/Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-20">Sửa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-gray-800">{emp.full_name}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-primary">{formatCurrency(emp.settings.daily_rate)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEdit(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
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
                <h3 className="font-bold text-lg">Thiết lập lương</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <NumericInput
                  label="Lương theo ngày công *"
                  required
                  value={formData.daily_rate}
                  onChange={(val) => setFormData({ ...formData, daily_rate: val })}
                />
                <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                  Cập nhật
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
