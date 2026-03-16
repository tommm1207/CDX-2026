import { useState, useEffect } from 'react';
import { Warehouse, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';

export const DeletedWarehouses = ({ onBack }: { onBack: () => void }) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error('Error fetching deleted warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Bạn có muốn khôi phục kho này?')) return;
    try {
      const { error } = await supabase.from('warehouses').update({ status: 'Đang hoạt động' }).eq('id', id);
      if (error) throw error;
      alert('Đã khôi phục kho thành công!');
      fetchDeletedWarehouses();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn kho này? Hành động này không thể hoàn tác!')) return;
    try {
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
      alert('Đã xóa vĩnh viễn thành công!');
      fetchDeletedWarehouses();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
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
                        onClick={() => handleRestore(item.id)}
                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        title="Khôi phục"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id)}
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
