import { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Users,
  User,
  Share2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { parseReminderContent, serializeReminderContent } from '@/utils/reminderUtils';
import { FAB } from '../shared/FAB';
import { Button } from '../shared/Button';
import { ConfirmModal } from '../shared/ConfirmModal';
import { checkUsage } from '@/utils/dataIntegrity';

export const Reminders = ({
  user,
  onBack,
  addToast,
  initialAction,
  setHideBottomNav,
}: {
  user: Employee;
  onBack: () => void;
  addToast?: (message: string, type?: ToastType) => void;
  initialAction?: string;
  setHideBottomNav?: (hide: boolean) => void;
}) => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetReminder, setShowSetReminder] = useState(initialAction === 'add');
  const [showAddNew, setShowAddNew] = useState(false);

  useEffect(() => {
    if (setHideBottomNav) {
      setHideBottomNav(showSetReminder || showAddNew);
    }
  }, [showSetReminder, showAddNew, setHideBottomNav]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showFilter, setShowFilter] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<any>({ inUse: false, details: [] });
  const [submitting, setSubmitting] = useState(false);

  const getDefaultTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    employee: '',
    search: '',
  });

  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    reminder_time: string;
    browser_notification: boolean;
    assignees: string[];
    show_assignees: boolean;
  }>({
    title: '',
    content: '',
    reminder_time: getDefaultTime(),
    browser_notification: true,
    assignees: [],
    show_assignees: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: remData } = await supabase
      .from('reminders')
      .select('*, sender:users!created_by(full_name)')
      .or('status.is.null,status.neq.Đã xóa')
      .order('reminder_time', { ascending: false });
    if (remData) setReminders(remData);

    let empQuery = supabase.from('users').select('*').neq('status', 'Nghỉ việc');
    if (user.role !== 'Develop') {
      empQuery = empQuery.neq('role', 'Develop');
    }
    const { data: empData } = await empQuery.order('code');
    if (empData) setEmployees(empData);
    setLoading(false);
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        content: serializeReminderContent(
          formData.content,
          formData.assignees,
          formData.show_assignees,
        ),
        browser_notification: formData.browser_notification,
        reminder_time: new Date(formData.reminder_time).toISOString(),
        created_by: user.id,
      };

      if (editingId) {
        const { error } = await supabase.from('reminders').update(payload).eq('id', editingId);
        if (error) throw error;
        if (addToast) addToast('Đã cập nhật lịch nhắc thành công', 'success');
      } else {
        const { data: inserted, error } = await supabase
          .from('reminders')
          .insert([{ ...payload, status: 'pending' }])
          .select()
          .single();
        if (error) throw error;

        // Dispatch Web Push Notification
        supabase.functions
          .invoke('send-push', {
            body: {
              reminder_id: inserted?.id,
              title: formData.title,
              body: formData.content,
              sender_name: user.full_name,
              assignees: formData.assignees.length > 0 ? formData.assignees : null,
            },
          })
          .catch((e) => console.warn('[CDX Push] Edge function error:', e));

        if (addToast) addToast('Đã thêm mới thông báo thành công', 'success');
      }

      setShowSetReminder(false);
      setShowAddNew(false);
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        reminder_time: getDefaultTime(),
        browser_notification: true,
        assignees: [],
        show_assignees: false,
      });
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (rem: any) => {
    const d = new Date(rem.reminder_time);
    const localStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    const parsed = parseReminderContent(rem.content);

    setFormData({
      title: rem.title || '',
      content: parsed.text || '',
      reminder_time: localStr,
      browser_notification: rem.browser_notification ?? true,
      assignees: parsed.assignees || [],
      show_assignees: parsed.show_assignees ?? false,
    });
    setEditingId(rem.id);
    setShowSetReminder(true);
  };

  const handleDeleteClick = async (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
    try {
      const usage = await checkUsage('reminder', id);
      setUsageInfo(usage);
    } catch (err) {
      console.error(err);
    }
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ status: 'Đã xóa' })
        .eq('id', itemToDelete);
      if (error) throw error;
      if (addToast) addToast('Đã chuyển thông báo vào thùng rác', 'success');
      setShowDeleteModal(false);
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete || user.role !== 'Develop') return;
    if (
      !window.confirm('CẢNH BÁO: Hành động này sẽ xóa VĨNH VIỄN thông báo này. Bạn có chắc chắn?')
    )
      return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reminders').delete().eq('id', itemToDelete);
      if (error) throw error;
      if (addToast) addToast('Đã xóa vĩnh viễn thông báo', 'success');
      fetchData();
      setShowDeleteModal(false);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa vĩnh viễn: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const executeDeleteAll = async () => {
    try {
      const idsToDelete = filteredReminders.map((r) => r.id);
      if (idsToDelete.length === 0) {
        if (addToast) addToast('Không có dữ liệu để xóa', 'info');
        setShowDeleteAllConfirm(false);
        return;
      }

      const { error } = await supabase
        .from('reminders')
        .update({ status: 'Đã xóa' })
        .in('id', idsToDelete);
      if (error) throw error;

      if (addToast) addToast(`Đã chuyển ${idsToDelete.length} thông báo vào thùng rác`, 'success');
      setShowDeleteAllConfirm(false);
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const filteredReminders = reminders.filter((r) => {
    if (filters.fromDate && r.reminder_time < filters.fromDate) return false;
    if (filters.toDate && r.reminder_time > filters.toDate) return false;

    const searchLower = filters.search.toLowerCase();
    const titleMatch = (r.title || '').toLowerCase().includes(searchLower);
    const senderMatch = (r.sender?.full_name || '').toLowerCase().includes(searchLower);

    if (filters.search && !(titleMatch || senderMatch)) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between gap-2">
        <PageBreadcrumb title="Thiết lập Thông báo" onBack={onBack} />
        <div className="flex items-center gap-2 justify-end flex-1">
          {filteredReminders.length > 0 && (
            <Button
              size="icon"
              variant="danger"
              icon={Trash2}
              onClick={() => setShowDeleteAllConfirm(true)}
              title="Xóa tất cả danh sách hiện tại"
            />
          )}
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter((f) => !f)}
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
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Nhân sự hiện tại (Người gửi)
                  </label>
                  <select
                    value={filters.employee}
                    onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  >
                    <option value="">-- Tất cả --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Tìm kiếm nhanh
                  </label>
                  <div className="relative mt-1">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Gõ để tìm..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
            <Bell size={18} /> Danh sách thông báo tháng {new Date().getMonth() + 1}/
            {new Date().getFullYear()}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">
                  Người gửi
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">
                  Thời gian nhắc
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">
                  Đối tượng
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">
                  Nội dung / Tiêu đề
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredReminders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                    Không có thông báo nào
                  </td>
                </tr>
              ) : (
                filteredReminders.map((rem) => (
                  <tr
                    key={rem.id}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    onClick={() => handleEdit(rem)}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${rem.status === 'reminded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                      >
                        {rem.status === 'reminded' ? 'Đã nhắc' : 'Chờ nhắc'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold uppercase">
                          {(rem.sender?.full_name || '??')[0]}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {rem.sender?.full_name || 'Hệ thống'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-primary">
                      {new Date(rem.reminder_time).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const payload = parseReminderContent(rem.content);
                        const isGlobal = !payload.assignees || payload.assignees.length === 0;
                        return (
                          <div className="flex items-center gap-1.5">
                            {isGlobal ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase">
                                <Users size={10} /> Toàn bộ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-md text-[10px] font-bold uppercase">
                                <User size={10} /> Cá nhân ({payload.assignees.length})
                              </span>
                            )}
                            {payload.show_assignees && (
                              <Share2
                                size={12}
                                className="text-gray-400"
                                title="Được phép xem danh sách người nhận"
                              />
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 leading-tight">
                          {rem.title}
                        </span>
                        <span className="text-xs text-gray-500 truncate max-w-[200px]">
                          {parseReminderContent(rem.content).text}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(rem);
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
                            handleDeleteClick(rem.id);
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
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
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
              <div className="text-sm text-gray-500 mb-6 text-left bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <p>
                  Thông báo:{' '}
                  <strong className="text-primary truncate">
                    {reminders.find((r) => r.id === itemToDelete)?.title || 'Không tiêu đề'}
                  </strong>
                </p>
                {usageInfo.inUse ? (
                  <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 uppercase tracking-tighter">
                    <AlertCircle size={12} /> Có dữ liệu liên quan - Cân nhắc kỹ
                  </p>
                ) : (
                  <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 uppercase tracking-widest">
                    <CheckCircle size={12} /> Sẵn sàng để xóa
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button fullWidth variant="outline" onClick={() => setShowDeleteModal(false)}>
                    Hủy bỏ
                  </Button>
                  <Button fullWidth variant="danger" onClick={executeDelete} isLoading={submitting}>
                    Thùng rác
                  </Button>
                </div>
                {/* XÓA VĨNH VIỄN removed from main list - use Trash module instead */}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[calc(100vh-40px)]"
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
                  <h3 className="text-lg font-bold uppercase tracking-wide">
                    {editingId ? 'Sửa thông báo' : 'Tạo thông báo'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSetReminder(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
                <div className="space-y-2 mb-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Mã tham chiếu (Thông báo)
                  </label>
                  <div className="bg-primary/5 px-5 py-3.5 rounded-2xl border border-primary/10 text-sm font-black text-primary uppercase shadow-inner italic">
                    {editingId
                      ? `TB-${new Date(reminders.find((r) => r.id === editingId)?.created_at).toISOString().slice(2, 10).replace(/-/g, '')}-${editingId.slice(0, 3).toUpperCase()}`
                      : `TB-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-001`}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Họp giao ban sáng..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Nội dung chi tiết
                  </label>
                  <textarea
                    placeholder="Mô tả thêm..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Gửi đến (Nhân sự){' '}
                    <span className="text-gray-400 font-normal italic">
                      - Không chọn ai = Gửi tất cả
                    </span>
                  </label>
                  <div className="mt-1 border border-gray-200 rounded-xl max-h-40 overflow-y-auto bg-white/50">
                    {employees.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignees.includes(emp.id)}
                          onChange={(e) => {
                            const newAssignees = e.target.checked
                              ? [...formData.assignees, emp.id]
                              : formData.assignees.filter((id) => id !== emp.id);
                            setFormData({ ...formData, assignees: newAssignees });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700 font-medium truncate">
                          {emp.full_name}{' '}
                          <span className="text-gray-400 text-xs font-normal">({emp.code})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Thời gian nhắc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.reminder_time}
                    onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <input
                    type="checkbox"
                    id="notify"
                    checked={formData.browser_notification}
                    onChange={(e) =>
                      setFormData({ ...formData, browser_notification: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="notify"
                    className="text-sm text-gray-700 font-medium cursor-pointer"
                  >
                    Nhắc qua thông báo trình duyệt
                  </label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <input
                    type="checkbox"
                    id="show_assignees"
                    checked={formData.show_assignees}
                    onChange={(e) => setFormData({ ...formData, show_assignees: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex flex-col">
                    <label
                      htmlFor="show_assignees"
                      className="text-sm text-gray-700 font-bold cursor-pointer transition-colors"
                    >
                      Hiển thị danh sách người cùng nhận
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Mọi người sẽ biết ai khác cũng nhận được báo cáo này
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3 flex-shrink-0">
                <Button
                  fullWidth
                  variant="success"
                  onClick={handleSave}
                  icon={Bell}
                  isLoading={submitting}
                >
                  {editingId ? 'Cập nhật' : 'Đặt nhắc'}
                </Button>
                <Button variant="outline" onClick={() => setShowSetReminder(false)}>
                  Hủy
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        show={showDeleteAllConfirm}
        title="Xác nhận xóa danh sách"
        message={`Bạn có chắc chắn muốn chuyển tất cả ${filteredReminders.length} thông báo vào thùng rác không?`}
        onConfirm={executeDeleteAll}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />

      <FAB
        onClick={() => {
          setFormData({
            title: '',
            content: '',
            reminder_time: getDefaultTime(),
            browser_notification: true,
            assignees: [],
            show_assignees: false,
          });
          setEditingId(null);
          setShowSetReminder(true);
        }}
      />
    </div>
  );
};
