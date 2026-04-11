import { useState, useEffect } from 'react';
import { Layers, RefreshCw, Trash2, Square, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ToastType } from '../shared/Toast';
import { checkUsage } from '@/utils/dataIntegrity';

export const DeletedProductionOrders = ({ onBack, addToast }: { 
  onBack: () => void,
  addToast?: (message: string, type?: ToastType) => void
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{id: string, table: string, code?: string, display?: string} | null>(null);

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      const [ordersRes, bomsRes] = await Promise.all([
        supabase.from('production_orders').select('*, bom_configs(name)').eq('status', 'Đã xóa'),
        supabase.from('bom_configs').select('*, materials:product_item_id(name)').eq('status', 'Đã xóa')
      ]);

      const allItems = [
        ...(ordersRes.data || []).map(o => ({ ...o, type: 'Lệnh sản xuất', table: 'production_orders', displayName: o.order_code, subName: o.bom_configs?.name })),
        ...(bomsRes.data || []).map(b => ({ ...b, type: 'Định mức sản xuất', table: 'bom_configs', displayName: b.name, subName: b.materials?.name }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(allItems);
      setSelectedIds(new Set());
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.id)));
  };

  const handleRowClick = (item: any) => {
    setSelectedItem({ id: item.id, table: item.table, code: item.displayName, display: item.type });
    setShowActionModal(true);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from(selectedItem.table).update({ status: 'Mới' }).eq('id', selectedItem.id);
      if (error) throw error;
      
      if (addToast) addToast(`Đã khôi phục ${selectedItem.display} ${selectedItem.code} thành công!`, 'success');
      fetchDeletedItems();
      setShowRestoreModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi khôi phục: ' + err.message, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.table === 'bom_configs') {
        const usage = await checkUsage('bom', selectedItem.id);
        if (usage.inUse) {
          throw new Error(`Đang được sử dụng bởi: ${usage.tables.join(', ')}`);
        }
      }
      
      const { error } = await supabase.from(selectedItem.table).delete().eq('id', selectedItem.id);
      if (error) throw error;
      
      if (addToast) addToast('Đã xóa vĩnh viễn dữ liệu!', 'success');
      fetchDeletedItems();
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Sản xuất & Định mức đã xóa" onBack={onBack} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <button onClick={toggleSelectAll} className="p-1 text-gray-400 hover:text-primary transition-colors">
                  {selectedIds.size === items.length && items.length > 0 ? <CheckSquare size={20} className="text-primary" /> : <Square size={20} />}
                </button>
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Loại</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Tên / Mã</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">Thùng rác trống</td></tr>
            ) : (
              items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer group ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}>
                      <div className="text-gray-400 hover:text-primary transition-colors">
                        {isSelected ? <CheckSquare size={20} className="text-primary" /> : <Square size={20} />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.type === 'Lệnh sản xuất' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-gray-800">{item.displayName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{item.subName || new Date(item.created_at).toLocaleDateString('vi-VN')}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedItem({ id: item.id, table: item.table, code: item.displayName, display: item.type }); setShowRestoreModal(true); }}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedItem({ id: item.id, table: item.table, code: item.displayName, display: item.type }); setShowDeleteModal(true); }}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showActionModal && selectedItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowActionModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Tùy chọn thao tác</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">{selectedItem.display}: <span className="text-gray-800 font-bold">{selectedItem.code}</span></p>
              <div className="flex flex-col gap-3">
                <button onClick={() => { setShowActionModal(false); setShowRestoreModal(true); }} className="w-full py-4 px-4 rounded-xl font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-center gap-3 shadow-sm border border-green-100">
                  <RefreshCw size={20} /> Khôi phục dữ liệu
                </button>
                <button onClick={() => { setShowActionModal(false); setShowDeleteModal(true); }} className="w-full py-4 px-4 rounded-xl font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-3 shadow-sm border border-red-100">
                  <Trash2 size={20} /> Xóa vĩnh viễn
                </button>
                <button onClick={() => setShowActionModal(false)} className="w-full py-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors mt-2">
                  Hủy bỏ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showRestoreModal && selectedItem && (
           <ConfirmModal
             show={showRestoreModal}
             title="Xác nhận khôi phục"
             message={`Bạn có chắc muốn khôi phục ${selectedItem.display} ${selectedItem.code} trở lại danh sách chính?`}
             confirmText="Khôi phục ngay"
             cancelText="Hủy bỏ"
             onConfirm={confirmRestore}
             onCancel={() => setShowRestoreModal(false)}
             type="success"
           />
        )}

        {showDeleteModal && selectedItem && (
          <ConfirmModal
            show={showDeleteModal}
            title="Xóa vĩnh viễn?"
            message={`Hành động này KHÔNG thể hoàn tác. ${selectedItem.display} ${selectedItem.code} sẽ bị xóa sạch khỏi hệ thống.`}
            confirmText="Xác nhận xóa"
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
