import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, RefreshCw, EyeOff, Download, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';

import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { isActiveWarehouse } from '@/utils/inventory';
import { ToastType } from '../shared/Toast';
import { formatNumber } from '@/utils/format';
import { getTonKhoTable, TonKhoRow } from '@/utils/inventory';
import { getAllowedWarehouses } from '@/utils/helpers';
import {
  PageToolbar,
  FilterPanel,
  HideZeroToggle,
  FilterSearchInput,
  DateRangeFilter,
} from '../shared/PageToolbar';
import { ReportImagePreviewModal } from '../shared/ReportImagePreviewModal';

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
  const [hideEmpty, setHideEmpty] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const mainTableRef = useRef<HTMLDivElement>(null);

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
    import('@/utils/excelExport').then(({ exportToExcel }) => {
      const rowsWithTotal = [
        ...report.map((r) => [
          r.materialCode,
          r.materialName,
          r.materialGroup,
          r.warehouseName,
          r.tonDau,
          r.tongNhap,
          r.tongXuat,
          r.chuyenDen,
          r.chuyenDi,
          r.tonCuoi,
        ]),
        [
          'TỔNG CỘNG',
          '',
          totals.tonCuoi,
          '',
          totals.tonDau,
          totals.tongNhap,
          totals.tongXuat,
          totals.chuyenDen,
          totals.chuyenDi,
          totals.tonCuoi,
        ],
      ];
      exportToExcel({
        title: 'Kiểm tra Tồn kho',
        sheetName: 'Tồn kho',
        columns: [
          'Mã VT',
          'Tên vật tư',
          'Nhóm',
          'Kho',
          'Tồn đầu kỳ',
          'Nhập',
          'Xuất',
          'Chuyển đến',
          'Chuyển đi',
          'Tồn cuối kỳ',
        ],
        rows: rowsWithTotal,
        fileName: `CDX_TonKho_${new Date().toISOString().slice(0, 10)}.xlsx`,
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
          fileName="TonKho.png"
        />
      )}

      <div className="flex items-center justify-between gap-2 mb-4">
        <PageBreadcrumb title="Kiểm tra tồn kho" onBack={onBack} />
        <PageToolbar
          tableRef={mainTableRef}
          captureOptions={{
            reportTitle: 'KIỂM TRA TỒN KHO',
            subtitle: `Từ ngày: ${startDate} - Đến ngày: ${endDate}`,
          }}
          onImageCaptured={setPreviewImageUrl}
          onExportExcel={handleExportExcel}
          showFilter={showFilter}
          onFilterToggle={() => setShowFilter((f) => !f)}
        />
      </div>

      <FilterPanel
        show={showFilter}
        onReset={() => {
          setStartDate(firstOfYear);
          setEndDate(today);
          setSelectedWarehouse('');
          setSearchTerm('');
          setHideEmpty(true);
        }}
      >
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />

        <div className="flex flex-col gap-2 min-w-[200px]">
          <label className="text-[10px] font-bold text-gray-400 border-l-2 border-primary/20 pl-2 uppercase tracking-wider">
            Kho hàng
          </label>
          <div className="relative">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer bg-white"
            >
              <option value="">Tất cả kho được phép</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
            <div className="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        <HideZeroToggle value={hideEmpty} onChange={setHideEmpty} label="Ẩn vật tư tồn = 0" />

        <FilterSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Tên, mã vật tư..."
        />
      </FilterPanel>

      {/* Bảng tồn kho */}
      <div
        ref={mainTableRef}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-max text-left border-separate border-spacing-0 min-w-full">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider sticky left-0 z-20 bg-primary min-w-[170px] w-[170px] max-w-[170px] md:max-w-none shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] border-b border-primary/20">
                  Vật tư
                </th>
                <th className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border-b border-primary/20 text-center">
                  Kho
                </th>
                <th className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-center whitespace-nowrap border-b border-primary/20">
                  Tồn
                </th>
                <th
                  className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-center whitespace-nowrap border-b border-primary/20"
                  title="Đơn vị tính"
                >
                  Đ.V.T
                </th>
                <th
                  className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-right whitespace-nowrap border-b border-primary/20"
                  title="Số lượng tồn kho ban đầu tính đến ngày Đầu Kỳ"
                >
                  Tồn đầu
                </th>
                <th
                  className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-right whitespace-nowrap border-b border-primary/20"
                  title="Số lượng nhập vào kho trong khoảng thời gian chọn"
                >
                  Nhập
                </th>
                <th
                  className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-right whitespace-nowrap border-b border-primary/20"
                  title="Số lượng xuất ra khỏi kho trong khoảng thời gian chọn"
                >
                  Xuất
                </th>
                <th
                  className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-right whitespace-nowrap border-b border-primary/20"
                  title="Số lượng chuyển từ kho khác đến kho này"
                >
                  Đến
                </th>
                <th
                  className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-right whitespace-nowrap border-b border-primary/20"
                  title="Số lượng chuyển từ kho này đi kho khác"
                >
                  Đi
                </th>
                <th
                  className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-right whitespace-nowrap border-b border-primary/20"
                  title="Tồn đầu + Nhập - Xuất + Chuyển đến - Chuyển đi"
                >
                  Tồn cuối
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 italic">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : report.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 italic">
                    Không có kết quả nào. {hideEmpty && 'Gợi ý: Hãy tắt "Ẩn vật tư tồn = 0"'}
                  </td>
                </tr>
              ) : (
                <>
                  {(() => {
                    let lastGroupKey = '';
                    let currentBg = 'bg-white';
                    return report.map((row, idx) => {
                      const groupKey = row.materialId; // Nhóm theo vật tư
                      if (groupKey !== lastGroupKey) {
                        currentBg = currentBg === 'bg-white' ? 'bg-gray-100/80' : 'bg-white';
                        lastGroupKey = groupKey;
                      }

                      return (
                        <tr
                          key={idx}
                          className={`hover:brightness-95 transition-colors group ${currentBg}`}
                        >
                          <td
                            className={`px-1.5 md:px-4 py-1 sticky left-0 z-10 border-b border-r border-gray-200/60 min-w-[170px] w-[170px] max-w-[170px] md:max-w-none shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] ${currentBg} group-hover:brightness-95 transition-colors whitespace-normal`}
                          >
                            <p className="text-[9px] md:text-xs font-bold text-gray-800 leading-[1.1] break-words">
                              {row.materialName}
                              {row.materialCode && (
                                <span className="text-[8px] text-gray-400 font-normal ml-1 italic inline">
                                  ({row.materialCode})
                                </span>
                              )}
                            </p>
                          </td>
                          <td
                            className="px-1.5 md:px-4 py-1 text-[8px] md:text-xs font-medium text-gray-600 whitespace-nowrap border-b border-gray-200/60 text-center"
                            title={row.warehouseName}
                          >
                            {row.warehouseName}
                          </td>
                          <td className="px-1.5 md:px-4 py-1.5 text-center whitespace-nowrap border-b border-gray-200/60">
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] md:text-xs font-black ${row.tonCuoi <= 0 ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}
                            >
                              {formatNumber(row.tonCuoi)}
                            </span>
                          </td>
                          <td className="px-1.5 md:px-4 py-1.5 text-[9px] md:text-xs font-bold text-gray-400 text-center whitespace-nowrap border-b border-gray-200/60">
                            {row.unit}
                          </td>
                          <td className="px-1.5 md:px-4 py-1.5 text-[10px] md:text-xs text-right font-bold text-gray-700 whitespace-nowrap border-b border-gray-200/60">
                            {formatNumber(row.tonDau)}
                          </td>
                          <td className="px-1.5 md:px-4 py-1.5 text-[10px] md:text-xs text-right font-black text-blue-600 whitespace-nowrap border-b border-gray-200/60">
                            {row.tongNhap > 0 ? `+${formatNumber(row.tongNhap)}` : '—'}
                          </td>
                          <td className="px-1.5 md:px-4 py-1.5 text-[10px] md:text-xs text-right font-black text-orange-600 whitespace-nowrap border-b border-gray-200/60">
                            {row.tongXuat > 0 ? `-${formatNumber(row.tongXuat)}` : '—'}
                          </td>
                          <td className="px-1.5 md:px-4 py-1.5 text-[10px] md:text-xs text-right font-black text-teal-600 whitespace-nowrap border-b border-gray-200/60">
                            {row.chuyenDen > 0 ? `+${formatNumber(row.chuyenDen)}` : '—'}
                          </td>
                          <td className="px-1.5 md:px-4 py-1.5 text-[10px] md:text-xs text-right font-black text-purple-600 whitespace-nowrap border-b border-gray-200/60">
                            {row.chuyenDi > 0 ? `-${formatNumber(row.chuyenDi)}` : '—'}
                          </td>
                          <td className="px-1.5 md:px-4 py-1.5 text-right whitespace-nowrap border-b border-gray-200/60">
                            <span
                              className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg text-[10px] md:text-xs font-black ring-1 ring-inset ${row.tonCuoi <= 0 ? 'bg-red-50 text-red-600 ring-red-200' : row.tonCuoi <= 5 ? 'bg-amber-50 text-amber-600 ring-amber-200' : 'bg-green-50 text-green-700 ring-green-200'}`}
                            >
                              {formatNumber(row.tonCuoi)}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {/* Dòng tổng */}
                  <tr className="bg-primary/10 font-bold border-t-2 border-primary/20">
                    <td
                      className="px-4 py-3 text-xs font-black text-primary sticky left-0 z-20 bg-primary/10 border-r border-primary/20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] border-b-2 border-primary/20"
                      colSpan={2}
                    >
                      TỔNG CỘNG
                    </td>
                    <td className="px-1 md:px-4 py-3 text-center border-b-2 border-primary/20">
                      <span className="px-1.5 py-0.5 rounded-lg bg-primary/20 text-primary font-black text-[10px] md:text-xs">
                        {formatNumber(totals.tonCuoi)}
                      </span>
                    </td>
                    <td className="px-1 md:px-4 py-3 text-[9px] md:text-xs text-center text-primary/70 font-normal italic border-b-2 border-primary/20">
                      ({report.length} VT)
                    </td>
                    <td className="px-1 md:px-4 py-3 text-[10px] md:text-xs text-right text-gray-800 border-b-2 border-primary/20">
                      {formatNumber(totals.tonDau)}
                    </td>
                    <td className="px-1 md:px-4 py-3 text-[10px] md:text-xs text-right text-blue-700 border-b-2 border-primary/20">
                      +{formatNumber(totals.tongNhap)}
                    </td>
                    <td className="px-1 md:px-4 py-3 text-[10px] md:text-xs text-right text-orange-700 border-b-2 border-primary/20">
                      -{formatNumber(totals.tongXuat)}
                    </td>
                    <td className="px-1 md:px-4 py-3 text-[10px] md:text-xs text-right text-teal-700 border-b-2 border-primary/20">
                      +{formatNumber(totals.chuyenDen)}
                    </td>
                    <td className="px-1 md:px-4 py-3 text-[10px] md:text-xs text-right text-purple-700 border-b-2 border-primary/20">
                      -{formatNumber(totals.chuyenDi)}
                    </td>
                    <td className="px-1 md:px-4 py-3 text-[10px] md:text-xs text-right whitespace-nowrap border-b-2 border-primary/20">
                      <span className="px-2 py-1 rounded-lg bg-primary text-white font-black">
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
