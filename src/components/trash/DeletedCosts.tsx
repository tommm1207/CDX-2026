import { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { formatCurrency } from '../../utils/format';

export const DeletedCosts = ({ onBack, addToast }: { onBack: () => void, addToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) => {
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{id: string, name?: string} | null>(null);

  useEffect(() => {
    fetchDeletedCosts();
  }, []);

  const fetchDeletedCosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('costs')
        .select('*, users(full_name), warehouses(name), materials(name)')
        .eq('status', 'Đã xóa')
        .order('date', { ascending: false });
        
      if (error) {
        console.error('Error with join, trying simple select:', error);
        const { data: simpleData, error: simpleError } = await supabase.from('costs').select('*').eq('status', 'Đã xóa').order('date', { ascending: false });
        if (simpleError) throw simpleError;
        setCosts(simpleData || []);
      } else {
        setCosts(data || []);
      }
    } catch (err) {
      console.error('Error fetching deleted costs:', err);
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
      const { error } = await supabase.from('costs').update({ status: 'Đã hoàn thành' }).eq('id', selectedItem.id);
      if (error) throw error;
      addToast(`Đã khôi phục chi phí: ${selectedItem.name} thành công!`, 'success');
      fetchDeletedCosts();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setSelectedItem({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from('costs').delete().eq('id', selectedItem.id);
      if (error) {
        if (error.code === '23503' || error.message.includes('violates foreign key constraint')) {
          throw new Error('Không thể xóa vĩnh viễn chi phí này do đang có dữ liệu ràng buộc. Vui lòng chỉ dùng tính năng Ẩn/Xóa tạm thời.');
        }
        throw error;
      }
      addToast('Đã xóa vĩnh viễn thành công!', 'success');
      fetchDeletedCosts();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi xóa chi phí', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Chi phí đã xóa" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="text-purple-500" /> Danh sách chi phí đã xóa
          </h2>
          <p className="text-xs text-gray-500 mt-1">Các báo cáo chi phí bị xóa có thể khôi phục lại</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Ngày chi</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mã / Loại GD</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Hạng mục</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Nội dung</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Số tiền</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : costs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Thùng rác trống</td></tr>
              ) : (
                costs.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-gray-500">{item.cost_code}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${item.transaction_type === 'Thu' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {item.transaction_type || 'Chi'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-bold">{item.cost_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[200px]">{item.content}</td>
                    <td className={`px-4 py-3 text-xs font-bold text-right ${item.transaction_type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.transaction_type === 'Thu' ? '+' : '-'}{formatCurrency(item.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestoreClick(item.id, item.cost_code || item.cost_type)}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                          title="Khôi phục"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id, item.cost_code || item.cost_type)}
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
                  Bạn có chắc chắn muốn khôi phục chứng từ <span className="font-bold text-gray-800">{selectedItem.name}</span> không?
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
                  Bạn có chắc chắn muốn xóa vĩnh viễn dữ liệu của <span className="font-bold text-gray-800">{selectedItem.name}</span> không?<br />
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
