import { useState, useEffect } from 'react';
import { Settings, Mail, Info, RefreshCw, Layers, Save, Play, Clock, Check } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';

export const BACKUP_TABLES = [
  { id: 'users', label: 'Bảng Nhân sự' },
  { id: 'attendance', label: 'Bảng Chấm công' },
  { id: 'salary_settings', label: 'Cài đặt lương' },
  { id: 'advances', label: 'Tạm ứng - Phụ cấp' },
  { id: 'stock_in', label: 'Báo cáo Nhập kho' },
  { id: 'stock_out', label: 'Báo cáo Xuất kho' },
  { id: 'transfers', label: 'Báo cáo Chuyển kho' },
  { id: 'warehouses', label: 'Danh sách Kho' },
  { id: 'materials', label: 'Danh mục Vật tư' },
  { id: 'material_groups', label: 'Nhóm vật tư' },
  { id: 'costs', label: 'Báo cáo Chi phí' },
  { id: 'notes', label: 'Nhật ký - Ghi chú' },
  { id: 'reminders', label: 'Lịch nhắc' },
  { id: 'partners', label: 'Khách hàng & NCC' },
];

export const Backup = ({ onBack, addToast }: { onBack: () => void, addToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('backup_email') || '');
  const [frequency, setFrequency] = useState('Thủ công (không tự động)');
  const [time, setTime] = useState('06:00');
  const [selectedTables, setSelectedTables] = useState<string[]>(BACKUP_TABLES.map(t => t.id));
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/get-backup-config', {
          headers: { 'x-api-key': 'cdx-secret-2026' } // Fallback for local
        });
        if (response.ok) {
          const config = await response.json();
          if (config.email) setEmail(config.email);
          if (config.enabled) setEnabled(config.enabled);
        }
      } catch (err) {
        console.error('Lỗi khi tải cấu hình backup:', err);
      }
    };
    fetchConfig();
  }, []);

  const toggleTable = (id: string) => {
    setSelectedTables(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedTables(BACKUP_TABLES.map(t => t.id));
  const deselectAll = () => setSelectedTables([]);

  const handleSave = async () => {
    localStorage.setItem('backup_email', email);
    
    const [hours, minutes] = time.split(':');
    let cronSchedule = `${minutes} ${hours} * * *`;
    if (frequency === 'Hàng tuần') cronSchedule = `${minutes} ${hours} * * 0`; 
    if (frequency === 'Hàng tháng') cronSchedule = `${minutes} ${hours} 1 * *`; 

    try {
      const response = await fetch('/api/save-backup-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'cdx-secret-2026'
        },
        body: JSON.stringify({ email, schedule: cronSchedule, enabled })
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
    if (selectedTables.length === 0) {
      addToast('Vui lòng chọn ít nhất một bảng dữ liệu!', 'error');
      return;
    }

    setIsBackingUp(true);
    setBackupStatus('Đang truy xuất dữ liệu...');

    try {
      const { utils, write } = await import('xlsx');
      const workbook = utils.book_new();

      // 1. Tạo trang bìa TỔNG QUAN
      const summaryData = [
        ['HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX 2026'],
        [''],
        ['BÁO CÁO SAO LƯU DỮ LIỆU'],
        ['Ngày thực hiện:', new Date().toLocaleString('vi-VN')],
        ['Số lượng bảng:', selectedTables.length],
        ['Danh sách bảng:', selectedTables.map(id => BACKUP_TABLES.find(t => t.id === id)?.label).join(', ')],
        [''],
        ['Chi tiết các bảng dữ liệu được liệt kê ở các Tab bên dưới.'],
      ];
      const summarySheet = utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 60 }];
      utils.book_append_sheet(workbook, summarySheet, 'TỔNG QUAN');

      // 2. Thêm dữ liệu các bảng
      const labels: string[] = [];
      for (const tableId of selectedTables) {
        const table = BACKUP_TABLES.find(t => t.id === tableId);
        if (!table) continue;
        labels.push(table.label);
        
        setBackupStatus(`Đang xử lý: ${table.label}...`);
        const { data } = await supabase.from(tableId).select('*');
        
        if (data && data.length > 0) {
          const worksheet = utils.json_to_sheet(data);
          
          // Tự động giãn cột
          const keys = Object.keys(data[0]);
          worksheet['!cols'] = keys.map(key => {
            const maxLen = Math.max(
              key.toString().length,
              ...data.map(row => (row[key] ? row[key].toString().length : 0))
            );
            return { wch: Math.min(maxLen + 2, 50) };
          });

          utils.book_append_sheet(workbook, worksheet, table.label.substring(0, 31).replace(/\//g, '-'));
        }
      }

      const fileName = `CDX_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileData = write(workbook, { type: 'base64', bookType: 'xlsx' });

      setBackupStatus('Đang gửi email qua hệ thống...');
      const response = await fetch('/api/send-backup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'cdx-secret-2026'
        },
        body: JSON.stringify({ email, fileName, fileData, tableList: labels })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gửi mail thất bại');
      }

      setBackupStatus('Hoàn tất!');
      addToast('Sao lưuthành công! File đã gửi tới ' + email, 'success');
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

        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary">
            <Settings size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase">Sao lưu dữ liệu</h2>
            <p className="text-xs text-gray-400">Lưu trữ dữ liệu an toàn định kỳ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                <Mail size={14} className="text-primary" /> Email người nhận file
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
                <b>Lưu ý:</b> Máy chủ gửi mail (SMTP) đã được thiết lập mặc định. Bạn chỉ cần nhập email người nhận và bắt đầu sao lưu.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                  <RefreshCw size={14} className="text-primary" /> Tần suất
                </label>
                <select
                  value={frequency}
                  onChange={e => setFrequency(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm font-medium"
                >
                  <option>Thủ công (không tự động)</option>
                  <option>Hàng ngày</option>
                  <option>Hàng tuần</option>
                  <option>Hàng tháng</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                  <Clock size={14} className="text-primary" /> Giờ backup
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
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
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${enabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layers size={14} className="text-primary" /> Chọn bảng dữ liệu ({selectedTables.length})
              </label>
              <div className="flex gap-3">
                <button onClick={selectAll} className="text-[10px] font-bold text-primary hover:underline">Chọn hết</button>
                <button onClick={deselectAll} className="text-[10px] font-bold text-gray-400 hover:underline">Bỏ hết</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 max-h-[320px] overflow-y-auto">
              {BACKUP_TABLES.map(table => (
                <label key={table.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedTables.includes(table.id) ? 'bg-white border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedTables.includes(table.id) ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}>
                    {selectedTables.includes(table.id) && <Check size={12} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedTables.includes(table.id)}
                    onChange={() => toggleTable(table.id)}
                  />
                  <span className={`text-xs font-bold ${selectedTables.includes(table.id) ? 'text-gray-800' : 'text-gray-500'}`}>{table.label}</span>
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
