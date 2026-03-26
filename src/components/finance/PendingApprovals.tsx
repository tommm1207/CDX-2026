import { useState, useEffect } from 'react';
import { ClipboardCheck, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Check, X, RefreshCw, AlertCircle, Wallet, ChevronRight, Trash2, Edit, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { formatDate, formatNumber, formatCurrency } from '../../utils/format';
import { Button } from '../shared/Button';

interface ConfirmState { slip: any; action: 'approve' | 'reject' }

const typeIcon = (type: string, size = 20) => {
  if (type === 'Nhập kho') return <ArrowDownCircle size={size} className="text-blue-500" />;
  if (type === 'Xuất kho') return <ArrowUpCircle size={size} className="text-red-500" />;
  if (type === 'Luân chuyển') return <ArrowLeftRight size={size} className="text-orange-500" />;
  return <Wallet size={size} className="text-primary" />;
};

const typeColor = (type: string) => {
  if (type === 'Nhập kho') return 'bg-blue-50 text-blue-600';
  if (type === 'Xuất kho') return 'bg-red-50 text-red-600';
  if (type === 'Luân chuyển') return 'bg-orange-50 text-orange-600';
  return 'bg-primary/10 text-primary';
};

export const PendingApprovals = ({ user, onBack, onNavigate, onRefreshCount, addToast, initialCount = 0 }: { 
  user: Employee, 
  onBack: () => void, 
  onNavigate: (page: string, params?: any) => void, 
  onRefreshCount: () => void,
  addToast?: (message: string, type?: ToastType) => void,
  initialCount?: number,
}) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const displayCount = slips.length;

  useEffect(() => {
    fetchPendingSlips();
  }, []);

  const fetchPendingSlips = async (silent = false) => {
    if (!silent) setLoading(true);
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
      onRefreshCount();
    } catch (err: any) {
      const msg = 'Lỗi tải danh sách: ' + err.message;
      setErrorMsg(msg);
      if (addToast) addToast(msg, 'error');
    } finally {
      if (!silent) setLoading(false);
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

      // Optimistic update
      setSlips(prev => prev.filter(s => !(s.id === slip.id && s.table === slip.table)));
      setSelectedSlip(null);
      onRefreshCount();
      if (addToast) addToast(`${action === 'approve' ? 'Duyệt' : 'Từ chối'} phiếu thành công!`, 'success');

      fetchPendingSlips(true);
    } catch (err: any) {
      const msg = `Lỗi khi ${action === 'approve' ? 'duyệt' : 'từ chối'} phiếu: ${err.message}`;
      setErrorMsg(msg);
      if (addToast) addToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteSlip = async () => {
    if (!selectedSlip) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from(selectedSlip.table)
        .update({ status: 'Đã xóa' })
        .eq('id', selectedSlip.id);
      if (error) throw error;
      setSlips(prev => prev.filter(s => !(s.id === selectedSlip.id && s.table === selectedSlip.table)));
      setSelectedSlip(null);
      onRefreshCount();
      if (addToast) addToast('Đã chuyển phiếu vào thùng rác', 'success');
      fetchPendingSlips(true);
    } catch (err: any) {
      if (addToast) addToast('Lỗi xóa phiếu: ' + err.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const slipCode = (item: any) =>
    item.import_code || item.export_code || item.transfer_code || item.cost_code || ('#' + item.id.slice(0, 8));

  const isAdmin = user.role === 'Admin' || user.role === 'Admin App';

  return (
    <div className="p-4 md:p-6 space-y-4 pb-44">
      <PageBreadcrumb title="Phê duyệt phiếu" onBack={onBack} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="text-amber-500" /> Danh sách chờ duyệt
          </h2>
          <p className="text-xs text-gray-500 mt-1">Nhấn vào phiếu để xem chi tiết</p>
        </div>
        <Button
          variant="ghost"
          icon={RefreshCw}
          onClick={() => fetchPendingSlips()}
          className="bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          Làm mới
        </Button>
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

      {/* Confirm popup */}
      {confirm && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm h-[100dvh] w-full"
          onClick={() => setConfirm(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
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
              <Button variant="outline" fullWidth onClick={() => setConfirm(null)}>Hủy</Button>
              <Button
                fullWidth
                onClick={executeAction}
                variant={confirm.action === 'approve' ? 'success' : 'danger'}
                className={confirm.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {confirm.action === 'approve' ? '✓ Duyệt ngay' : '✕ Từ chối'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedSlip && (
          <div 
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm h-[100dvh] w-full"
            onClick={() => setSelectedSlip(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-5 rounded-t-3xl flex items-center justify-between ${typeColor(selectedSlip.type)}`}>
                <div className="flex items-center gap-3">
                  {typeIcon(selectedSlip.type, 24)}
                  <div>
                    <p className="font-bold text-base">{selectedSlip.type}</p>
                    <p className="text-[11px] font-mono opacity-75">{slipCode(selectedSlip)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSlip(null)} className="p-2 rounded-xl hover:bg-black/10 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {selectedSlip.notes?.includes('[SỬA') && (
                  <div className="px-3 py-2 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700 font-medium">
                    ⚠️ Phiếu đã được chỉnh sửa
                  </div>
                )}

                <div className="space-y-0 divide-y divide-gray-50">
                  {/* Người tạo */}
                  <Row label="Người tạo" value={selectedSlip.users?.full_name || '—'} />
                  {/* Ngày */}
                  <Row label="Ngày" value={formatDate(selectedSlip.date)} />
                  {/* Vật tư / Nội dung */}
                  {selectedSlip.type === 'Chi phí' ? (
                    <>
                      <Row label="Loại chi phí" value={selectedSlip.cost_type || '—'} />
                      <Row label="Nội dung" value={selectedSlip.content || '—'} />
                      <Row label="Kho" value={selectedSlip.warehouses?.name || '—'} />
                    </>
                  ) : selectedSlip.type === 'Luân chuyển' ? (
                    <>
                      <Row label="Vật tư" value={selectedSlip.materials?.name || '—'} />
                      <Row label="Kho đi" value={selectedSlip.from_wh?.name || '—'} />
                      <Row label="Kho đến" value={selectedSlip.to_wh?.name || '—'} />
                    </>
                  ) : (
                    <>
                      <Row label="Vật tư" value={selectedSlip.materials?.name || '—'} />
                      <Row label="Kho" value={selectedSlip.warehouses?.name || '—'} />
                    </>
                  )}
                  {/* Số lượng */}
                  {selectedSlip.quantity > 0 && (
                    <Row
                      label="Số lượng"
                      value={`${formatNumber(selectedSlip.quantity)} ${selectedSlip.materials?.unit || selectedSlip.unit || ''}`}
                      bold
                    />
                  )}
                  {/* Đơn giá */}
                  {selectedSlip.unit_price > 0 && (
                    <Row label="Đơn giá" value={formatCurrency(selectedSlip.unit_price)} />
                  )}
                  {/* Thành tiền */}
                  {selectedSlip.total_amount > 0 && (
                    <Row label="Thành tiền" value={formatCurrency(selectedSlip.total_amount)} bold highlight />
                  )}
                  {/* Ghi chú */}
                  {selectedSlip.notes && (
                    <div className="py-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ghi chú</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{selectedSlip.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-3 sm:p-4 border-t border-gray-100 rounded-b-3xl bg-gray-50 flex flex-wrap items-center justify-center gap-2 w-full">
                <Button
                  variant="outline"
                  icon={Trash2}
                  onClick={deleteSlip}
                  isLoading={deleteLoading}
                  className="flex-1 min-w-[100px] text-red-500 border-red-200 hover:bg-red-50 sm:mr-auto"
                >
                  Thùng rác
                </Button>
                <Button
                  variant="outline"
                  icon={Edit}
                  onClick={() => {
                    if (addToast) addToast(`Chuyển đến trang ${selectedSlip.type} để sửa phiếu.`, 'info');
                    setSelectedSlip(null);
                    if (selectedSlip.table === 'stock_in') onNavigate?.('stock-in');
                    else if (selectedSlip.table === 'stock_out') onNavigate?.('stock-out');
                    else if (selectedSlip.table === 'transfers') onNavigate?.('transfer');
                    else if (selectedSlip.table === 'costs') onNavigate?.('costs');
                  }}
                  className="flex-1 min-w-[100px] text-gray-700 border-gray-200 hover:bg-gray-50"
                >
                  Sửa
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant="danger"
                      icon={X}
                      onClick={() => setConfirm({ slip: selectedSlip, action: 'reject' })}
                      isLoading={actionLoading === selectedSlip.id}
                      className="flex-1 min-w-[100px]"
                    >
                      Từ chối
                    </Button>
                    <Button
                      variant="success"
                      icon={Check}
                      onClick={() => setConfirm({ slip: selectedSlip, action: 'approve' })}
                      isLoading={actionLoading === selectedSlip.id}
                      className="flex-1 min-w-[100px]"
                    >
                      Duyệt
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  icon={ChevronDown}
                  onClick={() => setSelectedSlip(null)}
                  className="flex-1 min-w-[100px] text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  Đóng
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table */}
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
                  <tr
                    key={`${item.table}-${item.id}`}
                    onClick={() => setSelectedSlip(item)}
                    className={`hover:bg-primary/5 cursor-pointer transition-colors ${actionLoading === item.id ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {typeIcon(item.type, 16)}
                        <span className="text-xs font-bold text-gray-800">{item.type}</span>
                        {item.notes?.includes('[SỬA') && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded">Đã sửa</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase mt-0.5 block">
                        #{slipCode(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-gray-700">{item.users?.full_name || '—'}</div>
                      <div className="text-[10px] text-gray-400">{formatDate(item.date)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-gray-800">
                        {item.type === 'Chi phí' ? item.content : (item.materials?.name || item.content || '—')}
                      </div>
                      <div className="flex flex-col items-start gap-1 mt-0.5">
                        {item.type === 'Chi phí' && item.cost_type && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                            {item.cost_type}
                          </span>
                        )}
                        {item.type !== 'Chi phí' && (
                          <span className="text-[10px] text-gray-500 italic">
                            {item.type === 'Luân chuyển' ? `${item.from_wh?.name} → ${item.to_wh?.name}` : item.warehouses?.name || ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.type !== 'Chi phí' && item.quantity ? (
                        <div className="text-xs font-bold text-gray-900">
                          {formatNumber(item.quantity)} {item.materials?.unit || item.unit || ''}
                        </div>
                      ) : null}
                      {item.total_amount > 0 && (
                        <div className={`mt-0.5 font-medium ${item.type === 'Chi phí' ? 'text-xs font-bold text-red-600' : 'text-[10px] text-gray-400'}`}>
                          {item.type === 'Chi phí' ? formatCurrency(item.total_amount) : `${formatNumber(item.total_amount)} ₫`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirm({ slip: item, action: 'approve' }); }}
                          disabled={actionLoading === item.id}
                          className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                          title="Duyệt phiếu"
                        >
                          {actionLoading === item.id ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirm({ slip: item, action: 'reject' }); }}
                          disabled={actionLoading === item.id}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                          title="Từ chối"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedSlip(item); }}
                          className="p-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-200 transition-all shadow-sm"
                          title="Xem chi tiết"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {displayCount > 0 && (
          <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500" />
            <span className="text-xs text-amber-700 font-medium">{displayCount} phiếu đang chờ duyệt</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper row component for detail modal
const Row = ({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) => (
  <div className="flex justify-between items-center py-3 gap-4">
    <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">{label}</span>
    <span className={`text-right text-sm ${bold ? 'font-bold' : 'font-medium'} ${highlight ? 'text-red-600' : 'text-gray-800'}`}>
      {value}
    </span>
  </div>
);
