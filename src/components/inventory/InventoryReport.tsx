import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { formatNumber } from '../../utils/format';

export const InventoryReport = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setWarehouses(data);
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data: materials } = await supabase.from('materials').select('*').neq('status', 'Đã xóa').order('name');
      const { data: whs } = await supabase.from('warehouses').select('*').order('name');
      const { data: inventory } = await supabase.from('inventory').select('*');

      if (!materials || !whs || !inventory) return;

      const reportData = materials.map(mat => {
        const matInventory = inventory.filter(i => i.material_id === mat.id);
        const balance = matInventory.reduce((sum, i) => sum + (i.quantity || 0), 0);
        const breakdown = matInventory.map(i => ({
          whName: whs.find(w => w.id === i.warehouse_id)?.name || 'N/A',
          balance: i.quantity
        })).filter(b => b.balance !== 0);

        if (selectedWarehouse) {
          const whInv = matInventory.find(i => i.warehouse_id === selectedWarehouse);
          const whQty = whInv?.quantity || 0;
          return {
            ...mat,
            totalIn: 0,
            totalOut: 0,
            balance: whQty,
            breakdown: whQty !== 0 ? [{ whName: whs.find(w => w.id === selectedWarehouse)?.name, balance: whQty }] : []
          };
        }

        return {
          ...mat,
          totalIn: 0,
          totalOut: 0,
          balance,
          breakdown
        };
      }).filter(item => item.balance !== 0);

      const groupedReport: any[] = [];
      reportData.forEach(item => {
        const existing = groupedReport.find(g => g.name.toLowerCase().trim() === item.name.toLowerCase().trim() && g.unit === item.unit);
        if (existing) {
          existing.balance += item.balance;
          item.breakdown.forEach((b: any) => {
            const exWh = existing.breakdown.find((eb: any) => eb.whName === b.whName);
            if (exWh) exWh.balance += b.balance;
            else existing.breakdown.push(b);
          });
        } else {
          groupedReport.push({ ...item });
        }
      });

      setReport(groupedReport);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Kiểm tra tồn kho" onBack={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-primary" /> Kiểm tra tồn kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Xem chi tiết vật tư theo từng kho</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-full md:w-64">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tất cả các kho</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-bottom border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Vật tư / Phân bổ kho</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">ĐVT</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Tổng nhập</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Tổng xuất</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Tồn kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">Đang tải...</td></tr>
                ) : report.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">Không có dữ liệu</td></tr>
                ) : (
                  report.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors align-top">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.code && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">#{item.code}</span>}
                          <div className="text-sm font-bold text-gray-800">{item.name}</div>
                        </div>
                        <div className="mt-2 space-y-1">
                          {item.breakdown.map((b: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-[10px]">
                              <span className="text-gray-400">{b.whName}:</span>
                              <span className="font-bold text-primary">{formatNumber(b.balance)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-500">{item.unit}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-blue-600">+{formatNumber(item.totalIn)}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-orange-600">-{formatNumber(item.totalOut)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        <span className={`px-2 py-1 rounded-lg ${item.balance <= 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {formatNumber(item.balance)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
