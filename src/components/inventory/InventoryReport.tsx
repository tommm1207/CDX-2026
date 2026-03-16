import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, EyeOff } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { formatNumber } from '../../utils/format';
import { getTonKhoTable, TonKhoRow } from '../../utils/inventory';

interface ReportRow extends TonKhoRow {
  materialName: string;
  materialCode: string;
  unit: string;
  warehouseName: string;
}

export const InventoryReport = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [report, setReport] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  // Mặc định: đầu kỳ = 01/01 năm nay, cuối kỳ = hôm nay
  const today = new Date().toISOString().split('T')[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const [startDate, setStartDate] = useState<string>(firstOfYear);
  const [endDate, setEndDate] = useState<string>(today);
  const [hideEmpty, setHideEmpty] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name'),
      supabase.from('materials').select('*').order('name'),
    ]).then(([whRes, matRes]) => {
      if (whRes.data) setWarehouses(whRes.data);
      if (matRes.data) setMaterials(matRes.data);
    });
  }, []);

  useEffect(() => {
    if (materials.length > 0 && warehouses.length > 0) {
      fetchReport();
    }
  }, [selectedWarehouse, startDate, endDate, materials, warehouses]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const rows = await getTonKhoTable(startDate, endDate, selectedWarehouse || undefined);

      const enriched: ReportRow[] = rows
        .map(row => {
          const mat = materials.find(m => m.id === row.material_id);
          const wh = warehouses.find(w => w.id === row.warehouse_id);
          return {
            ...row,
            materialName: mat?.name || 'N/A',
            materialCode: mat?.code || '',
            unit: mat?.unit || '',
            warehouseName: wh?.name || 'N/A',
          };
        })
        // Sắp xếp: theo tên vật tư, rồi tên kho
        .sort((a, b) => a.materialName.localeCompare(b.materialName, 'vi') || a.warehouseName.localeCompare(b.warehouseName, 'vi'));

      const finalRows = hideEmpty
        ? enriched.filter(r => r.materialName !== 'N/A' && r.warehouseName !== 'N/A' && r.tonCuoi > 0)
        : enriched;

      setReport(finalRows);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tổng hợp cuối bảng
  const totals = report.reduce(
    (acc, r) => ({
      tonDau: acc.tonDau + r.tonDau,
      tongNhap: acc.tongNhap + r.tongNhap,
      tongXuat: acc.tongXuat + r.tongXuat,
      chuyenDen: acc.chuyenDen + r.chuyenDen,
      chuyenDi: acc.chuyenDi + r.chuyenDi,
      tonCuoi: acc.tonCuoi + r.tonCuoi,
    }),
    { tonDau: 0, tongNhap: 0, tongXuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 }
  );

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Kiểm tra tồn kho" onBack={onBack} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-primary" /> Kiểm tra tồn kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Tồn đầu kỳ + Nhập - Xuất + Chuyển đến - Chuyển đi = Tồn cuối kỳ
          </p>
        </div>
        <button
          onClick={fetchReport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Từ ngày (đầu kỳ)</label>
          <input
            type="date" value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Đến ngày (cuối kỳ)</label>
          <input
            type="date" value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Kho hàng</label>
          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tất cả các kho</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
          />
          <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <EyeOff size={16} className="text-gray-400" />
            Ẩn vật tư đã hết (Tồn = 0) và dữ liệu hỏng (N/A)
          </span>
        </label>
      </div>

      {/* Bảng tồn kho — giống bảng Tonkho app cũ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center" title="Đơn vị tính">Đ.V.T</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right" title="Số lượng tồn kho ban đầu tính đến ngày Đầu Kỳ">Tồn đầu kỳ</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right" title="Số lượng nhập vào kho trong khoảng thời gian chọn">Nhập trong kỳ</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right" title="Số lượng xuất ra khỏi kho trong khoảng thời gian chọn">Xuất trong kỳ</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right" title="Số lượng chuyển từ kho khác đến kho này">Chuyển kho đến</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right" title="Số lượng chuyển từ kho này đi kho khác">Chuyển kho đi</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right" title="Tồn đầu + Nhập - Xuất + Chuyển đến - Chuyển đi">Tồn cuối kỳ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : report.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 italic">Không có dữ liệu trong kỳ này</td></tr>
              ) : (
                <>
                  {report.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-800">{row.materialName}</p>
                        {row.materialCode && <p className="text-[10px] text-gray-400 font-mono">#{row.materialCode}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{row.warehouseName}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 text-center">{row.unit}</td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-gray-700">{formatNumber(row.tonDau)}</td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-blue-600">
                        {row.tongNhap > 0 ? `+${formatNumber(row.tongNhap)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-orange-600">
                        {row.tongXuat > 0 ? `-${formatNumber(row.tongXuat)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-teal-600">
                        {row.chuyenDen > 0 ? `+${formatNumber(row.chuyenDen)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-purple-600">
                        {row.chuyenDi > 0 ? `-${formatNumber(row.chuyenDi)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${row.tonCuoi <= 0 ? 'bg-red-50 text-red-600' : row.tonCuoi <= 5 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                          {formatNumber(row.tonCuoi)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Dòng tổng */}
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                    <td className="px-4 py-3 text-xs font-bold text-gray-700" colSpan={3}>TỔNG CỘNG ({report.length} mặt hàng)</td>
                    <td className="px-4 py-3 text-xs text-right text-gray-700">{formatNumber(totals.tonDau)}</td>
                    <td className="px-4 py-3 text-xs text-right text-blue-600">+{formatNumber(totals.tongNhap)}</td>
                    <td className="px-4 py-3 text-xs text-right text-orange-600">-{formatNumber(totals.tongXuat)}</td>
                    <td className="px-4 py-3 text-xs text-right text-teal-600">+{formatNumber(totals.chuyenDen)}</td>
                    <td className="px-4 py-3 text-xs text-right text-purple-600">-{formatNumber(totals.chuyenDi)}</td>
                    <td className="px-4 py-3 text-xs text-right">
                      <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary font-bold">
                        {formatNumber(totals.tonCuoi)}
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
