import { useState, useEffect } from 'react';
import { Archive, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { formatDate, formatNumber } from '../../utils/format';

export const DeletedSlips = ({ onBack }: { onBack: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error('Error fetching deleted slips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string, table: string) => {
    if (!confirm('Bạn có muốn khôi phục phiếu này về trạng thái Chờ duyệt?')) return;
    try {
      const { error } = await supabase.from(table).update({ status: 'Chờ duyệt' }).eq('id', id);
      if (error) throw error;
      alert('Đã khôi phục phiếu thành công!');
      fetchDeletedSlips();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handlePermanentDelete = async (id: string, table: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn phiếu này? Hành động này không thể hoàn tác!')) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      alert('Đã xóa vĩnh viễn thành công!');
      fetchDeletedSlips();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
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
        <table className="w-full text-left border-collapse">
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
                <tr key={`${item.table}-${item.id}`} className="hover:bg-gray-50/50 transition-colors">
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
                        onClick={() => handleRestore(item.id, item.table)}
                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        title="Khôi phục"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id, item.table)}
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
  );
};
