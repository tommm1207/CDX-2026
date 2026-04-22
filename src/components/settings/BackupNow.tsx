import { useState, useEffect } from 'react';
import {
  Download,
  Mail,
  ShieldCheck,
  CheckSquare,
  Square,
  Clock,
  Settings,
  BellRing,
} from 'lucide-react';
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

  // Auto Backup State
  const [autoBackup, setAutoBackup] = useState({
    enabled: false,
    frequency: 'daily', // daily, weekly, monthly
    time: '00:00',
    email: 'conduongxanhthueton@gmail.com',
  });

  useEffect(() => {
    fetchAutoBackupConfig();
  }, []);

  const fetchAutoBackupConfig = async () => {
    try {
      const { data } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'auto_backup_config')
        .single();
      if (data) setAutoBackup(data.value);
    } catch (err) {}
  };

  const saveAutoBackupConfig = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_configs')
        .upsert({ key: 'auto_backup_config', value: autoBackup }, { onConflict: 'key' });
      if (error) throw error;
      addToast('Đã lưu cấu hình sao lưu tự động!', 'success');
    } catch (err: any) {
      addToast('Lỗi lưu cấu hình: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (id: string) => {
    setSelectedTables((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const generateWorkbook = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CDX ERP System';
    const summarySheet = workbook.addWorksheet('TỔNG QUAN', { views: [{ showGridLines: false }] });
    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 60;
    summarySheet.getCell('A1').value = 'BÁO CÁO SAO LƯU DỮ LIỆU CDX';
    summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF2D5A27' } };

    // Fetch Lookup Data
    const [{ data: users }, { data: warehouses }, { data: materials }] = await Promise.all([
      supabase.from('users').select('id, full_name'),
      supabase.from('warehouses').select('id, name'),
      supabase.from('materials').select('id, name'),
    ]);
    const lookupData = { users, warehouses, materials };

    for (const tableId of selectedTables) {
      const tableInfo = BACKUP_TABLES.find((t) => t.id === tableId);
      if (!tableInfo) continue;
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

  const handleBackupToEmail = async () => {
    if (selectedTables.length === 0) return addToast('Chọn ít nhất 1 mục', 'info');
    setLoading(true);
    try {
      const workbook = await generateWorkbook();
      setStatus('Đang gửi email...');
      const buffer = await workbook.xlsx.writeBuffer();
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer as ArrayBuffer)));

      const labels = BACKUP_TABLES.filter((t) => selectedTables.includes(t.id)).map((t) => t.label);

      const response = await fetch('/api/send-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'cdx-secret-2026' },
        body: JSON.stringify({
          fileData: base64Data,
          email: autoBackup.email,
          fileName: `CDX_Backup_${new Date().toISOString().split('T')[0]}.xlsx`,
          tableList: labels, // Gửi danh sách để Backend list ra mail
        }),
      });

      if (!response.ok) throw new Error('Gửi mail thất bại');
      addToast('Đã gửi sao lưu vào email!', 'success');
    } catch (err: any) {
      addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 bg-gray-50/50 min-h-screen">
      <PageBreadcrumb title="Sao lưu hệ thống" onBack={onBack} />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CẤU HÌNH HẠNG MỤC */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <ShieldCheck size={20} />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-tight">Hạng mục sao lưu</h2>
                </div>
                <button
                  onClick={() =>
                    setSelectedTables(
                      selectedTables.length === BACKUP_TABLES.length
                        ? []
                        : BACKUP_TABLES.map((t) => t.id),
                    )
                  }
                  className="text-[10px] font-black text-primary uppercase hover:bg-primary/5 px-3 py-1.5 rounded-xl transition-all"
                >
                  Tất cả
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BACKUP_TABLES.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => toggleTable(table.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${selectedTables.includes(table.id) ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-transparent text-gray-400'}`}
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

            {/* SAO LƯU TỰ ĐỘNG */}
            <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Clock size={20} />
                </div>
                <h2 className="text-sm font-black uppercase tracking-tight">
                  Sao lưu tự động (Lịch trình)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                      Kích hoạt sao lưu
                    </span>
                    <button
                      onClick={() => setAutoBackup({ ...autoBackup, enabled: !autoBackup.enabled })}
                      className={`w-12 h-6 rounded-full transition-all relative ${autoBackup.enabled ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoBackup.enabled ? 'left-7' : 'left-1'}`}
                      />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                      Tần suất chạy
                    </label>
                    <select
                      value={autoBackup.frequency}
                      onChange={(e) => setAutoBackup({ ...autoBackup, frequency: e.target.value })}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none outline-none"
                    >
                      <option value="daily">Hàng ngày</option>
                      <option value="weekly">Hàng tuần</option>
                      <option value="monthly">Hàng tháng</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                      Giờ chạy (24h)
                    </label>
                    <input
                      type="time"
                      value={autoBackup.time}
                      onChange={(e) => setAutoBackup({ ...autoBackup, time: e.target.value })}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                      Email nhận báo cáo
                    </label>
                    <input
                      type="email"
                      value={autoBackup.email}
                      onChange={(e) => setAutoBackup({ ...autoBackup, email: e.target.value })}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none outline-none"
                      placeholder="example@gmail.com"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full py-4 rounded-2xl border-dashed border-2"
                onClick={saveAutoBackupConfig}
                isLoading={loading}
              >
                LƯU CẤU HÌNH TỰ ĐỘNG
              </Button>
            </section>
          </div>

          {/* HÀNH ĐỘNG TỨ THÌ */}
          <div className="space-y-4">
            <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6 text-center sticky top-24">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <BellRing size={32} className="text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                  Thực thi ngay
                </h3>
                <p className="text-xs text-gray-400 mt-1 font-medium italic">
                  Xuất dữ liệu tức thì ra file Excel
                </p>
              </div>

              {status && (
                <div className="py-2 px-4 bg-primary/5 rounded-xl text-[10px] font-black text-primary uppercase">
                  {status}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  variant="blue"
                  className="w-full py-5 rounded-2xl"
                  onClick={async () => {
                    setLoading(true);
                    const wb = await generateWorkbook();
                    const buf = await wb.xlsx.writeBuffer();
                    const blob = new Blob([buf], {
                      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `CDX_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
                    a.click();
                    setLoading(false);
                    addToast('Đã tải file thành công!', 'success');
                  }}
                  isLoading={loading}
                >
                  <Download size={18} className="mr-2" /> VỀ THIẾT BỊ
                </Button>

                <Button
                  variant="orange"
                  className="w-full py-5 rounded-2xl shadow-lg shadow-orange-500/20"
                  onClick={handleBackupToEmail}
                  isLoading={loading}
                >
                  <Mail size={18} className="mr-2" /> GỬI QUA EMAIL
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
