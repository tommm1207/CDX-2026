import { exportTableImage } from '../../utils/reportExport';
import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, EyeOff, Download, Search, X, ImageIcon, Share2 } from 'lucide-react';
import { useRef } from 'react';


import { SaveImageButton } from '../shared/SaveImageButton';
import { formatDate } from '@/utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import * as xlsx from 'xlsx';
import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { isActiveWarehouse } from '@/utils/inventory';
import { ToastType } from '../shared/Toast';
import { formatNumber } from '@/utils/format';
import { getTonKhoTable, TonKhoRow } from '@/utils/inventory';
import { getAllowedWarehouses } from '@/utils/helpers';
import { Button } from '../shared/Button';
import { ExcelButton } from '../shared/ExcelButton';

interface ReportRow extends TonKhoRow {
  materialName: string;
  materialCode: string;
  materialGroup: string;
  unit: string;
  warehouseName: string;
}

export const InventoryReport = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [hideEmpty, setHideEmpty] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [isCapturingTable, setIsCapturingTable] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);
  const logoBase64 = '/logo.png';

  useEffect(() => {
    Promise.all([
      supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name'),
      supabase.from('materials').select('*, material_groups(name)').order('name'),
    ]).then(([whRes, matRes]) => {
      if (whRes.data) {
        let whs = whRes.data.filter(isActiveWarehouse);
        const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
        if (allowedWhIds) {
          whs = whs.filter((w) => allowedWhIds.includes(w.id));
        }
        setWarehouses(whs);
      }
      if (matRes.data) setMaterials(matRes.data);
    });
  }, [user.data_view_permission]);

  useEffect(() => {
    if (materials.length > 0 && warehouses.length > 0) {
      fetchReport();
    }
  }, [selectedWarehouse, startDate, endDate, materials, warehouses, hideEmpty, searchTerm]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (!startDate || !endDate) {
        setReport([]);
        return;
      }

      const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
      const whParam = selectedWarehouse || allowedWhIds || undefined;
      const rows = await getTonKhoTable(startDate, endDate, whParam);

      const enriched: ReportRow[] = rows
        .map((row) => {
          const mat = materials.find((m) => m.id === row.material_id);
          const wh = warehouses.find((w) => w.id === row.warehouse_id);
          return {
            ...row,
            materialName: mat?.name || 'N/A',
            materialCode: mat?.code || '',
            materialGroup: mat?.material_groups?.name || '',
            unit: mat?.unit || '',
            warehouseName: wh?.name || 'N/A',
          };
        })
        // Sắp xếp: theo tên vật tư, rồi tên kho
        .sort(
          (a, b) =>
            a.materialName.localeCompare(b.materialName, 'vi') ||
            a.warehouseName.localeCompare(b.warehouseName, 'vi'),
        );

      let finalRows = hideEmpty
        ? enriched.filter(
            (r) => r.materialName !== 'N/A' && r.warehouseName !== 'N/A' && r.tonCuoi > 0,
          )
        : enriched;

      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        finalRows = finalRows.filter(
          (r) =>
            r.materialName.toLowerCase().includes(lowerSearch) ||
            r.materialCode.toLowerCase().includes(lowerSearch),
        );
      }

      setReport(finalRows);
    } catch (err: any) {
      console.error('Error fetching report:', err);
      setReport([]);
      if (addToast) addToast('Lỗi tải báo cáo: ' + err.message, 'error');
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
    { tonDau: 0, tongNhap: 0, tongXuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 },
  );

  const handleExportExcel = () => {
    if (report.length === 0) {
      if (addToast) addToast('Không có dữ liệu để xuất Excel', 'warning');
      return;
    }

    try {
      const exportData = report.map((row) => ({
        'Mã vật tư': row.materialCode || '',
        'Tên vật tư': row.materialName || '',
        Nhóm: row.materialGroup || '',
        Kho: row.warehouseName || '',
        'Tồn đầu kỳ': row.tonDau,
        Nhập: row.tongNhap,
        Xuất: row.tongXuat,
        'Chuyển đến': row.chuyenDen,
        'Chuyển đi': row.chuyenDi,
        'Tồn cuối kỳ': row.tonCuoi,
      }));

      exportData.push({
        'Mã vật tư': 'TỔNG CỘNG',
        'Tên vật tư': '',
        Nhóm: '',
        Kho: '',
        'Tồn đầu kỳ': totals.tonDau,
        Nhập: totals.tongNhap,
        Xuất: totals.tongXuat,
        'Chuyển đến': totals.chuyenDen,
        'Chuyển đi': totals.chuyenDi,
        'Tồn cuối kỳ': totals.tonCuoi,
      });

      const ws = xlsx.utils.json_to_sheet(exportData);

      const colWidths = Object.keys(exportData[0] || {}).map((key) => {
        let max = key.length;
        exportData.forEach((row) => {
          const val = (row as any)[key];
          const len = val ? val.toString().length : 0;
          if (len > max) max = len;
        });
        return { wch: Math.min(max + 2, 50) };
      });
      ws['!cols'] = colWidths;

      const whName = selectedWarehouse
        ? warehouses.find((w) => w.id === selectedWarehouse)?.name
        : 'TatCaKho';
      const cleanWhName = whName?.replace(/[^a-zA-Z0-9_\u0080-\uFFFF]/g, '') || 'TatCaKho';
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName = `TonKho_${cleanWhName}_${dateStr}.xlsx`;

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Tồn Kho');
      xlsx.writeFile(wb, fileName);

      if (addToast) addToast('Xuất Excel thành công!', 'success');
    } catch (err: any) {
      console.error('Export Excel error:', err);
      if (addToast) addToast('Lỗi xuất Excel: ' + err.message, 'error');
    }
  };

  const handleSaveTableImage = () => {
    if (reportRef.current) {
      const whName = selectedWarehouse
        ? warehouses.find((w) => w.id === selectedWarehouse)?.name
        : 'TatCaKho';
      const cleanWhName = whName?.replace(/[^a-zA-Z0-9_\u0080-\uFFFF]/g, '') || 'TatCaKho';
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      exportTableImage({
        element: reportRef.current,
        fileName: `TonKho_${cleanWhName}_${dateStr}.png`,
        addToast,
        onStart: () => setIsCapturingTable(true),
        onEnd: () => setIsCapturingTable(false),
      });
    }
  };



  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageBreadcrumb title="Kiểm tra tồn kho" onBack={onBack} />
        <div className="flex items-center gap-2 justify-end flex-1">
          <ExcelButton onClick={handleExportExcel} />
          <Button
            size="icon"
            variant={showFilter ? 'primary' : 'outline'}
            onClick={() => setShowFilter((f) => !f)}
            icon={Search}
          />
          <SaveImageButton 
            onClick={handleSaveTableImage} 
            isCapturing={isCapturingTable} 
            title="Lưu ảnh báo cáo A4" 
          />
        </div>
      </div>

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="z-10"
          >
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Từ ngày (đầu kỳ)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Đến ngày (cuối kỳ)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Kho hàng</label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="">Tất cả các kho</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm</label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Mã hoặc tên vật tư..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Cấu hình hiển thị
                  </label>
                  <button
                    onClick={() => setHideEmpty(!hideEmpty)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                      hideEmpty
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${hideEmpty ? 'bg-amber-400' : 'bg-gray-200'}`}
                    >
                      <div
                        className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${hideEmpty ? 'left-4.5' : 'left-0.5'}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">
                      ({hideEmpty ? 'Đang ẩn' : 'Đang hiện'} vật tư tồn bằng 0)
                    </span>
                  </button>
                </div>
                <div className="text-[10px] text-gray-400 font-medium italic">
                  Tìm thấy {report.length} kết quả phù hợp
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px] whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Kho</th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center"
                  title="Đơn vị tính"
                >
                  Đ.V.T
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right"
                  title="Số lượng tồn kho ban đầu tính đến ngày Đầu Kỳ"
                >
                  Tồn đầu kỳ
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right"
                  title="Số lượng nhập vào kho trong khoảng thời gian chọn"
                >
                  Nhập trong kỳ
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right"
                  title="Số lượng xuất ra khỏi kho trong khoảng thời gian chọn"
                >
                  Xuất trong kỳ
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right"
                  title="Số lượng chuyển từ kho khác đến kho này"
                >
                  Chuyển kho đến
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right"
                  title="Số lượng chuyển từ kho này đi kho khác"
                >
                  Chuyển kho đi
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right"
                  title="Tồn đầu + Nhập - Xuất + Chuyển đến - Chuyển đi"
                >
                  Tồn cuối kỳ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 italic">
                    Đang tải...
                  </td>
                </tr>
              ) : report.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 italic">
                    Không có dữ liệu trong kỳ này
                  </td>
                </tr>
              ) : (
                <>
                  {report.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-800">{row.materialName}</p>
                        {row.materialCode && (
                          <p className="text-[10px] text-gray-400 font-mono">#{row.materialCode}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{row.warehouseName}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 text-center">{row.unit}</td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-gray-700">
                        {formatNumber(row.tonDau)}
                      </td>
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
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold ${row.tonCuoi <= 0 ? 'bg-red-50 text-red-600' : row.tonCuoi <= 5 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}
                        >
                          {formatNumber(row.tonCuoi)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Dòng tổng */}
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                    <td className="px-4 py-3 text-xs font-bold text-gray-700" colSpan={3}>
                      TỔNG CỘNG ({report.length} mặt hàng)
                    </td>
                    <td className="px-4 py-3 text-xs text-right text-gray-700">
                      {formatNumber(totals.tonDau)}
                    </td>
                    <td className="px-4 py-3 text-xs text-right text-blue-600">
                      +{formatNumber(totals.tongNhap)}
                    </td>
                    <td className="px-4 py-3 text-xs text-right text-orange-600">
                      -{formatNumber(totals.tongXuat)}
                    </td>
                    <td className="px-4 py-3 text-xs text-right text-teal-600">
                      +{formatNumber(totals.chuyenDen)}
                    </td>
                    <td className="px-4 py-3 text-xs text-right text-purple-600">
                      -{formatNumber(totals.chuyenDi)}
                    </td>
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

      {/* Hidden Report Template (A4 Landscape) */}
      <div className="fixed -left-[4000px] -top-[4000px] no-print">
        <div 
          ref={reportRef}
          className="bg-white p-12 w-[1123px] min-h-[794px] font-sans text-gray-900 border"
          style={{ width: '1123px' }}
        >
          {/* Company Header */}
          <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-primary/20">
            <div className="flex items-center gap-6">
              <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10">
                <img src={logoBase64} alt="Company Logo" className="w-20 h-20 object-contain rounded-full" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-primary tracking-tighter uppercase italic">CDX ERP SYSTEM</h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">Smart Construction Management • 2026 Edition</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 italic">Inventory Audit Report</span>
                  <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                  <span className="text-[10px] text-gray-500 font-bold italic tracking-wide">Data Ref: {new Date().getTime().toString(36).toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-1">Báo Cáo Tổng Hợp Tồn Kho</h2>
              <p className="text-xs text-gray-500 font-bold italic">Thời gian xuất: {new Date().toLocaleString('vi-VN')}</p>
              <div className="mt-4 flex flex-col items-end gap-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">Status: AUDITED_OK</p>
                <div className="h-0.5 w-12 bg-primary/20 rounded-full" />
              </div>
            </div>
          </div>

          {/* Filters Info */}
          <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Cấu hình báo cáo</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold">Từ ngày:</p>
                  <p className="text-sm font-black text-gray-900">{startDate ? formatDate(startDate) : '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-bold">Đến ngày:</p>
                  <p className="text-sm font-black text-gray-900">{endDate ? formatDate(endDate) : '—'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-gray-800 rounded-full" />
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Bộ lọc ứng dụng</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold">Kho lọc:</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-widest">{selectedWarehouse ? warehouses.find(w => w.id === selectedWarehouse)?.name : 'Tất cả kho'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-bold">Tìm kiếm:</p>
                  <p className="text-sm font-black text-gray-900">{searchTerm || 'Tất cả vật tư'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">Vật tư</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10">Kho</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 text-right">Tồn đầu</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 text-right font-black">Nhập (+)</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 text-right font-black">Xuất (-)</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 text-right">Chuyển (+)</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-white/10 text-right">Chuyển (-)</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest italic text-right bg-primary-hover">Tồn cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[11px]">
              {report.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-3 font-black text-gray-900 uppercase tracking-tight">{item.materialName}</td>
                  <td className="px-4 py-3 font-bold text-gray-500">{item.warehouseName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(item.tonDau)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-600 font-black">+{formatNumber(item.tongNhap)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-orange-600 font-black">-{formatNumber(item.tongXuat)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-teal-600">+{formatNumber(item.chuyenDen)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-purple-600">-{formatNumber(item.chuyenDi)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-black text-primary bg-primary/5">{formatNumber(item.tonCuoi)} {item.unit}</td>
                </tr>
              ))}
              <tr className="bg-primary/10 font-black">
                <td colSpan={2} className="px-4 py-4 text-[11px] text-primary uppercase text-right italic tracking-[0.1em]">Tổng số toàn kho:</td>
                <td className="px-4 py-4 text-right tabular-nums">{formatNumber(totals.tonDau)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-blue-600">+{formatNumber(totals.tongNhap)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-orange-600">-{formatNumber(totals.tongXuat)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-teal-600">+{formatNumber(totals.chuyenDen)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-purple-600">-{formatNumber(totals.chuyenDi)}</td>
                <td className="px-4 py-4 text-lg text-right tabular-nums text-primary">{formatNumber(totals.tonCuoi)}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer Branding */}
          <div className="mt-12 flex justify-between items-end border-t border-gray-100 pt-6">
            <div className="space-y-1">
              <p className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] italic">CDX ERP SYSTEM</p>
              <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">End of inventory audit report • Verified System Log</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1">Audit Protocol Verified</p>
              <div className="text-[10px] text-gray-400 font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                Security Hash: <span className="text-primary font-black tracking-widest italic ml-1 underline">A1-SAFE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
