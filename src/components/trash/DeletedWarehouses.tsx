import { useState, useEffect } from 'react';
import { Warehouse, RefreshCw, Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';

export const DeletedWarehouses = ({ onBack, addToast }: { 
  onBack: () => void,
  addToast?: (message: string, type?: ToastType) => void
}) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{id: string, name?: string} | null>(null);

  useEffect(() => {
    fetchDeletedWarehouses();
  }, []);

  const fetchDeletedWarehouses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('warehouses').select('*, users(full_name)').eq('status', 'Đã xóa');
      if (error) {
        console.error('Error with join, trying simple select:', error);
        const { data: simpleData, error: simpleError } = await supabase.from('warehouses').select('*').eq('status', 'Đã xóa');
        if (simpleError) throw simpleError;
        setWarehouses(simpleData || []);
      } else {
        setWarehouses(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching deleted warehouses:', err);
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
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
      const { error } = await supabase.from('warehouses').update({ status: 'Đang hoạt động' }).eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast('Đã khôi phục kho thành công!', 'success');
      else alert('Đã khôi phục kho thành công!');
      fetchDeletedWarehouses();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setSelectedItem({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from('warehouses').delete().eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast('Đã xóa vĩnh viễn thành công!', 'success');
      else alert('Đã xóa vĩnh viễn thành công!');
      fetchDeletedWarehouses();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      let msg = err.message;
      if (err.code === '23503') {
        msg = 'Không thể xóa vĩnh viễn vì kho này đang có dữ liệu nhập/xuất hoặc luân chuyển liên quan.';
      }
      if (addToast) addToast('Lỗi: ' + msg, 'error');
      else alert('Lỗi: ' + msg);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Kho đã xóa" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Warehouse className="text-orange-500" /> Danh sách kho đã xóa
          </h2>
          <p className="text-xs text-gray-500 mt-1">Kho trong thùng rác có thể được khôi phục</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mã kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Tên kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Địa chỉ</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Quản lý</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : warehouses.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Thùng rác trống</td></tr>
            ) : (
              warehouses.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{item.code || item.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs text-gray-800 font-bold">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.address}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.users?.full_name}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleRestoreClick(item.id, item.name)}
                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        title="Khôi phục"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item.id, item.name)}
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

      <AnimatePresence>
        {showRestoreModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mb-6 mx-auto">
                  <RefreshCw size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800 text-center mb-2">Xác nhận khôi phục</h3>
                <p className="text-sm text-gray-500 text-center mb-8">
                  Bạn có chắc chắn muốn khôi phục kho <span className="font-bold text-gray-800">{selectedItem.name}</span> không?
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

        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800 text-center mb-2">Xóa vĩnh viễn</h3>
                <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
                  Bạn có chắc chắn muốn xóa vĩnh viễn kho <span className="font-bold text-gray-800">{selectedItem.name}</span> không?<br />
                  <span className="text-rose-500 font-medium">Hành động này không thể hoàn tác!</span>
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3.5 px-6 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-3.5 px-6 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} /> Xóa vĩnh viễn
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
