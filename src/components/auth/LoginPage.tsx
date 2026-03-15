import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Lock, AlertCircle, RefreshCw, ArrowRight, Download, X, ArrowUpCircle, Menu as MenuIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { isUUID } from '../../utils/helpers';
import { LOGO_URL } from '../../constants/options';

export const LoginPage = ({ onLogin }: { onLogin: (user: Employee) => void }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      const { error } = await supabase.from('users').select('id', { count: 'exact', head: true }).limit(1);
      if (error) throw error;
      setConnectionStatus('ok');
    } catch (err) {
      console.error('Connection check failed:', err);
      setConnectionStatus('error');
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let query = supabase.from('users').select('*');

      if (isUUID(employeeId)) {
        query = query.or(`id.eq."${employeeId}",code.eq."${employeeId}"`);
      } else {
        query = query.eq('code', employeeId);
      }

      const { data, error: fetchError } = await query
        .eq('app_pass', password)
        .maybeSingle();

      if (fetchError) {
        console.error('Login error:', fetchError);
        setError(`Lỗi kết nối: ${fetchError.message}. Vui lòng kiểm tra lại Supabase URL/Key.`);
      } else if (!data) {
        setError('Mã nhân viên hoặc mật khẩu không đúng');
      } else {
        onLogin(data as Employee);
      }
    } catch (err: any) {
      console.error('Unexpected login error:', err);
      setError('Đã xảy ra lỗi hệ thống: ' + (err.message || 'Không rõ nguyên nhân'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-light flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-lg shadow-primary/20">
            <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="text-center">
            <h2 className="text-primary font-black text-xl tracking-widest uppercase">QUẢN LÝ KHO CDX</h2>
            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-1">Hệ thống quản lý nội bộ</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Mã nhân viên (ID)</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  placeholder="Nhập mã nhân viên..."
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  placeholder="Nhập mật khẩu..."
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-red-600 text-[11px] font-bold">{error}</p>
            </motion.div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-black py-4 rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <>
                  <span>ĐĂNG NHẬP NGAY</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              className="w-full flex items-center justify-center gap-2 text-gray-400 font-bold py-3 rounded-2xl hover:bg-gray-50 hover:text-primary transition-all text-[11px] tracking-widest uppercase border border-transparent hover:border-primary/10"
            >
              <Download size={16} />
              <span>HƯỚNG DẪN TẢI APP</span>
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-300 font-medium">Phiên bản 2.0.26 • Phát triển bởi CDX Tom</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {showInstructions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstructions(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                      <Download size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Cài đặt Ứng dụng</h3>
                      <p className="text-xs text-gray-400 font-medium">Hướng dẫn đưa ứng dụng ra màn hình chính</p>
                    </div>
                  </div>
                  <button onClick={() => setShowInstructions(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"><X size={24} /></button>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-primary/20">1</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-gray-800 text-sm">Mở trình duyệt trên điện thoại</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">Truy cập vào địa chỉ sau bằng Safari (iPhone) hoặc Chrome (Android):</p>
                      <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group">
                        <span className="text-xs font-mono text-primary font-bold">https://cdx-2026.vercel.app</span>
                        <button onClick={() => window.open('https://cdx-2026.vercel.app', '_blank')} className="p-1.5 bg-white rounded-lg shadow-sm text-gray-400 hover:text-primary transition-colors"><ArrowRight size={14} /></button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-primary/20">2</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-gray-800 text-sm">Thêm vào màn hình chính</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        <span className="font-bold text-gray-700">iOS (iPhone):</span> Nhấn nút <span className="inline-block p-1 bg-gray-100 rounded text-blue-500"><ArrowUpCircle size={12} /> Chia sẻ</span>, sau đó chọn <span className="font-bold text-gray-700">"Thêm vào MH chính"</span>.
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed mt-2">
                        <span className="font-bold text-gray-700">Android:</span> Nhấn nút <span className="inline-block p-1 bg-gray-100 rounded text-gray-600"><MenuIcon size={12} /> Menu</span> (3 chấm), sau đó chọn <span className="font-bold text-gray-700">"Cài đặt ứng dụng"</span>.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-primary/20">3</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-gray-800 text-sm">Hoàn tất</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">Biểu tượng ứng dụng sẽ xuất hiện trên màn hình điện thoại của bạn như một ứng dụng thông thường.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setShowInstructions(false)}
                    className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-black/10"
                  >
                    ĐÃ HIỂU, CẢM ƠN!
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
