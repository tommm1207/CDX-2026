import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee, ProductionOrder, BOMConfig } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { formatNumber } from '@/utils/format';
import { getAllowedWarehouses } from '@/utils/helpers';
import { FAB } from '../shared/FAB';
import { Button } from '../shared/Button';

export const ProductionOrders = ({ user, onBack, addToast, onOpenDetail, setHideBottomNav }: {
  user: Employee,
  onBack?: () => void,
  addToast?: (message: string, type?: ToastType) => void,
  onOpenDetail: (id?: string) => void,
  setHideBottomNav?: (hide: boolean) => void
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    if (setHideBottomNav) {
      setHideBottomNav(showFilter);
    }
  }, [showFilter, setHideBottomNav]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('production_orders')
        .select(`
          *,
          bom_configs(name, product_item_id, materials(name, unit)),
          warehouses!warehouse_id(name)
        `);

      const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
      if (allowedWhIds) {
        query = query.in('warehouse_id', allowedWhIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải danh sách lệnh: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Đã duyệt': return <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Đã duyệt</span>;
      case 'Hoàn thành': return <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Hoàn thành</span>;
      case 'Hủy': return <span className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold flex items-center gap-1"><XCircle size={10} /> Đã hủy</span>;
      default: return <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold flex items-center gap-1"><Clock size={10} /> Mới</span>;
    }
  };

  const filteredOrders = orders.filter(o => 
    o.order_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.bom_configs?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Lệnh sản xuất" onBack={onBack} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="text-primary" /> Lệnh sản xuất cọc
          </h2>
          <p className="text-xs text-gray-500 mt-1">Theo dõi tiến độ sản xuất và điều phối vật tư</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter(f => !f)}
            icon={Search}
          />
        </div>
      </div>

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã lệnh hoặc định mức..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Mã lệnh</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày lập</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Định mức / Thành phẩm</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Số lượng</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Kho xuất</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Trạng thái</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-24">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic">Chưa có lệnh sản xuất nào</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => onOpenDetail(order.id)}
                  >
                    <td className="px-4 py-3 text-xs font-bold text-gray-800">{order.order_code}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-gray-700">{order.bom_configs?.name}</p>
                      <p className="text-[10px] text-gray-400 italic">{order.bom_configs?.materials?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-gray-800">
                      {formatNumber(order.quantity)} <span className="text-[10px] text-gray-400 font-normal">{order.bom_configs?.materials?.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{order.warehouses?.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">{getStatusBadge(order.status)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); onOpenDetail(order.id); }}
                          icon={Eye}
                          className="text-primary hover:bg-primary/10"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <FAB
        onClick={() => onOpenDetail()}
        label="Tạo lệnh mới"
        color="bg-indigo-600"
      />
    </div>
  );
};
