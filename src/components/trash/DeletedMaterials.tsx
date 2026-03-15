import { useState, useEffect } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';

export const DeletedMaterials = ({ onBack }: { onBack: () => void }) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedMaterials();
  }, []);

  const fetchDeletedMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('materials').select('*, material_groups(name)').eq('status', 'Đã xóa');
      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error('Error fetching deleted materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Bạn có muốn khôi phục vật tư này?')) return;
    try {
      const { error } = await supabase.from('materials').update({ status: 'Đang sử dụng' }).eq('id', id);
      if (error) throw error;
      fetchDeletedMaterials();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Vật tư đã xóa" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-red-500" /> Danh sách vật tư đã xóa
          </h2>
          <p className="text-xs text-gray-500 mt-1">Vật tư trong thùng rác có thể được khôi phục</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mã vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Tên vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Nhóm</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">ĐVT</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : materials.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Thùng rác trống</td></tr>
            ) : (
              materials.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{item.code || item.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs text-gray-800 font-bold">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.material_groups?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      title="Khôi phục"
                    >
                      <RefreshCw size={16} />
                    </button>
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
