import { useState, useEffect } from 'react';
import { UserCircle, RefreshCw, Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ConfirmModal } from '../shared/ConfirmModal';

export const DeletedEmployees = ({ onBack, addToast }: { onBack: () => void, addToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{id: string, name?: string, role?: string} | null>(null);

  useEffect(() => {
    fetchDeletedEmployees();
  }, []);

  const fetchDeletedEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').eq('status', 'Đã xóa');
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching deleted employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (id: string, name: string) => {
    setSelectedItem({ id, name });
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from('users').update({ status: 'Đang làm việc' }).eq('id', selectedItem.id);
      if (error) throw error;
      addToast(`Đã khôi phục nhân sự ${selectedItem.name} thành công!`, 'success');
      fetchDeletedEmployees();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteClick = (id: string, name: string, role: string) => {
    if (role === 'Admin App') {
      addToast('Bạn không có quyền xóa vĩnh viễn tài khoản Admin App', 'error');
      return;
    }
    setSelectedItem({ id, name, role });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', selectedItem.id);
      if (error) {
        if (error.code === '23503' || error.message.includes('violates foreign key constraint')) {
          throw new Error('Nhân sự này đang có dữ liệu ràng buộc (VD: quản lý kho, tạo phiếu kho, chi phí...). Không thể xóa vĩnh viễn, bạn chỉ có thể xóa tạm vào Thùng rác.');
        }
        throw error;
      }
      addToast(`Đã xóa vĩnh viễn ${selectedItem.name} thành công!`, 'success');
      fetchDeletedEmployees();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi xóa nhân sự', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Nhân sự đã xóa" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <UserCircle className="text-rose-500" /> Danh sách nhân sự đã xóa
          </h2>
          <p className="text-xs text-gray-500 mt-1">Hồ sơ trong thùng rác có thể được khôi phục hoặc xóa vĩnh viễn</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mã NV</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Tên nhân sự</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Chức vụ / Phòng ban</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Tài khoản (Email)</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Thùng rác trống</td></tr>
              ) : (
                employees.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    onClick={() => handleRestoreClick(item.id, item.full_name)}
                  >
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono font-bold text-primary">{item.code || item.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-bold">{item.full_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[200px]">
                      {item.position}{item.department ? ` - ${item.department}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.email}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestoreClick(item.id, item.full_name); }}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                          title="Khôi phục"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id, item.full_name, item.role); }}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Delete/Restore Modals */}
      <AnimatePresence>
        {showRestoreModal && selectedItem && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setShowRestoreModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mb-6 mx-auto">
                  <RefreshCw size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800 text-center mb-2">Xác nhận khôi phục</h3>
                <p className="text-sm text-gray-500 text-center mb-8">
                  Bạn có chắc chắn muốn khôi phục nhân sự <span className="font-bold text-gray-800">{selectedItem.name}</span> không?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowRestoreModal(false)}
                    className="flex-1 py-3.5 px-6 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={confirmRestore}
                    className="flex-1 py-3.5 px-6 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Khôi phục
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {selectedItem && (
          <ConfirmModal
            show={showDeleteModal}
            title="Xóa vĩnh viễn?"
            message={`Hành động này KHÔNG thể hoàn tác. ${selectedItem.name} sẽ bị xóa vĩnh viễn khỏi hệ thống.`}
            confirmText="Xóa vĩnh viễn"
            cancelText="Hủy bỏ"
            onConfirm={confirmDelete}
            onCancel={() => setShowDeleteModal(false)}
            type="danger"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
