import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  Download,
  ArrowLeft,
  Calendar,
  Package,
  Warehouse,
  History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';

import { Employee } from '@/types';
import { PageBreadcrumb } from '@/components/shared';
import { ToastType } from '@/components/shared';
import { formatNumber, formatDate } from '@/utils/format';
import { PageToolbar } from '@/components/shared';
import { ReportImagePreviewModal } from '@/components/shared';
import { Button } from '@/components/shared';

interface Transaction {
  date: string;
  type: 'Nhập' | 'Xuất' | 'Chuyển đến' | 'Chuyển đi';
  code: string;
  quantity: number;
  warehouse_name: string;
  target_warehouse?: string;
  notes?: string;
}

export const InventoryDetailReport = ({
  user,
  materialId,
  warehouseId,
  startDate: initialStartDate,
  endDate: initialEndDate,
  onBack,
  addToast,
}: {
  user: Employee;
  materialId: string;
  warehouseId: string;
  startDate: string;
  endDate: string;
  onBack: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<any>(null);
  const [warehouse, setWarehouse] = useState<any>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const mainTableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInfo();
    fetchTransactions();
  }, [materialId, warehouseId, initialStartDate, initialEndDate]);

  const fetchInfo = async () => {
    const [matRes, whRes] = await Promise.all([
      supabase.from('materials').select('name, code, unit').eq('id', materialId).single(),
      supabase.from('warehouses').select('name').eq('id', warehouseId).single(),
    ]);
    if (matRes.data) setMaterial(matRes.data);
    if (whRes.data) setWarehouse(whRes.data);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const [si, so, tr] = await Promise.all([
        supabase
          .from('stock_in')
          .select('date, import_code, quantity, notes, warehouses(name)')
          .eq('material_id', materialId)
          .eq('warehouse_id', warehouseId)
          .eq('status', 'Đã duyệt')
          .gte('date', initialStartDate)
          .lte('date', initialEndDate),
        supabase
          .from('stock_out')
          .select('date, export_code, quantity, notes, warehouses(name)')
          .eq('material_id', materialId)
          .eq('warehouse_id', warehouseId)
          .in('status', ['Đã duyệt', 'Chờ duyệt'])
          .gte('date', initialStartDate)
          .lte('date', initialEndDate),
        supabase
          .from('transfers')
          .select(
            'date, transfer_code, quantity, notes, from_warehouses:from_warehouse_id(name), to_warehouses:to_warehouse_id(name)',
          )
          .eq('material_id', materialId)
          .or(`from_warehouse_id.eq.${warehouseId},to_warehouse_id.eq.${warehouseId}`)
          .in('status', ['Đã duyệt', 'Chờ duyệt'])
          .gte('date', initialStartDate)
          .lte('date', initialEndDate),
      ]);

      const all: Transaction[] = [];

      (si.data || []).forEach((item: any) => {
        all.push({
          date: item.date,
          type: 'Nhập',
          code: item.import_code,
          quantity: Number(item.quantity),
          warehouse_name: item.warehouses?.name || 'N/A',
          notes: item.notes,
        });
      });

      (so.data || []).forEach((item: any) => {
        all.push({
          date: item.date,
          type: 'Xuất',
          code: item.export_code,
          quantity: Number(item.quantity),
          warehouse_name: item.warehouses?.name || 'N/A',
          notes: item.notes,
        });
      });

      (tr.data || []).forEach((item: any) => {
        const isFrom = item.from_warehouses?.name === warehouse?.name;
        all.push({
          date: item.date,
          type: isFrom ? 'Chuyển đi' : 'Chuyển đến',
          code: item.transfer_code,
          quantity: Number(item.quantity),
          warehouse_name: isFrom ? item.from_warehouses?.name : item.to_warehouses?.name,
          target_warehouse: isFrom ? item.to_warehouses?.name : item.from_warehouses?.name,
          notes: item.notes,
        });
      });

      setTransactions(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    import('@/utils/excelExport').then(({ exportToExcel }) => {
      exportToExcel({
        title: `Báo cáo chi tiết: ${material?.name} (${material?.code})`,
        sheetName: 'Chi tiết',
        columns: ['Ngày', 'Loại', 'Số phiếu', 'Kho', 'Số lượng', 'Ghi chú'],
        rows: transactions.map((t) => [
          t.date,
          t.type,
          t.code,
          t.type.includes('Chuyển')
            ? `${t.warehouse_name} -> ${t.target_warehouse}`
            : t.warehouse_name,
          t.quantity,
          t.notes || '',
        ]),
        fileName: `CDX_ChiTiet_${material?.code}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        addToast,
      });
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      {previewImageUrl && (
        <ReportImagePreviewModal
          imageDataUrl={previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
          fileName={`ChiTiet_${material?.code}.png`}
        />
      )}

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Sổ chi tiết vật tư</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              {material?.name} ({material?.code}) - {warehouse?.name}
            </p>
          </div>
        </div>
        <PageToolbar
          tableRef={mainTableRef}
          captureOptions={{
            reportTitle: 'SỔ CHI TIẾT VẬT TƯ',
            subtitle: `${material?.name} (${material?.code}) | ${warehouse?.name}`,
          }}
          onImageCaptured={setPreviewImageUrl}
          onExportExcel={handleExportExcel}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Vật tư</p>
            <p className="font-bold text-gray-800">{material?.name || '---'}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Warehouse size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Kho hàng</p>
            <p className="font-bold text-gray-800">{warehouse?.name || '---'}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Thời gian</p>
            <p className="font-bold text-gray-800">
              {initialStartDate} - {initialEndDate}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={mainTableRef}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Ngày</th>
                <th className="px-6 py-4">Loại giao dịch</th>
                <th className="px-6 py-4">Số chứng từ</th>
                <th className="px-6 py-4 text-right">Số lượng</th>
                <th className="px-6 py-4">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    Đang tải lịch sử...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    Không có giao dịch nào trong khoảng thời gian này
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          t.type === 'Nhập' || t.type === 'Chuyển đến'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">{t.code}</td>
                    <td
                      className={`px-6 py-4 text-sm font-black text-right ${
                        t.type === 'Nhập' || t.type === 'Chuyển đến'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {t.type === 'Nhập' || t.type === 'Chuyển đến' ? '+' : '-'}
                      {formatNumber(t.quantity)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 italic max-w-xs truncate">
                      {t.type.includes('Chuyển') ? `Tới/Từ: ${t.target_warehouse} | ` : ''}
                      {t.notes || '---'}
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
