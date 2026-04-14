import { useState, useEffect } from 'react';
import {
  Settings,
  Mail,
  Info,
  RefreshCw,
  Layers,
  Save,
  Play,
  Clock,
  Check,
  ChevronDown,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { formatDataForExcel } from '@/utils/excelHelper';
import { supabase } from '@/lib/supabase';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';

export const BACKUP_TABLES = [
  // 1. Nhân sự & Lương
  { id: 'users', label: '1. Danh sách Nhân sự' },
  { id: 'salary_settings', label: '2. Cấu hình Lương (Hợp đồng)' },
  { id: 'attendance', label: '3. Dữ liệu Chấm công (Lương)' },
  { id: 'advances', label: '4. Dữ liệu Tạm ứng (Lương)' },
  { id: 'allowances', label: '5. Dữ liệu Phụ cấp (Lương)' },

  // 4. Báo cáo & Nhật ký (Move to 2nd position)
  { id: 'construction_diaries', label: '6. Nhật ký thi công' },
  { id: 'notes', label: '7. Ghi chú & Nhật ký' },
  { id: 'costs', label: '8. Báo cáo Chi phí' },
  { id: 'reminders', label: '9. Thông báo & Nhắc việc' },

  // 3. Sản xuất (Move to 3rd position)
  { id: 'production_orders', label: '10. Lệnh sản xuất' },
  { id: 'bom_configs', label: '11. Định mức sản xuất (BOM)' },

  // 2. Kho bãi & Vật tư (Move to last position)
  { id: 'warehouses', label: '12. Danh sách Kho' },
  { id: 'material_groups', label: '13. Nhóm vật tư' },
  { id: 'materials', label: '14. Danh mục Vật tư' },
  { id: 'partners', label: '15. Khách hàng & NCC' },
  { id: 'stock_in', label: '16. Báo cáo Nhập kho' },
  { id: 'stock_out', label: '17. Báo cáo Xuất kho' },
  { id: 'transfers', label: '18. Báo cáo Chuyển kho' },
];

export const Backup = ({
  user,
  onBack,
  addToast,
}: {
  user?: any;
  onBack: () => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) => {
  const [email, setEmail] = useState(() => localStorage.getItem(`backup_email_${user?.id}`) || '');
  const [frequency, setFrequency] = useState('Thủ công (không tự động)');
  const [time, setTime] = useState('06:00');
  const [selectedTables, setSelectedTables] = useState<string[]>(BACKUP_TABLES.map((t) => t.id));
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch(`/api/get-backup-config?userId=${user.id}`, {
          headers: { 'x-api-key': 'cdx-secret-2026' },
        });
        if (response.ok) {
          const config = await response.json();
          const localEmail = localStorage.getItem(`backup_email_${user?.id}`);
          if (!localEmail && config.email) {
            setEmail(config.email);
          }
          if (config.enabled !== undefined) setEnabled(config.enabled);

          if (config.schedule) {
            const parts = config.schedule.split(' ');
            if (parts.length >= 2) {
              const prevTime = `${parts[1].padStart(2, '0')}:${parts[0].padStart(2, '0')}`;
              setTime(prevTime);
              if (config.schedule.endsWith('* * *')) setFrequency('Hàng ngày');
              else if (config.schedule.endsWith('* * 0')) setFrequency('Hàng tuần');
              else if (config.schedule.endsWith('1 * *')) setFrequency('Hàng tháng');
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải cấu hình backup:', err);
      }
    };
    fetchConfig();
  }, [user?.id]);

  const toggleTable = (id: string) => {
    setSelectedTables((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const selectAll = () => setSelectedTables(BACKUP_TABLES.map((t) => t.id));
  const deselectAll = () => setSelectedTables([]);

  const handleSave = async () => {
    localStorage.setItem(`backup_email_${user?.id}`, email);

    const [hours, minutes] = time.split(':');
    let cronSchedule = `${minutes} ${hours} * * *`;
    if (frequency === 'Hàng tuần') cronSchedule = `${minutes} ${hours} * * 0`;
    if (frequency === 'Hàng tháng') cronSchedule = `${minutes} ${hours} 1 * *`;

    try {
      const response = await fetch('/api/save-backup-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'cdx-secret-2026',
        },
        body: JSON.stringify({ userId: user?.id, email, schedule: cronSchedule, enabled }),
      });

      if (response.ok) {
        addToast('Đã lưu cấu hình và đồng bộ với Server!', 'success');
      } else {
        throw new Error('Không thể đồng bộ với Server');
      }
    } catch (err: any) {
      addToast('Lỗi Server: ' + err.message, 'error');
    }
  };

  const handleBackupNow = async () => {
    // 1. Validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      addToast('Vui lòng nhập email nhận file báo cáo!', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      addToast('Địa chỉ email không hợp lệ!', 'error');
      return;
    }

    if (selectedTables.length === 0) {
      addToast('Vui lòng chọn ít nhất một bảng dữ liệu!', 'error');
      return;
    }

    setIsBackingUp(true);
    setBackupStatus('Đang khởi tạo báo cáo EXCEL...');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CDX Manager';
      workbook.lastModifiedBy = 'CDX System';
      workbook.created = new Date();

      // 1. Tạo trang bìa TỔNG QUAN
      const summarySheet = workbook.addWorksheet('TỔNG QUAN', {
        views: [{ showGridLines: false }],
      });

      // Tiêu đề thương hiệu (Tăng kích thước và khoảng cách)
      summarySheet.getRow(1).height = 30;
      summarySheet.getCell('A1').value = 'CON ĐƯỜNG XANH - CỘNG TÁC ĐỂ VƯƠN XA';
      summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF2D5A27' } };

      summarySheet.getRow(2).height = 20;
      summarySheet.getCell('A2').value = 'HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX 2026';
      summarySheet.getCell('A2').font = { size: 11, italic: true, color: { argb: 'FF6B7280' } };

      // Thông tin chung
      summarySheet.getRow(4).height = 25;
      summarySheet.getCell('A4').value = 'BÁO CÁO SAO LƯU DỮ LIỆU TOÀN BỘ';
      summarySheet.getCell('A4').font = { size: 14, bold: true };
      summarySheet.getCell('A4').alignment = { vertical: 'middle' };

      const infoBox = [
        ['Ngày thực hiện:', new Date().toLocaleString('vi-VN')],
        ['Số lượng bảng:', selectedTables.length],
        ['Trạng thái:', 'Hoàn tất (Xuất trực tiếp)'],
      ];

      infoBox.forEach((row, i) => {
        const rowNum = 6 + i;
        summarySheet.getCell(`A${rowNum}`).value = row[0];
        const valueCell = summarySheet.getCell(`B${rowNum}`);
        valueCell.value = row[1];
        valueCell.alignment = { horizontal: 'left' }; // Sửa lỗi số nhảy ra xa
        summarySheet.getCell(`A${rowNum}`).font = { bold: true };
      });

      summarySheet.getCell('A10').value = 'DANH SÁCH CÁC HẠNG MỤC DỮ LIỆU ĐÃ SAO LƯU';
      summarySheet.getCell('A10').font = { size: 12, bold: true, color: { argb: 'FF2D5A27' } };

      summarySheet.getColumn(1).width = 35;
      summarySheet.getColumn(2).width = 45;

      // 2. Chuẩn bị dữ liệu tra cứu (Lookup Data)
      setBackupStatus('Đang chuẩn bị dữ liệu tra cứu...');
      const [
        { data: users },
        { data: warehouses },
        { data: materials },
        { data: groups },
        { data: boms },
      ] = await Promise.all([
        supabase.from('users').select('id, full_name'),
        supabase.from('warehouses').select('id, name'),
        supabase.from('materials').select('id, name'),
        supabase.from('material_groups').select('id, name'),
        supabase.from('bom_configs').select('id, name'),
      ]);
      const lookupData = { users, warehouses, materials, groups, boms };

      // 3. Thêm dữ liệu các bảng và thu thập thống kê cho trang bìa
      const labels: string[] = [];
      let currentStatsRow = 12;

      // Header bảng thông kê
      summarySheet.getRow(11).height = 22;
      summarySheet.getCell('A11').value = 'Tên bảng dữ liệu';
      summarySheet.getCell('B11').value = 'Số lượng bản ghi hiện hữu';
      ['A11', 'B11'].forEach((cell) => {
        summarySheet.getCell(cell).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2D5A27' },
        };
        summarySheet.getCell(cell).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        summarySheet.getCell(cell).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        summarySheet.getCell(cell).alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Sắp xếp các bảng được chọn theo thứ tự của BACKUP_TABLES
      const sortedSelectedTables = BACKUP_TABLES.filter((t) => selectedTables.includes(t.id)).map(
        (t) => t.id,
      );

      for (const tableId of sortedSelectedTables) {
        const tableDef = BACKUP_TABLES.find((t) => t.id === tableId);
        if (!tableDef) continue;

        labels.push(tableDef.label);
        setBackupStatus(`Đang trích xuất: ${tableDef.label}...`);

        // Lọc dữ liệu: Không lấy các bản ghi đã xóa
        const { data } = await supabase.from(tableId).select('*').neq('status', 'Đã xóa');

        const rowCount = data?.length || 0;

        // Điền thông tin vào bảng thống kê trang bìa
        summarySheet.getCell(`A${currentStatsRow}`).value = tableDef.label;
        summarySheet.getCell(`B${currentStatsRow}`).value = rowCount;
        ['A', 'B'].forEach((col) => {
          summarySheet.getCell(`${col}${currentStatsRow}`).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          summarySheet.getCell(`${col}${currentStatsRow}`).alignment = { vertical: 'middle' };
        });
        currentStatsRow++;

        if (data && rowCount > 0) {
          const sheetName = tableDef.label.substring(0, 31).replace(/[:\\/?*[\]]/g, '-');
          const sheet = workbook.addWorksheet(sheetName);
          const formattedData = formatDataForExcel(data, lookupData);
          if (formattedData.length === 0) continue;

          const columns = Object.keys(formattedData[0]);

          // Thiết lập tiêu đề (Header)
          const headerRow = sheet.addRow(columns);
          headerRow.height = 25;
          headerRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF2D5A27' },
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });

          // Thêm dữ liệu
          formattedData.forEach((item) => {
            const rowArr = Object.values(item);
            const row = sheet.addRow(rowArr);
            row.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              };
              if (typeof cell.value === 'number') {
                cell.alignment = { horizontal: 'right' };
              }
            });
          });

          // Tự động giãn cột và format
          sheet.columns.forEach((column) => {
            let maxColumnLength = 0;
            column.eachCell!({ includeEmpty: true }, (cell) => {
              const columnLength = cell.value ? cell.value.toString().length : 10;
              if (columnLength > maxColumnLength) {
                maxColumnLength = columnLength;
              }
            });
            column.width = Math.min(maxColumnLength + 4, 60);
          });
        }
      }

      setBackupStatus('Đang hoàn tất file và tải xuống...');
      const fileName = `CDX_Backup_Pro_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();

      // Tạo link tải xuống trực tiếp trên trình duyệt
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      setBackupStatus('Hoàn tất!');
      addToast('Đã xuất file và tải xuống máy thành công!', 'success');
    } catch (err: any) {
      addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setIsBackingUp(false);
      setBackupStatus('');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Sao lưu dữ liệu" onBack={onBack} />

      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 max-w-4xl mx-auto space-y-8 relative overflow-hidden">
        {isBackingUp && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
            <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-xl font-black text-gray-800 uppercase">Đang sao lưu...</h3>
              <p className="text-sm font-medium text-primary animate-pulse">{backupStatus}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                <Mail size={14} className="text-primary" /> Email người nhận file
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email nhận file..."
                className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
              />
              <p className="text-[10px] text-gray-400 mt-2 italic flex items-center gap-1">
                <Info size={12} /> Email này sẽ nhận file Excel sao lưu từ hệ thống.
              </p>
            </div>

            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-relaxed italic">
                <b>Lưu ý:</b> Máy chủ gửi mail (SMTP) đã được thiết lập mặc định. Bạn chỉ cần nhập
                email người nhận và bắt đầu sao lưu.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                  <RefreshCw size={14} className="text-primary" /> Tần suất
                </label>
                <div className="relative">
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-medium appearance-none"
                  >
                    <option>Thủ công (không tự động)</option>
                    <option>Hàng ngày</option>
                    <option>Hàng tuần</option>
                    <option>Hàng tháng</option>
                  </select>
                  <ChevronDown
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                  <Clock size={14} className="text-primary" /> Giờ backup
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-800">Tự động sao lưu trên Server</h4>
                <p className="text-[10px] text-gray-500">Kích hoạt tác vụ chạy ngầm của Server</p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`w-14 h-8 rounded-full transition-all relative ${enabled ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${enabled ? 'right-1' : 'left-1'}`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layers size={14} className="text-primary" /> Chọn bảng dữ liệu (
                {selectedTables.length})
              </label>
              <div className="flex gap-3">
                <button
                  onClick={selectAll}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Chọn hết
                </button>
                <button
                  onClick={deselectAll}
                  className="text-[10px] font-bold text-gray-400 hover:underline"
                >
                  Bỏ hết
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 max-h-[320px] overflow-y-auto">
              {BACKUP_TABLES.map((table) => (
                <label
                  key={table.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedTables.includes(table.id) ? 'bg-white border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedTables.includes(table.id) ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                  >
                    {selectedTables.includes(table.id) && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedTables.includes(table.id)}
                    onChange={() => toggleTable(table.id)}
                  />
                  <span
                    className={`text-xs font-bold ${selectedTables.includes(table.id) ? 'text-gray-800' : 'text-gray-500'}`}
                  >
                    {table.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-50">
          <button
            onClick={handleSave}
            className="flex-1 bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <Save size={20} /> LƯU CẤU HÌNH
          </button>
          <button
            onClick={handleBackupNow}
            className="flex-1 bg-primary text-white font-black py-4 rounded-2xl hover:bg-primary-dark transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <Play size={20} /> BẮT ĐẦU SAO LƯU
          </button>
        </div>
      </div>
    </div>
  );
};
