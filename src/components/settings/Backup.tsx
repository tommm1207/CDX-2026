import { useState } from 'react';
import { Settings, Mail, Zap, Check, Info, RefreshCw, Layers, Save, Play, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { utils, write, writeFile } from 'xlsx';
import { supabase } from '../../supabaseClient';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';

export const BACKUP_TABLES = [
  { id: 'users', label: 'Bảng Nhân sự' },
  { id: 'attendance', label: 'Bảng Chấm công' },
  { id: 'salary_settings', label: 'Cài đặt lương' },
  { id: 'advances', label: 'Tạm ứng / Phụ cấp' },
  { id: 'stock_in', label: 'Báo cáo Nhập kho' },
  { id: 'stock_out', label: 'Báo cáo Xuất kho' },
  { id: 'transfers', label: 'Báo cáo Chuyển kho' },
  { id: 'warehouses', label: 'Danh sách Kho' },
  { id: 'materials', label: 'Danh mục Vật tư' },
  { id: 'material_groups', label: 'Nhóm vật tư' },
  { id: 'costs', label: 'Báo cáo Chi phí' },
  { id: 'notes', label: 'Nhật ký / Ghi chú' },
  { id: 'reminders', label: 'Lịch nhắc' },
  { id: 'partners', label: 'Khách hàng & NCC' },
];

export const Backup = ({ onBack }: { onBack: () => void }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('backup_email') || '');
  const [frequency, setFrequency] = useState('Thủ công (không tự động)');
  const [time, setTime] = useState('06:00');
  const [selectedTables, setSelectedTables] = useState<string[]>(BACKUP_TABLES.map(t => t.id));
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');

  const [smtpConfig, setSmtpConfig] = useState(() => {
    const saved = localStorage.getItem('smtp_config');
    return saved ? JSON.parse(saved) : {
      host: 'smtp.gmail.com',
      port: '465',
      user: '',
      pass: '',
      secure: true
    };
  });
  const [showSmtp, setShowSmtp] = useState(false);

  const toggleTable = (id: string) => {
    setSelectedTables(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedTables(BACKUP_TABLES.map(t => t.id));
  const deselectAll = () => setSelectedTables([]);

  const handleSave = () => {
    localStorage.setItem('backup_email', email);
    localStorage.setItem('smtp_config', JSON.stringify(smtpConfig));
    alert('Đã lưu cấu hình backup và SMTP!');
  };

  const handleBackupNow = async () => {
    if (selectedTables.length === 0) {
      alert('Vui lòng chọn ít nhất một bảng dữ liệu!');
      return;
    }

    setIsBackingUp(true);
    setBackupStatus('Đang truy xuất dữ liệu...');

    try {
      const workbook = utils.book_new();
      for (const tableId of selectedTables) {
        const table = BACKUP_TABLES.find(t => t.id === tableId);
        setBackupStatus(`Đang xử lý: ${table?.label}...`);
        const { data } = await supabase.from(tableId).select('*');
        if (data && data.length > 0) {
          const worksheet = utils.json_to_sheet(data);
          utils.book_append_sheet(workbook, worksheet, (table?.label || tableId).substring(0, 31));
        }
      }

      const fileName = `CDX_Partial_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;

      if (email && smtpConfig.user && smtpConfig.pass) {
        setBackupStatus(`Đang gửi email qua SMTP (${smtpConfig.host}) tới ${email}...`);
        const fileData = write(workbook, { type: 'base64', bookType: 'xlsx' });

        const response = await fetch('/api/send-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            fileName,
            fileData,
            smtpConfig
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send email');
        }
      }

      setBackupStatus('Đang tải file về máy...');
      writeFile(workbook, fileName);

      setBackupStatus('Hoàn tất!');
      alert('Sao lưu thành công! File đã được tải về' + (email ? ` và gửi tới email ${email}.` : '.'));
    } catch (err: any) {
      console.error(err);
      alert('Đã xảy ra lỗi khi sao lưu: ' + err.message);
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
            <div className="relative">
              <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw size={32} className="text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Đang sao lưu...</h3>
              <p className="text-sm font-medium text-primary animate-pulse">{backupStatus}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-gray-50 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary">
              <Settings size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Cấu hình Sao lưu</h2>
              <p className="text-xs text-gray-400 font-medium">Tùy chỉnh dữ liệu và lịch trình sao lưu</p>
            </div>
          </div>
          <button
            onClick={() => setShowSmtp(!showSmtp)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${showSmtp ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Mail size={16} />
            {showSmtp ? 'ẨN SMTP' : 'CẤU HÌNH SMTP'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {showSmtp ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 bg-gray-50 p-6 rounded-3xl border border-gray-100"
              >
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" /> Cấu hình SMTP Server
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpConfig.host}
                      onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Port</label>
                    <input
                      type="text"
                      value={smtpConfig.port}
                      onChange={e => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      placeholder="465"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${smtpConfig.secure ? 'bg-primary border-primary shadow-lg shadow-green-900/20' : 'bg-white border-gray-200 group-hover:border-primary/50'}`}>
                        {smtpConfig.secure && <Check size={14} className="text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={smtpConfig.secure}
                        onChange={e => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })}
                        className="hidden"
                      />
                      <span className="text-xs font-bold text-gray-600">SSL/TLS</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Email (User)</label>
                    <input
                      type="email"
                      value={smtpConfig.user}
                      onChange={e => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Mật khẩu ứng dụng (App Password)</label>
                    <input
                      type="password"
                      value={smtpConfig.pass}
                      onChange={e => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      placeholder="••••••••••••••••"
                    />
                    <p className="text-[9px] text-gray-400 mt-1 italic">Lưu ý: Sử dụng "App Password" nếu dùng Gmail</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                    <Mail size={14} className="text-primary" /> Email nhận backup
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Nhập email nhận file..."
                    className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-2 italic flex items-center gap-1">
                    <Info size={12} /> Hệ thống sẽ gửi file Excel báo cáo vào email này
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
                      className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
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
                      className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-4">
                  <div className="flex gap-4">
                    <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 h-fit">
                      <Info size={24} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-amber-900">Hướng dẫn gửi Email chi tiết</h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Để hệ thống có thể tự động gửi file sao lưu qua email, bạn cần thực hiện các bước sau (Ví dụ với Gmail):
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pl-14">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">1</div>
                      <p className="text-[11px] text-amber-800">Truy cập <b>myaccount.google.com</b> và bật <b>Xác minh 2 bước</b>.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">2</div>
                      <p className="text-[11px] text-amber-800">Tìm kiếm <b>"Mật khẩu ứng dụng"</b> (App Password) trong thanh tìm kiếm của tài khoản Google.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">3</div>
                      <p className="text-[11px] text-amber-800">Tạo một mật khẩu mới (ví dụ tên là "CDX App"), Google sẽ cấp cho bạn một mã <b>16 ký tự</b>.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">4</div>
                      <p className="text-[11px] text-amber-800">Nhập mã 16 ký tự đó vào ô <b>Mật khẩu ứng dụng</b> trong phần cấu hình SMTP bên trên.</p>
                    </div>
                  </div>

                  <div className="pt-2 pl-14">
                    <p className="text-[10px] text-amber-600 italic font-medium">
                      * Lưu ý: Không sử dụng mật khẩu đăng nhập Gmail thông thường vì Google sẽ chặn do lý do bảo mật.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layers size={14} className="text-primary" /> Chọn bảng dữ liệu ({selectedTables.length})
              </label>
              <div className="flex gap-3">
                <button onClick={selectAll} className="text-[10px] font-bold text-primary hover:text-primary-dark transition-colors">Chọn hết</button>
                <button onClick={deselectAll} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors">Bỏ hết</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 max-h-[320px] overflow-y-auto custom-scrollbar">
              {BACKUP_TABLES.map(table => (
                <label key={table.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${selectedTables.includes(table.id) ? 'bg-white border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedTables.includes(table.id) ? 'bg-primary border-primary' : 'bg-white border-gray-200 group-hover:border-primary/50'}`}>
                    {selectedTables.includes(table.id) && <Check size={12} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedTables.includes(table.id)}
                    onChange={() => toggleTable(table.id)}
                  />
                  <span className={`text-xs font-bold transition-colors ${selectedTables.includes(table.id) ? 'text-gray-800' : 'text-gray-500 group-hover:text-gray-700'}`}>{table.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-50">
          <button
            onClick={handleSave}
            className="flex-1 bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10"
          >
            <Save size={20} /> LƯU CẤU HÌNH
          </button>
          <button
            onClick={handleBackupNow}
            className="flex-1 bg-primary text-white font-black py-4 rounded-2xl hover:bg-primary-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
          >
            <Play size={20} /> BẮT ĐẦU SAO LƯU
          </button>
          <button
            onClick={onBack}
            className="px-10 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl hover:bg-gray-200 transition-all"
          >
            HỦY BỎ
          </button>
        </div>
      </div>
    </div>
  );
};
