import { useState, useEffect, useRef } from 'react';
import {
  Download,
  Mail,
  ShieldCheck,
  CheckSquare,
  Square,
  Clock,
  ChevronDown,
  BellRing,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';
import { formatDataForExcel } from '@/utils/excelHelper';
import { applyCDXSheetStyle } from '@/utils/excelExport';
import { PageBreadcrumb } from '@/components/shared';
import { Button } from '@/components/shared';
import { BACKUP_TABLES } from './Backup';

const ScrollColumn = ({
  items,
  value,
  onChange,
  label,
}: {
  items: string[];
  value: string;
  onChange: (val: string) => void;
  label: string;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Nhân bản danh sách 5 lần để tạo hiệu ứng vô tận
  const infiniteItems = [...items, ...items, ...items, ...items, ...items];
  const itemHeight = 40; // Chiều cao mỗi dòng (px)

  useEffect(() => {
    if (scrollRef.current) {
      // Cuộn về bộ item ở giữa để bắt đầu vòng lặp
      const middleIndex = items.length * 2 + items.indexOf(value);
      scrollRef.current.scrollTop = middleIndex * itemHeight;
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight } = scrollRef.current;

    // Nếu cuộn gần đến đầu hoặc cuối, nhảy về giữa (silent jump)
    if (scrollTop < itemHeight * 2) {
      scrollRef.current.scrollTop = scrollTop + items.length * itemHeight;
    } else if (scrollTop > scrollHeight - itemHeight * 8) {
      scrollRef.current.scrollTop = scrollTop - items.length * itemHeight;
    }

    // Tính toán giá trị hiện tại dựa trên vị trí cuộn
    const currentIndex = Math.round(scrollTop / itemHeight) % items.length;
    if (items[currentIndex] !== value) {
      onChange(items[currentIndex]);
    }
  };

  return (
    <div className="space-y-2 text-center flex-1">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative h-[120px] overflow-hidden group">
        {/* Overlay phủ mờ đầu cuối */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y border-primary/10 bg-primary/5 -z-0" />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overflow-x-hidden scroll-smooth snap-y snap-mandatory py-10"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`
            div::-webkit-scrollbar { display: none; }
          `}</style>
          {infiniteItems.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className={`h-[40px] flex items-center justify-center text-lg font-black snap-center transition-all ${item === value ? 'text-primary scale-110 opacity-100' : 'text-gray-300 opacity-40'}`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TimeScrollPicker = ({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}) => {
  const [h, m] = value.split(':');
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const mins = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 z-50 ring-1 ring-black/5"
    >
      <div className="flex gap-4 items-center">
        <ScrollColumn
          label="Giờ"
          items={hours}
          value={h}
          onChange={(val) => onChange(`${val}:${m}`)}
        />
        <div className="text-2xl font-black text-primary mt-6">:</div>
        <ScrollColumn
          label="Phút"
          items={mins}
          value={m}
          onChange={(val) => onChange(`${h}:${val}`)}
        />
      </div>
      <div className="pt-6 mt-4 border-t border-gray-50">
        <Button
          variant="blue"
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20"
          onClick={onClose}
        >
          XÁC NHẬN GIỜ
        </Button>
      </div>
    </motion.div>
  );
};

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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFreqDropdown, setShowFreqDropdown] = useState(false);

  const [autoBackup, setAutoBackup] = useState({
    enabled: false,
    frequency: 'daily',
    time: '00:00',
    email: 'conduongxanhthueton@gmail.com',
  });

  const freqOptions = [
    { value: 'daily', label: 'Hàng ngày' },
    { value: 'weekly', label: 'Hàng tuần' },
    { value: 'monthly', label: 'Hàng tháng' },
  ];

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
      addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateWorkbook = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CDX ERP System';
    workbook.created = new Date();

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

      await fetch('/api/send-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'cdx-secret-2026' },
        body: JSON.stringify({
          fileData: base64Data,
          email: autoBackup.email,
          fileName: `CDX_Backup_${new Date().toISOString().split('T')[0]}.xlsx`,
          tableList: labels,
        }),
      });
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
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
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
                    onClick={() =>
                      setSelectedTables((prev) =>
                        prev.includes(table.id)
                          ? prev.filter((t) => t !== table.id)
                          : [...prev, table.id],
                      )
                    }
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${selectedTables.includes(table.id) ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20' : 'bg-gray-50 border-transparent text-gray-400'}`}
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
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Clock size={20} />
                </div>
                <h2 className="text-sm font-black uppercase tracking-tight">
                  Cấu hình Sao lưu tự động
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">
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

                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                      Tần suất
                    </label>
                    <button
                      onClick={() => setShowFreqDropdown(!showFreqDropdown)}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-black flex items-center justify-between border border-transparent focus:border-primary/20 transition-all"
                    >
                      {freqOptions.find((o) => o.value === autoBackup.frequency)?.label}
                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-300 ${showFreqDropdown ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence>
                      {showFreqDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5"
                        >
                          {freqOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setAutoBackup({ ...autoBackup, frequency: opt.value });
                                setShowFreqDropdown(false);
                              }}
                              className="w-full p-4 text-left text-sm font-bold hover:bg-primary/5 hover:text-primary transition-all"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                      Giờ chạy (24h)
                    </label>
                    <button
                      onClick={() => setShowTimePicker(!showTimePicker)}
                      className="w-full p-4 bg-primary/5 text-primary rounded-2xl text-2xl font-black flex items-center justify-center gap-3 border border-primary/20 hover:bg-primary/10 transition-all"
                    >
                      <Clock size={20} />
                      {autoBackup.time}
                    </button>
                    <AnimatePresence>
                      {showTimePicker && (
                        <TimeScrollPicker
                          value={autoBackup.time}
                          onChange={(val) => setAutoBackup({ ...autoBackup, time: val })}
                          onClose={() => setShowTimePicker(false)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                      Email nhận báo cáo
                    </label>
                    <input
                      type="email"
                      value={autoBackup.email}
                      onChange={(e) => setAutoBackup({ ...autoBackup, email: e.target.value })}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 ring-primary/10 transition-all"
                      placeholder="email@gmail.com"
                    />
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full py-4 rounded-2xl border-dashed border-2 hover:bg-gray-50 transition-all"
                onClick={saveAutoBackupConfig}
                isLoading={loading}
              >
                CẬP NHẬT CẤU HÌNH TỰ ĐỘNG
              </Button>
            </section>
          </div>

          <div className="space-y-4">
            <section className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 space-y-6 text-center sticky top-24">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <BellRing size={32} className="text-primary animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                  Thao tác nhanh
                </h3>
              </div>
              <div className="space-y-3">
                <Button
                  variant="blue"
                  className="w-full py-5 rounded-2xl font-black"
                  onClick={async () => {
                    setLoading(true);
                    const wb = await generateWorkbook();
                    const buffer = await wb.xlsx.writeBuffer();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([buffer]));
                    a.download = `CDX_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
                    a.click();
                    setLoading(false);
                    addToast('Tải file thành công!', 'success');
                  }}
                  isLoading={loading}
                >
                  <Download size={18} className="mr-2" /> VỀ THIẾT BỊ
                </Button>
                <Button
                  variant="orange"
                  className="w-full py-5 rounded-2xl shadow-lg shadow-orange-500/20 font-black"
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
