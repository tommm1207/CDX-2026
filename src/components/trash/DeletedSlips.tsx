import { useState, useEffect } from 'react';
import { Archive, RefreshCw, Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ToastType } from '../shared/Toast';
import { formatDate, formatNumber } from '@/utils/format';
import { getAvailableStock } from '@/utils/inventory';

export const DeletedSlips = ({ onBack, addToast }: { 
  onBack: () => void,
  addToast?: (message: string, type?: ToastType) => void
}) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{id: string, table: string, name?: string} | null>(null);

  useEffect(() => {
    fetchDeletedSlips();
  }, []);

  const fetchDeletedSlips = async () => {
    setLoading(true);
    try {
      const [si, so, tr] = await Promise.all([
        supabase.from('stock_in').select('*, warehouses(name), materials(name)').eq('status', 'Đã xóa'),
        supabase.from('stock_out').select('*, warehouses(name), materials(name)').eq('status', 'Đã xóa'),
        supabase.from('transfers').select('*, from_wh:warehouses!from_warehouse_id(name), to_wh:warehouses!to_warehouse_id(name), materials(name)').eq('status', 'Đã xóa')
      ]);

      const allDeleted = [
        ...(si.data || []).map(s => ({ ...s, type: 'Nhập kho', table: 'stock_in' })),
        ...(so.data || []).map(s => ({ ...s, type: 'Xuất kho', table: 'stock_out' })),
        ...(tr.data || []).map(s => ({ ...s, type: 'Luân chuyển', table: 'transfers' }))
      ].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

      setSlips(allDeleted);
    } catch (err: any) {
      console.error('Error fetching deleted slips:', err);
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (id: string, table: string, name: string) => {
    setSelectedItem({ id, table, name });
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    try {
      // 1. Fetch full details of the slip to be restored
      const { data: slip } = await supabase
        .from(selectedItem.table)
        .select('*')
        .eq('id', selectedItem.id)
        .single();
        
      if (!slip) throw new Error('Không tìm thấy phiếu');

      // 2. Validate stock if the slip is stock_out or transfer
      if (selectedItem.table === 'stock_out' || selectedItem.table === 'transfers') {
        const wh_id = selectedItem.table === 'stock_out' ? slip.warehouse_id : slip.from_warehouse_id;
        
        // Cần truyền date của phiếu vì getAvailableStock tính tồn kho đến một ngày cụ thể.
        const stockAtDate = await getAvailableStock(slip.material_id, wh_id, slip.date);

        if (Number(slip.quantity) > stockAtDate) {
          const thieu = Number(slip.quantity) - stockAtDate;
          throw new Error(`Kho không đủ tồn kho để khôi phục! Tồn tại ngày ${slip.date}: ${stockAtDate} | Yêu cầu khôi phục: ${slip.quantity} | Thiếu: ${thieu}`);
        }
      }

      // 3. Restore slip to 'Chờ duyệt'
      const { error } = await supabase.from(selectedItem.table).update({ status: 'Chờ duyệt' }).eq('id', selectedItem.id);
      if (error) throw error;
      
      if (addToast) addToast('Đã khôi phục phiếu thành công! Phiếu đang ở trạng thái Chờ duyệt.', 'success');
      else alert('Đã khôi phục phiếu thành công!');
      
      fetchDeletedSlips();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('❌ Từ chối khôi phục — ' + err.message, 'error');
      else alert('Lỗi: ' + err.message);
    }
  };

  const handleDeleteClick = (id: string, table: string, name: string) => {
    setSelectedItem({ id, table, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from(selectedItem.table).delete().eq('id', selectedItem.id);
      if (error) throw error;
      if (addToast) addToast('Đã xóa vĩnh viễn thành công!', 'success');
      else alert('Đã xóa vĩnh viễn thành công!');
      fetchDeletedSlips();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      let msg = err.message;
      if (err.code === '23503') {
        msg = 'Không thể xóa vĩnh viễn vì phiếu này đang có dữ liệu liên quan khác.';
      }
      if (addToast) addToast('Lỗi: ' + msg, 'error');
      else alert('Lỗi: ' + msg);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Phiếu đã xóa" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Archive className="text-blue-500" /> Phiếu nhập xuất đã xóa
          </h2>
          <p className="text-xs text-gray-500 mt-1">Danh sách các phiếu đã đưa vào thùng rác</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Loại</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">SL</th>
              <th className="px-4 py-3 text-[10px) font-bold uppercase tracking-wider text-gray-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : slips.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Thùng rác trống</td></tr>
            ) : (
              slips.map((item) => (
                <tr 
                  key={`${item.table}-${item.id}`} 
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  onClick={() => handleRestoreClick(item.id, item.table, item.materials?.name || 'Phiếu')}
                >
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.type === 'Nhập kho' ? 'bg-blue-100 text-blue-600' :
                        item.type === 'Xuất kho' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {item.type === 'Luân chuyển' ? `${item.from_wh?.name} → ${item.to_wh?.name}` : item.warehouses?.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-800 font-medium">{item.materials?.name}</td>
                  <td className="px-4 py-3 text-xs text-center font-bold text-gray-700">{formatNumber(item.quantity)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestoreClick(item.id, item.table, item.materials?.name || 'Phiếu'); }}
                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        title="Khôi phục"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id, item.table, item.materials?.name || 'Phiếu'); }}
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
