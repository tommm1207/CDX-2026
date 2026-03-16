import { useState, useEffect } from 'react';
import { ClipboardCheck, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Check, X, Eye, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { formatDate, formatNumber } from '../../utils/format';

interface ConfirmState { slip: any; action: 'approve' | 'reject' }

export const PendingApprovals = ({ user, onBack, onNavigate, onRefreshCount }: { user: Employee, onBack: () => void, onNavigate: (page: string, params?: any) => void, onRefreshCount: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingSlips();
  }, []);

  const fetchPendingSlips = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [si, so, tr, co] = await Promise.all([
        supabase.from('stock_in').select('*, warehouses(name), materials(name, unit), users!employee_id(full_name)').eq('status', 'Chờ duyệt'),
        supabase.from('stock_out').select('*, warehouses(name), materials(name, unit), users!employee_id(full_name)').eq('status', 'Chờ duyệt'),
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
    } catch (err: any) {
      setErrorMsg('Lỗi tải danh sách: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    if (!confirm) return;
    const { slip, action } = confirm;
    setConfirm(null);
    setActionLoading(slip.id);
    setErrorMsg(null);
    try {
      const newStatus = action === 'approve' ? 'Đã duyệt' : 'Từ chối';
      const { error } = await supabase
        .from(slip.table)
        .update({ status: newStatus })
        .eq('id', slip.id);

      if (error) throw error;
      await fetchPendingSlips();
      onRefreshCount();
    } catch (err: any) {
      setErrorMsg(`Lỗi khi ${action === 'approve' ? 'duyệt' : 'từ chối'} phiếu: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 pb-44">
      <PageBreadcrumb title="Phê duyệt phiếu" onBack={onBack} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="text-amber-500" /> Danh sách chờ duyệt
          </h2>
          <p className="text-xs text-gray-500 mt-1">Vui lòng kiểm tra kỹ thông tin trước khi duyệt</p>
        </div>
        <button
          onClick={fetchPendingSlips}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Error display */}
      {errorMsg && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Có lỗi xảy ra</p>
            <p className="mt-1 text-xs">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}

      {/* Inline confirm popup */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${confirm.action === 'approve' ? 'bg-green-100' : 'bg-red-100'}`}>
              {confirm.action === 'approve' ? <Check className="text-green-600" size={24} /> : <X className="text-red-600" size={24} />}
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 text-lg">
                {confirm.action === 'approve' ? 'Duyệt phiếu?' : 'Từ chối phiếu?'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium">{confirm.slip.type}</span>
                {' — '}
                {confirm.slip.materials?.name || confirm.slip.content}
              </p>
              {confirm.slip.quantity && (
                <p className="text-sm font-mono mt-1 text-gray-600">
                  SL: {formatNumber(confirm.slip.quantity)} {confirm.slip.materials?.unit || confirm.slip.unit || ''}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={executeAction}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white ${confirm.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {confirm.action === 'approve' ? '✓ Duyệt ngay' : '✕ Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Loại phiếu</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Người tạo / Ngày</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Nội dung / Kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Số lượng / Tiền</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">Đang tải danh sách...</td></tr>
              ) : slips.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">✅ Không có phiếu nào cần duyệt</td></tr>
              ) : (
                slips.map((item) => (
                  <tr key={`${item.table}-${item.id}`} className={`hover:bg-gray-50/50 transition-colors ${actionLoading === item.id ? 'opacity-50 pointer-events-none' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.type === 'Nhập kho' ? <ArrowDownCircle className="text-blue-500" size={16} /> :
                          item.type === 'Xuất kho' ? <ArrowUpCircle className="text-red-500" size={16} /> :
                            item.type === 'Luân chuyển' ? <ArrowLeftRight className="text-orange-500" size={16} /> :
                              <ClipboardCheck className="text-primary" size={16} />}
                        <span className="text-xs font-bold text-gray-800">{item.type}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase mt-0.5 block">
                        #{item.import_code || item.export_code || item.transfer_code || item.cost_code || item.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-gray-700">{item.users?.full_name || '—'}</div>
                      <div className="text-[10px] text-gray-400">{formatDate(item.date)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-gray-800">{item.materials?.name || item.content || '—'}</div>
                      <div className="text-[10px] text-gray-500 italic mt-0.5">
                        {item.type === 'Luân chuyển' ? `${item.from_wh?.name} → ${item.to_wh?.name}` : item.warehouses?.name || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs font-bold text-gray-900">
                        {item.quantity ? `${formatNumber(item.quantity)} ${item.materials?.unit || item.unit || ''}` : ''}
                      </div>
                      {item.total_amount > 0 && (
                        <div className="text-[10px] text-gray-400 font-medium">{formatNumber(item.total_amount)} ₫</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setConfirm({ slip: item, action: 'approve' })}
                          disabled={actionLoading === item.id}
                          className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                          title="Duyệt phiếu"
                        >
                          {actionLoading === item.id ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button
                          onClick={() => setConfirm({ slip: item, action: 'reject' })}
                          disabled={actionLoading === item.id}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                          title="Từ chối"
                        >
                          <X size={16} />
                        </button>
                        <button
                          className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {slips.length > 0 && (
          <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500" />
            <span className="text-xs text-amber-700 font-medium">{slips.length} phiếu đang chờ duyệt</span>
          </div>
        )}
      </div>
    </div>
  );
};
