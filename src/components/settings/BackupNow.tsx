import { useState } from 'react';
import { Download } from 'lucide-react';
import { motion } from 'motion/react';
import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';
import { formatDataForExcel } from '@/utils/excelHelper';
import { applyCDXSheetStyle } from '@/utils/excelExport';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { BACKUP_TABLES } from './Backup';

export const BackupNow = ({
  onBack,
  addToast,
}: {
  onBack: () => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFullBackup = async () => {
    setLoading(true);
    setStatus('Đang chuẩn bị dữ liệu...');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CDX ERP System';
      workbook.lastModifiedBy = 'CDX System';
      workbook.created = new Date();
      workbook.modified = new Date();

      // 1. Trang bìa TỔNG QUAN (CDX branded)
      const summarySheet = workbook.addWorksheet('TỔNG QUAN', {
        views: [{ showGridLines: false }],
      });
      summarySheet.getColumn(1).width = 28;
      summarySheet.getColumn(2).width = 55;

      const t = summarySheet.getCell('A1');
      t.value = 'CDX – CON ĐƯỜNG XANH';
      t.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF2D5A27' } };

      const sub = summarySheet.getCell('A2');
      sub.value = 'HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX 2026';
      sub.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF6B7280' } };

      summarySheet.getCell('A4').value = 'BÁO CÁO SAO LƯU DỮ LIỆU TOÀN BỘ';
      summarySheet.getCell('A4').font = { name: 'Calibri', size: 14, bold: true };

      summarySheet.getCell('A6').value = 'Ngày thực hiện:';
      summarySheet.getCell('B6').value = new Date().toLocaleString('vi-VN');
      summarySheet.getCell('A6').font = { bold: true };

      summarySheet.getCell('A7').value = 'Số lượng bảng:';
      summarySheet.getCell('B7').value = BACKUP_TABLES.length;
      summarySheet.getCell('A7').font = { bold: true };

      summarySheet.getCell('A9').value =
        'Dữ liệu chi tiết được trình bày trong các Tab tương ứng bên dưới.';
      summarySheet.getCell('A9').font = { italic: true, color: { argb: 'FF6B7280' } };

      // 2. Chuẩn bị dữ liệu tra cứu (Lookup Data)
      setStatus('Đang chuẩn bị dữ liệu tra cứu...');
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

      // 3. Thêm dữ liệu các bảng với CDX style
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
          const formattedData = formatDataForExcel(data, lookupData);
          const columns = Object.keys(formattedData[0]);
          const rows = formattedData.map((item) => Object.values(item));

          const sheet = workbook.addWorksheet(table.label.substring(0, 31).replace(/\//g, '-'), {
            views: [{ showGridLines: false }],
          });
          applyCDXSheetStyle(sheet, table.label, columns, rows);
        }
      }

      setStatus('Đang tạo file Excel...');
      const fileName = `CDX_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();

      // Tải về máy
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Removed email sending logic as requested by user

      setStatus('Hoàn tất!');
      addToast('Sao lưu toàn bộ dữ liệu thành công! File đã được tải về máy.', 'success');
    } catch (err: any) {
      console.error('Backup error:', err);
      addToast('Lỗi sao lưu: ' + err.message, 'error');
      setStatus('Lỗi!');
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(''), 4000);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <PageBreadcrumb title="Sao lưu nhanh" onBack={onBack} />

      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-6 text-center"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Download size={36} className="text-primary" />
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-800">Sao lưu toàn bộ dữ liệu</h2>
            <p className="text-sm text-gray-500 mt-2">
              Xuất toàn bộ dữ liệu hệ thống ra file Excel (.xlsx) với định dạng CDX chuẩn, bao gồm
              tất cả {BACKUP_TABLES.length} bảng dữ liệu.
            </p>
          </div>

          {status && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3"
            >
              <p className="text-sm font-bold text-primary">{status}</p>
            </motion.div>
          )}

          <button
            onClick={handleFullBackup}
            disabled={loading}
            className="w-full py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-primary/90 transition-all active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang sao lưu...
              </>
            ) : (
              <>
                <Download size={16} />
                Bắt đầu sao lưu
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 italic">
            File sẽ được tải về máy của bạn ngay lập tức.
          </p>
        </motion.div>
      </div>
    </div>
  );
};
