import { useState } from 'react';
import { Download } from 'lucide-react';
import { motion } from 'motion/react';
import ExcelJS from 'exceljs';
import { supabase } from '../../supabaseClient';
import { formatDataForExcel } from '../../utils/excelHelper';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { BACKUP_TABLES } from './Backup';

export const BackupNow = ({ onBack, addToast }: { onBack: () => void, addToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFullBackup = async () => {
    setLoading(true);
    setStatus('Đang chuẩn bị dữ liệu...');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CDX Manager';
      workbook.lastModifiedBy = 'CDX System';
      workbook.created = new Date();

      // 1. Tạo trang bìa TỔNG QUAN
      const summarySheet = workbook.addWorksheet('TỔNG QUAN', { views: [{ showGridLines: false }] });
      
      summarySheet.getCell('A1').value = 'HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX 2026';
      summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF008060' } };
      
      summarySheet.getCell('A3').value = 'BÁO CÁO SAO LƯU DỮ LIỆU TOÀN BỘ';
      summarySheet.getCell('A3').font = { size: 14, bold: true };

      summarySheet.getCell('A5').value = 'Ngày thực hiện:';
      summarySheet.getCell('B5').value = new Date().toLocaleString('vi-VN');
      
      summarySheet.getCell('A6').value = 'Số lượng bảng:';
      summarySheet.getCell('B6').value = BACKUP_TABLES.length;

      summarySheet.getCell('A8').value = 'Dữ liệu chi tiết được trình bày trong các Tab tương ứng bên dưới.';
      summarySheet.getCell('A8').font = { italic: true };

      summarySheet.getColumn(1).width = 25;
      summarySheet.getColumn(2).width = 50;

      // 2. Thêm dữ liệu các bảng
      const labels: string[] = [];
      const stats: Record<string, number> = {};

      for (const table of BACKUP_TABLES) {
        labels.push(table.label);
        setStatus(`Đang trích xuất: ${table.label}...`);
        
        const { data, error } = await supabase.from(table.id).select('*');
        if (error) {
          console.error(`Error fetching ${table.id}:`, error);
          continue;
        }

        const rowCount = data?.length || 0;
        stats[table.label] = rowCount;

        if (data && rowCount > 0) {
          const sheet = workbook.addWorksheet(table.label.substring(0, 31).replace(/\//g, '-'));
          const formattedData = formatDataForExcel(data);
          const columns = Object.keys(formattedData[0]);

          // Thiết lập tiêu đề (Header)
          const headerRow = sheet.addRow(columns);
          headerRow.height = 25;
          headerRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF008060' }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });

          // Thêm dữ liệu
          formattedData.forEach((item) => {
            const row = sheet.addRow(Object.values(item));
            row.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
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
            column.width = Math.min(maxColumnLength + 4, 50);
          });
        }
      }

      setStatus('Đang tạo file Excel...');
      const fileName = `CDX_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;

      const email = localStorage.getItem('backup_email');

      if (email) {
        setStatus(`Đang gửi email tới ${email}...`);
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Chuyển Buffer sang Base64
        const uint8Array = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const fileData = btoa(binary);

        const response = await fetch('/api/send-backup', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': 'cdx-secret-2026'
          },
          body: JSON.stringify({
            email,
            fileName,
            fileData,
            tableList: labels,
            tableStats: stats
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send email');
        }
      }

      setStatus('Hoàn tất!');
      addToast('Sao lưu toàn bộ dữ liệu thành công!' + (email ? ` Đã gửi tới email ${email}.` : ''), 'success');
    } catch (err: any) {
      console.error('Backup error:', err);
      addToast('Đã xảy ra lỗi khi sao lưu dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageBreadcrumb title="Sao lưu toàn phần" onBack={onBack} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
        <div className={`p-8 rounded-full ${loading ? 'bg-primary/10 animate-pulse' : 'bg-primary/10'}`}>
          <Download size={64} className="text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">Sao lưu toàn bộ dữ liệu</h2>
          <p className="text-gray-500 max-w-md">
            Hệ thống sẽ xuất toàn bộ dữ liệu từ tất cả các bảng ra một file Excel duy nhất để bạn có thể lưu trữ ngoại tuyến.
          </p>
        </div>

        {loading && (
          <div className="w-full max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-primary h-full"
            />
          </div>
        )}

        <p className="text-sm font-medium text-primary h-5">{status}</p>

        <div className="flex gap-4 w-full">
          <button
            onClick={handleFullBackup}
            disabled={loading}
            className="flex-1 bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-900/20 disabled:opacity-50"
          >
            <Download size={20} />
            {loading ? 'ĐANG SAO LƯU...' : 'BẮT ĐẦU SAO LƯU'}
          </button>
          <button
            onClick={onBack}
            disabled={loading}
            className="px-8 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};
