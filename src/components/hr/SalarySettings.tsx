import { useState, useEffect, FormEvent } from 'react';
import { Settings2, X, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { Button } from '../shared/Button';
import { NumericInput } from '../shared/NumericInput';
import { ToastType } from '../shared/Toast';
import { formatCurrency } from '@/utils/format';

export const SalarySettings = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    base_salary: 0,
    daily_rate: 0,
    insurance_deduction: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let empQuery = supabase
      .from('users')
      .select('*')
      .neq('status', 'Nghỉ việc')
      .eq('has_salary', true);
    if (user.role !== 'Admin App') {
      empQuery = empQuery.neq('role', 'Admin App');
    }
    const { data: empData } = await empQuery.order('code');
    const { data: setData } = await supabase.from('salary_settings').select('*');

    if (empData) {
      const combined = empData.map((e) => ({
        ...e,
        settings: setData?.find((s) => s.employee_id === e.id) || {
          base_salary: 0,
          daily_rate: 0,
          insurance_deduction: 0,
        },
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
      insurance_deduction: emp.settings.insurance_deduction,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await supabase.from('salary_settings').upsert(
        {
          employee_id: selectedEmp.id,
          ...formData,
        },
        { onConflict: 'employee_id' },
      );
      setShowModal(false);
      fetchData();
      if (addToast) addToast('Cập nhật cài đặt lương thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Cài đặt lương" onBack={onBack} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                Nhân viên
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                Lương/Ngày
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-20">
                Sửa
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">
                  Đang tải...
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => handleEdit(emp)}
                >
                  <td className="px-4 py-3 text-xs font-bold text-gray-800">{emp.full_name}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-primary">
                    {formatCurrency(emp.settings.daily_rate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(emp);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={14} />
                    </button>
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
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowModal(false)}
                  >
                    <Settings2 size={24} />
                  </div>
                  <h3 className="font-bold text-lg">Thiết lập lương</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 mb-2">
                  <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest mb-1 italic">
                    Nhân viên
                  </p>
                  <p className="text-sm font-black text-gray-800">{selectedEmp?.full_name}</p>
                </div>

                <NumericInput
                  label="Lương theo ngày công (8h) *"
                  required
                  value={formData.daily_rate}
                  onChange={(val) => setFormData({ ...formData, daily_rate: val })}
                />

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" fullWidth onClick={() => setShowModal(false)}>
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={submitting}
                    className="shadow-lg shadow-primary/20"
                  >
                    Cập nhật
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
