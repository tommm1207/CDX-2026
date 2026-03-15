import { useState, useEffect } from 'react';
import { ClipboardCheck, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Check, X, Eye } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { formatDate, formatNumber } from '../../utils/format';

export const PendingApprovals = ({ user, onBack, onNavigate, onRefreshCount }: { user: Employee, onBack: () => void, onNavigate: (page: string, params?: any) => void, onRefreshCount: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingSlips();
  }, []);

  const fetchPendingSlips = async () => {
    setLoading(true);
    try {
      const [si, so, tr, co] = await Promise.all([
        supabase.from('stock_in').select('*, warehouses(name), materials(name), users!employee_id(full_name)').eq('status', 'Chờ duyệt'),
        supabase.from('stock_out').select('*, warehouses(name), materials(name), users!employee_id(full_name)').eq('status', 'Chờ duyệt'),
        supabase.from('transfers').select('*, from_wh:warehouses!from_warehouse_id(name), to_wh:warehouses!to_warehouse_id(name), materials(name), users!employee_id(full_name)').eq('status', 'Chờ duyệt'),
        supabase.from('costs').select('*, warehouses(name), materials(name), users!employee_id(full_name)').eq('status', 'Chờ duyệt')
      ]);

      const allPending = [
        ...(si.data || []).map(s => ({ ...s, type: 'Nhập kho', table: 'stock_in' })),
        ...(so.data || []).map(s => ({ ...s, type: 'Xuất kho', table: 'stock_out' })),
        ...(tr.data || []).map(s => ({ ...s, type: 'Luân chuyển', table: 'transfers' })),
        ...(co.data || []).map(s => ({ ...s, type: 'Chi phí', table: 'costs' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSlips(allPending);
    } catch (err) {
      console.error('Error fetching pending slips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (slip: any) => {
    if (!confirm(`Bạn có chắc muốn DUYỆT phiếu này?`)) return;
    setActionLoading(slip.id);
    try {
      const { error } = await supabase.from(slip.table).update({ status: 'Đã duyệt' }).eq('id', slip.id);
      if (error) throw error;

      fetchPendingSlips();
      onRefreshCount();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (slip: any) => {
    if (!confirm('Bạn có muốn TỪ CHỐI phiếu này?')) return;
    setActionLoading(slip.id);
    try {
      const { error } = await supabase.from(slip.table).update({ status: 'Từ chối' }).eq('id', slip.id);
      if (error) throw error;
      fetchPendingSlips();
      onRefreshCount();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Phê duyệt phiếu" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="text-amber-500" /> Danh sách chờ duyệt
          </h2>
          <p className="text-xs text-gray-500 mt-1">Vui lòng kiểm tra kỹ thông tin trước khi duyệt</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Loại phiếu</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Người tạo / Ngày</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Nội dung / Kho</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Số lượng / Thành tiền</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">Đang tải danh sách...</td></tr>
              ) : slips.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">Không có phiếu nào cần duyệt</td></tr>
              ) : (
                slips.map((item) => (
                  <tr key={`${item.table}-${item.id}`} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.type === 'Nhập kho' ? <ArrowDownCircle className="text-blue-500" size={18} /> :
                          item.type === 'Xuất kho' ? <ArrowUpCircle className="text-red-500" size={18} /> :
                            item.type === 'Luân chuyển' ? <ArrowLeftRight className="text-orange-500" size={18} /> :
                              <ClipboardCheck className="text-primary" size={18} />}
                        <span className="text-sm font-bold text-gray-800">{item.type}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase mt-1 block">#{item.import_code || item.export_code || item.transfer_code || item.cost_code || item.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-700">{item.users?.full_name}</div>
                      <div className="text-[10px] text-gray-400">{formatDate(item.date)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-800">{item.content || item.materials?.name}</div>
                      <div className="text-[10px] text-gray-500 italic mt-0.5">
                        {item.type === 'Luân chuyển' ? `${item.from_wh?.name} → ${item.to_wh?.name}` : item.warehouses?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-gray-900">
                        {item.quantity ? `${formatNumber(item.quantity)} ${item.unit || item.materials?.unit || ''}` : formatNumber(item.total_amount) + ' ₫'}
                      </div>
                      {item.total_amount && item.quantity > 0 && <div className="text-[10px] text-gray-400 font-medium">{formatNumber(item.total_amount)} ₫</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApprove(item)}
                          disabled={actionLoading === item.id}
                          className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                          title="Duyệt phiếu"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          disabled={actionLoading === item.id}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                          title="Từ chối"
                        >
                          <X size={18} />
                        </button>
                        <button
                          className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
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
    </div>
  );
};
