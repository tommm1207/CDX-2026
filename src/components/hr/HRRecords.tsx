import { useState, useEffect, FormEvent } from 'react';
import { Users, Plus, Search, Edit, Trash2, X, Eye, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { FAB } from '../shared/FAB';
import { Button } from '../shared/Button';
import { SortButton, SortOption } from '../shared/SortButton';
import { checkUsage } from '@/utils/dataIntegrity';

export const HRRecords = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(
    (localStorage.getItem(`sort_pref_hr_${user.id}`) as SortOption) || 'newest',
  );

  useEffect(() => {
    localStorage.setItem(`sort_pref_hr_${user.id}`, sortBy);
  }, [sortBy]);

  const initialFormState = {
    id: '',
    code: '',
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
    role: 'User' as 'User' | 'Admin' | 'Admin App',
    data_view_permission: '',
    resign_date: '',
    initial_budget: 0,
    status: 'Đang làm việc',
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    let query = supabase.from('users').select('*').neq('status', 'Đã xóa');

    if (user.role !== 'Admin App') {
      query = query.neq('role', 'Admin App');
    }

    const { data, error } = await query.order('code');
    if (data) setEmployees(data);
    setLoading(false);
  };

  const generateNextEmployeeCode = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('code')
        .like('code', 'CDX%')
        .order('code', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastCode = data[0].code;
        const lastNumber = parseInt(lastCode.replace('CDX', ''));
        if (!isNaN(lastNumber)) {
          const nextNumber = lastNumber + 1;
          return `CDX${nextNumber.toString().padStart(3, '0')}`;
        }
      }
      return 'CDX001';
    } catch (err) {
      console.error('Error generating code:', err);
      return 'cdx001';
    }
  };

  const handleEdit = async (emp: Employee) => {
    if (emp.role === 'Admin App' && user.role !== 'Admin App') {
      if (addToast) addToast('Bạn không có quyền chỉnh sửa tài khoản Admin App', 'error');
      else alert('Bạn không có quyền chỉnh sửa tài khoản Admin App');
      return;
    }

    setFormData({
      ...emp,
      code: emp.code || '',
      dob: emp.dob || '',
      resign_date: emp.resign_date || '',
      email: emp.email || '',
      phone: emp.phone || '',
      id_card: emp.id_card || '',
      tax_id: emp.tax_id || '',
      department: emp.department || '',
      position: emp.position || '',
      data_view_permission: emp.data_view_permission || '',
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const [usageInfo, setUsageInfo] = useState<{
    inUse: boolean;
    tables: string[];
    details?: any[];
  }>({ inUse: false, tables: [] });

  const handleDeleteClick = async (id: string) => {
    setItemToDelete(id);
    const usage = await checkUsage('employee', id);
    setUsageInfo(usage);
    setShowDeleteModal(true);
  };

  const handlePurgeRelated = async () => {
    if (!itemToDelete || user.role !== 'Admin App' || !usageInfo.details) return;

    if (
      !window.confirm(
        'Bạn có chắc chắn muốn XÓA VĨNH VIỄN toàn bộ các dữ liệu rác liên quan này? Hành động này không thể hoàn tác.',
      )
    )
      return;

    setSubmitting(true);
    try {
      for (const detail of usageInfo.details) {
        if (detail.softDeletedCount > 0) {
          const { error } = await supabase
            .from(detail.table)
            .delete()
            .eq('employee_id', itemToDelete)
            .eq('status', 'Đã xóa');

          if (error && (detail.table === 'stock_in' || detail.table === 'stock_out')) {
            // Some tables might use different field names for relations, though usually it's employee_id or created_by
            // For now assuming employee_id as standard for many tables
          }
          if (error) throw error;
        }
      }

      if (addToast) addToast('Đã dọn dẹp các dữ liệu rác liên quan!', 'success');
      const usage = await checkUsage('employee', itemToDelete);
      setUsageInfo(usage);
    } catch (err: any) {
      if (addToast) addToast('Lỗi khi dọn dẹp: ' + err.message, 'error');
    } finally {
      setSubmitting(true);
      setTimeout(() => setSubmitting(false), 500);
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete || user.role !== 'Admin App') return;

    if (
      !window.confirm(
        'CẢNH BÁO: Hành động này sẽ xóa VĨNH VIỄN nhân sự này khỏi cơ sở dữ liệu. Bạn có chắc chắn muốn tiếp tục?',
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', itemToDelete);

      if (error) {
        let msg = error.message;
        if (msg.includes('foreign key constraint')) {
          msg = `Không thể xóa vĩnh viễn vì vẫn còn dữ liệu liên kết vật lý trong DB. Vui lòng dọn dẹp sạch các mục liên quan trước.`;
        }
        throw new Error(msg);
      }

      if (addToast) addToast('Đã xóa vĩnh viễn nhân sự khỏi hệ thống', 'success');
      fetchEmployees();
      setShowDeleteModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa vĩnh viễn: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const target = employees.find((e) => e.id === itemToDelete);
    if (target?.role === 'Admin App' && user.role !== 'Admin App') {
      if (addToast) addToast('Bạn không có quyền xóa tài khoản Admin App', 'error');
      else alert('Bạn không có quyền xóa tài khoản Admin App');
      return;
    }

    if (usageInfo.inUse) {
      if (addToast)
        addToast(
          `Không thể xóa vì nhân sự này đang được dùng trong: ${usageInfo.tables.join(', ')}`,
          'error',
        );
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'Đã xóa' })
        .eq('id', itemToDelete);
      if (error) throw error;
      fetchEmployees();
      if (addToast) addToast('Đã chuyển nhân sự vào thùng rác', 'success');
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi khi xóa nhân sự: ' + err.message, 'error');
      else alert('Lỗi khi xóa nhân sự: ' + err.message);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { id, ...rest } = formData;
      const dataToSubmit = {
        ...rest,
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
      };

      if (isEditing) {
        const { error } = await supabase.from('users').update(dataToSubmit).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('users').insert([dataToSubmit]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchEmployees();
      setFormData(initialFormState);
      setIsEditing(false);
      if (addToast)
        addToast(
          isEditing ? 'Cập nhật nhân sự thành công!' : 'Thêm mới nhân sự thành công!',
          'success',
        );
    } catch (err: any) {
      if (addToast) addToast('Lỗi khi lưu nhân sự: ' + err.message, 'error');
      else alert('Lỗi khi lưu nhân sự: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees
    .filter((emp) => {
      const matchesSearch =
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.code && emp.code.toLowerCase().includes(searchTerm.toLowerCase()));

      if (user.role !== 'Admin App' && emp.role === 'Admin App') {
        return false;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
      if (sortBy === 'date')
        return new Date(b.join_date || '').getTime() - new Date(a.join_date || '').getTime();
      return 0;
    });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <PageBreadcrumb title="Hồ sơ Nhân sự" onBack={onBack} />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 truncate">
          <Users size={20} className="text-primary flex-shrink-0" />{' '}
          <span className="truncate">Hồ sơ Nhân sự</span>
        </h2>
        <div className="flex items-center gap-2 justify-end flex-1">
          <SortButton
            currentSort={sortBy}
            onSortChange={(val) => {
              setSortBy(val);
              localStorage.setItem(`sort_pref_hr_${user.id}`, val);
            }}
            options={[
              { value: 'code', label: 'Mã hiệu' },
              { value: 'newest', label: 'Mới nhất' },
              { value: 'date', label: 'Ngày vào làm' },
            ]}
          />
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter((f) => !f)}
            icon={Search}
          />
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div className="relative lg:col-span-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
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
                <input
                  type="date"
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none"
                />
                <input
                  type="date"
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="overflow-x-auto custom-scrollbar pb-2">
          <table className="w-full text-left border-separate border-spacing-0 whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white text-[11px] uppercase tracking-wider whitespace-nowrap">
                <th className="p-3 first:rounded-tl-lg sticky left-0 bg-primary z-10">Mã NV</th>
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
                <tr>
                  <td colSpan={user.role === 'Admin App' ? 11 : 10} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm">Đang tải dữ liệu nhân sự...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={user.role === 'Admin App' ? 11 : 10} className="p-8 text-center">
                    Không tìm thấy nhân sự nào
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => handleEdit(emp)}
                    className="border-b border-gray-50 hover:bg-primary/5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <td className="p-3 font-bold text-gray-800 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-b border-gray-50">
                      {emp.code || emp.id.slice(0, 8)}
                    </td>
                    <td className="p-3">{emp.full_name}</td>
                    <td className="p-3">{emp.email || '-'}</td>
                    <td className="p-3">{emp.phone || '-'}</td>
                    <td className="p-3">{emp.join_date || '-'}</td>
                    {user.role === 'Admin App' && (
                      <td className="p-3 font-mono text-blue-600">
                        <div className="flex items-center gap-2 group/pass">
                          <span className="opacity-0 group-hover/pass:opacity-100 transition-opacity absolute bg-white px-2 py-1 rounded shadow-sm border border-gray-100 z-50 pointer-events-none -mt-8 ml-4">
                            {emp.app_pass}
                          </span>
                          <span>••••••••</span>
                          <Eye className="w-4 h-4 text-gray-400 group-hover/pass:text-blue-500 cursor-pointer" />
                        </div>
                      </td>
                    )}
                    <td className="p-3">{emp.department || '-'}</td>
                    <td className="p-3">{emp.position || '-'}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.role === 'Admin App'
                            ? 'bg-purple-100 text-purple-600'
                            : emp.role === 'Admin'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.status === 'Đang làm việc' || emp.status === 'Hoạt động'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(emp);
                          }}
                          icon={Edit}
                          iconSize={14}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(emp.id);
                          }}
                          icon={Trash2}
                          iconSize={14}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full text-center relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <div className="text-sm text-gray-500 mb-6 space-y-3 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p>
                  Nhân sự:{' '}
                  <strong>
                    {employees.find((e) => e.id === itemToDelete)?.full_name || itemToDelete}
                  </strong>
                </p>

                {usageInfo.details && usageInfo.details.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-red-600 font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider">
                      <AlertCircle size={14} /> Dữ liệu liên quan:
                    </p>
                    <div className="space-y-2">
                      {usageInfo.details.map((detail, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-gray-100 shadow-sm"
                        >
                          <span className="font-medium text-gray-700">{detail.label}</span>
                          <div className="flex gap-2">
                            {detail.count > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md font-bold">
                                {detail.count} Active
                              </span>
                            )}
                            {detail.softDeletedCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md font-bold">
                                {detail.softDeletedCount} Trash
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {user.role === 'Admin App' &&
                      usageInfo.details.some((d) => d.softDeletedCount > 0) && (
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          onClick={handlePurgeRelated}
                          isLoading={submitting}
                          className="mt-2 text-[10px] py-1 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                          icon={Trash2}
                        >
                          DỌN DẸP RÁC LIÊN QUAN (ADMIN)
                        </Button>
                      )}

                    {usageInfo.inUse && (
                      <p className="text-[10px] text-red-500 italic mt-1 leading-tight">
                        * Phải xóa các phiếu/dữ liệu 'Active' trước khi có thể xóa nhân sự này.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-green-600 font-bold flex items-center gap-2 justify-center py-2">
                    <CheckCircle size={18} /> Sẵn sàng để xóa
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button fullWidth variant="outline" onClick={() => setShowDeleteModal(false)}>
                    Hủy bỏ
                  </Button>
                  <Button
                    fullWidth
                    variant="danger"
                    onClick={confirmDelete}
                    disabled={usageInfo.inUse}
                  >
                    Thùng rác
                  </Button>
                </div>
                {user.role === 'Admin App' && (
                  <Button
                    variant="ghost"
                    className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                    fullWidth
                    onClick={handlePermanentDelete}
                    isLoading={submitting}
                    disabled={usageInfo.inUse}
                  >
                    XÓA VĨNH VIỄN (ADMIN APP)
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-4xl relative z-10 flex flex-col overflow-hidden max-h-[96vh] md:max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-4 sm:p-6 flex items-center justify-between text-white rounded-t-[1.5rem] md:rounded-t-[2.5rem] flex-shrink-0 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all active:scale-95"
                    onClick={() => setShowModal(false)}
                  >
                    <UserPlus size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg truncate">
                    {isEditing ? 'Cập Nhật Nhân Sự' : 'Thêm Mới Nhân Sự'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-2 mb-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Mã tham chiếu (Nhân viên)
                        </label>
                        <div className="bg-primary/5 px-5 py-3.5 rounded-2xl border border-primary/10 text-sm font-black text-primary uppercase shadow-inner italic">
                          {formData.code ||
                            `NV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-001`}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Họ và tên
                        </label>
                        <input
                          required
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Số điện thoại
                        </label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          CMND / CCCD
                        </label>
                        <input
                          type="text"
                          value={formData.id_card}
                          onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Ngày sinh
                        </label>
                        <input
                          type="date"
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Ngày vào làm
                        </label>
                        <input
                          type="date"
                          value={formData.join_date}
                          onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Mã số thuế
                        </label>
                        <input
                          type="text"
                          value={formData.tax_id}
                          onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      {user.role === 'Admin App' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Mật khẩu ứng dụng
                          </label>
                          <input
                            required
                            type="text"
                            value={formData.app_pass}
                            onChange={(e) => setFormData({ ...formData, app_pass: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Bộ phận
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Chức vụ
                        </label>
                        <input
                          type="text"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Có tính lương
                        </label>
                        <select
                          value={formData.has_salary ? 'true' : 'false'}
                          onChange={(e) =>
                            setFormData({ ...formData, has_salary: e.target.value === 'true' })
                          }
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="false">Không</option>
                          <option value="true">Có</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Phân quyền
                        </label>
                        <select
                          value={formData.role}
                          onChange={(e) =>
                            setFormData({ ...formData, role: e.target.value as any })
                          }
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="User">User</option>
                          <option value="Admin">Admin</option>
                          {user.role === 'Admin App' && (
                            <option value="Admin App">Admin App</option>
                          )}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Quyền xem dữ liệu
                        </label>
                        <input
                          type="text"
                          placeholder="VD: kho-a,kho-b (chức năng đang phát triển)"
                          value={formData.data_view_permission}
                          onChange={(e) =>
                            setFormData({ ...formData, data_view_permission: e.target.value })
                          }
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-[10px] text-gray-400 italic mt-1">
                          * Tính năng phân quyền theo kho đang được phát triển
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Ngày nghỉ việc
                        </label>
                        <input
                          type="date"
                          value={formData.resign_date}
                          onChange={(e) =>
                            setFormData({ ...formData, resign_date: e.target.value })
                          }
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Ngân sách đầu kỳ
                        </label>
                        <input
                          type="number"
                          value={formData.initial_budget}
                          onChange={(e) =>
                            setFormData({ ...formData, initial_budget: parseFloat(e.target.value) })
                          }
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Trạng thái
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="Đang làm việc">Đang làm việc</option>
                          <option value="Nghỉ việc">Nghỉ việc</option>
                        </select>
                      </div>
                    </div>

                  <div className="p-6 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                    <Button variant="ghost" onClick={() => setShowModal(false)}>
                      Hủy bỏ
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      variant="primary"
                      isLoading={submitting}
                      className="min-w-[120px]"
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
      {/* FAB — Thêm nhân sự */}
      <FAB
        onClick={async () => {
          const nextCode = await generateNextEmployeeCode();
          setFormData({ ...initialFormState, code: nextCode });
          setIsEditing(false);
          setShowModal(true);
        }}
        label="Thêm nhân sự"
        color="bg-primary"
      />
    </div>
  );
};
