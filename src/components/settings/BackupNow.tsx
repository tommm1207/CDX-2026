import { useState } from 'react';
import { Download, Mail, ShieldCheck, CheckSquare, Square, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';
import { formatDataForExcel } from '@/utils/excelHelper';
import { applyCDXSheetStyle } from '@/utils/excelExport';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { Button } from '../shared/Button';
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
  const [selectedTables, setSelectedTables] = useState<string[]>(BACKUP_TABLES.map((t) => t.id));

  const toggleTable = (id: string) => {
    setSelectedTables((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selectedTables.length === BACKUP_TABLES.length) setSelectedTables([]);
    else setSelectedTables(BACKUP_TABLES.map((t) => t.id));
  };

  const generateWorkbook = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CDX ERP System';
    workbook.created = new Date();

    // Trang bìa
    const summarySheet = workbook.addWorksheet('TỔNG QUAN', { views: [{ showGridLines: false }] });
    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 60;
    summarySheet.getCell('A1').value = 'BÁO CÁO SAO LƯU DỮ LIỆU CDX';
    summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF2D5A27' } };
    summarySheet.getCell('A3').value = 'Ngày sao lưu:';
    summarySheet.getCell('B3').value = new Date().toLocaleString('vi-VN');

    // Fetch Lookup Data
    setStatus('Đang lấy dữ liệu tra cứu...');
    const [{ data: users }, { data: warehouses }, { data: materials }] = await Promise.all([
      supabase.from('users').select('id, full_name'),
      supabase.from('warehouses').select('id, name'),
      supabase.from('materials').select('id, name'),
    ]);
    const lookupData = { users, warehouses, materials };

    // Fetch Table Data
    for (const tableId of selectedTables) {
      const tableInfo = BACKUP_TABLES.find((t) => t.id === tableId);
      if (!tableInfo) continue;

      setStatus(`Đang trích xuất: ${tableInfo.label}...`);
      const { data, error } = await supabase.from(tableId).select('*');

      if (!error && data && data.length > 0) {
        const formattedData = formatDataForExcel(data, lookupData);
        const columns = Object.keys(formattedData[0]);
        const rows = formattedData.map((item) => Object.values(item));
        const sheet = workbook.addWorksheet(tableInfo.label.substring(0, 31).replace(/\//g, '-'), {
          views: [{ showGridLines: false }],
        });
        applyCDXSheetStyle(sheet, tableInfo.label, columns, rows);
      }
    }
    return workbook;
  };

  const handleBackupToDevice = async () => {
    if (selectedTables.length === 0)
      return addToast('Vui lòng chọn ít nhất 1 mục để sao lưu', 'info');
    setLoading(true);
    try {
      const workbook = await generateWorkbook();
      setStatus('Đang tạo file Excel...');
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CDX_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Đã tải file sao lưu về máy thành công!', 'success');
    } catch (err: any) {
      addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleBackupToEmail = async () => {
    if (selectedTables.length === 0)
      return addToast('Vui lòng chọn ít nhất 1 mục để sao lưu', 'info');
    setLoading(true);
    try {
      const workbook = await generateWorkbook();
      setStatus('Đang gửi email...');
      const buffer = await workbook.xlsx.writeBuffer();
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer as ArrayBuffer)));

      const response = await fetch('/api/backup-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64Data }),
      });

      if (!response.ok) throw new Error('Gửi mail thất bại');
      addToast('Đã gửi file sao lưu vào email thành công!', 'success');
    } catch (err: any) {
      addToast('Lỗi gửi mail: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <PageBreadcrumb title="Sao lưu dữ liệu" onBack={onBack} />

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cấu hình bên trái */}
        <div className="md:col-span-2 space-y-4">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck size={20} />
                <h2 className="text-sm font-black uppercase tracking-tight">Hạng mục sao lưu</h2>
              </div>
              <button
                onClick={toggleAll}
                className="text-[10px] font-black text-primary uppercase bg-primary/5 px-3 py-1.5 rounded-xl"
              >
                {selectedTables.length === BACKUP_TABLES.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BACKUP_TABLES.map((table) => (
                <button
                  key={table.id}
                  onClick={() => toggleTable(table.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    selectedTables.includes(table.id)
                      ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20'
                      : 'bg-gray-50 border-transparent text-gray-400'
                  }`}
                >
                  {selectedTables.includes(table.id) ? (
                    <CheckSquare size={18} className="text-primary" />
                  ) : (
                    <Square size={18} />
                  )}
                  <span
                    className={`text-sm font-bold ${selectedTables.includes(table.id) ? 'text-gray-800' : ''}`}
                  >
                    {table.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Hành động bên phải */}
        <div className="space-y-4">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6 text-center sticky top-24">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Download size={28} className="text-primary" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                Thực hiện
              </h3>
              <p className="text-xs text-gray-400 mt-1 font-medium">
                Chọn phương thức bạn muốn nhận dữ liệu
              </p>
            </div>

            {status && (
              <div className="bg-primary/5 border border-primary/10 py-2 rounded-xl text-[10px] font-black text-primary uppercase animate-pulse">
                {status}
              </div>
            )}

            <div className="space-y-3">
              <Button
                variant="blue"
                className="w-full py-4 rounded-2xl"
                onClick={handleBackupToDevice}
                isLoading={loading}
              >
                <Download size={18} className="mr-2" /> Về thiết bị
              </Button>

              <Button
                variant="orange"
                className="w-full py-4 rounded-2xl"
                onClick={handleBackupToEmail}
                isLoading={loading}
              >
                <Mail size={18} className="mr-2" /> Gửi qua Email
              </Button>
            </div>

            <p className="text-[10px] text-gray-400 italic">
              Dữ liệu sẽ được xuất ra file Excel chuẩn CDX.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
