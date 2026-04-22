import { useState, useEffect, useRef } from 'react';
import { Download, Mail, ShieldCheck, CheckSquare, Square, Clock, BellRing } from 'lucide-react';
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

  const [autoBackup, setAutoBackup] = useState({
    enabled: false,
    frequency: 'daily',
    time: '00:00',
    email: 'conduongxanhthueton@gmail.com',
  });

  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

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
          tableList: labels,
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

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const currentHour = autoBackup.time.split(':')[0];
  const currentMin = autoBackup.time.split(':')[1];

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 bg-gray-50/50 min-h-screen">
      <PageBreadcrumb title="Sao lưu hệ thống" onBack={onBack} />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* HẠNG MỤC */}
            <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <ShieldCheck size={20} />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-tight">Hạng mục sao lưu</h2>
                </div>
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

            {/* TỰ ĐỘNG */}
            <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Clock size={20} />
                </div>
                <h2 className="text-sm font-black uppercase tracking-tight">Sao lưu tự động</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-5 bg-gray-50 rounded-[1.5rem]">
                    <span className="text-sm font-black text-gray-700 uppercase tracking-tight">
                      Kích hoạt
                    </span>
                    <button
                      onClick={() => setAutoBackup({ ...autoBackup, enabled: !autoBackup.enabled })}
                      className={`w-14 h-7 rounded-full transition-all relative ${autoBackup.enabled ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${autoBackup.enabled ? 'left-8' : 'left-1'}`}
                      />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                      Tần suất chạy
                    </label>
                    <div className="relative">
                      <select
                        value={autoBackup.frequency}
                        onChange={(e) =>
                          setAutoBackup({ ...autoBackup, frequency: e.target.value })
                        }
                        className="w-full p-5 bg-gray-50 rounded-[1.5rem] text-sm font-black border-none outline-none appearance-none cursor-pointer"
                      >
                        <option value="daily">Hàng ngày</option>
                        <option value="weekly">Hàng tuần</option>
                        <option value="monthly">Hàng tháng</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">
                        ▼
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                      Email nhận báo cáo
                    </label>
                    <input
                      type="email"
                      value={autoBackup.email}
                      onChange={(e) => setAutoBackup({ ...autoBackup, email: e.target.value })}
                      className="w-full p-5 bg-gray-50 rounded-[1.5rem] text-sm font-bold border-none outline-none"
                    />
                  </div>
                </div>

                {/* CON LĂN CHỌN GIỜ */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest text-center block">
                    Giờ chạy (Con lăn)
                  </label>
                  <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-[2rem] p-6 h-[180px] relative overflow-hidden group">
                    {/* Highlight bar */}
                    <div className="absolute left-4 right-4 h-12 top-1/2 -translate-y-1/2 bg-white/50 rounded-xl border border-gray-100 pointer-events-none shadow-sm" />

                    <div className="flex items-center gap-2 z-10">
                      {/* Hour Wheel */}
                      <div
                        className="w-16 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-12"
                        ref={hourRef}
                      >
                        {hours.map((h) => (
                          <div
                            key={h}
                            onClick={() =>
                              setAutoBackup({ ...autoBackup, time: `${h}:${currentMin}` })
                            }
                            className={`h-12 flex items-center justify-center text-lg font-black snap-center cursor-pointer transition-all ${currentHour === h ? 'text-primary scale-125' : 'text-gray-300'}`}
                          >
                            {h}
                          </div>
                        ))}
                      </div>
                      <span className="text-xl font-black text-gray-300">:</span>
                      {/* Minute Wheel */}
                      <div
                        className="w-16 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-12"
                        ref={minRef}
                      >
                        {minutes.map((m) => (
                          <div
                            key={m}
                            onClick={() =>
                              setAutoBackup({ ...autoBackup, time: `${currentHour}:${m}` })
                            }
                            className={`h-12 flex items-center justify-center text-lg font-black snap-center cursor-pointer transition-all ${currentMin === m ? 'text-primary scale-125' : 'text-gray-300'}`}
                          >
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full py-4 rounded-2xl border-dashed border-2 font-black tracking-widest text-xs"
                onClick={saveAutoBackupConfig}
                isLoading={loading}
              >
                CẬP NHẬT CẤU HÌNH TỰ ĐỘNG
              </Button>
            </section>
          </div>

          <div className="space-y-4">
            <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6 text-center sticky top-24">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <BellRing size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                Thực thi ngay
              </h3>
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
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `CDX_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
                    a.click();
                    setLoading(false);
                    addToast('Đã tải file!', 'success');
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

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
};
