/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, FormEvent, MouseEvent, ChangeEvent, useRef, useMemo, useCallback } from 'react';
import { utils, writeFile, write } from 'xlsx';
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  LogOut,
  Menu as MenuIcon,
  X,
  Warehouse,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  BarChart3,
  CalendarCheck,
  Wallet,
  Banknote,
  UserCircle,
  Settings2,
  List,
  Boxes,
  Layers,
  Handshake,
  Plus,
  RefreshCw,
  Minus,
  PlusCircle,
  Search,
  Edit,
  Home,
  User as UserIcon,
  ChevronDown,
  FileSpreadsheet,
  Info,
  MapPin,
  Navigation,
  Eye,
  Image as ImageIcon,
  FileText,
  Save,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Filter,
  Calculator,
  FilePieChart,
  Archive,
  History,
  Trash2,
  RotateCcw,
  Download,
  Printer,
  User,
  ClipboardCheck,
  Check,
  Bell,
  BellRing,
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Zap,
  CloudLightning,
  Thermometer,
  CheckCircle2,
  Clock,
  Trash as TrashIcon,
  Mail,
  Play,
  AlertCircle,
  Lock,
  Edit2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabaseClient';
import { Employee } from './types';

// --- Constants ---
const LOGO_URL = "/logo.png"; // Đường dẫn đến file logo trong thư mục public

// --- Global Helper Functions ---
const isUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
};

const formatNumber = (val: number | string) => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(/\./g, '').replace(',', '.'));
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const parseNumber = (val: string) => {
  if (!val) return 0;
  const cleanVal = val.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanVal) || 0;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const NumericInput = ({
  label,
  value,
  onChange,
  placeholder = "0",
  required = false,
  className = "",
  labelClassName = "text-[10px] font-bold text-gray-400 uppercase",
  inputClassName = "w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20",
  icon: Icon,
  showControls = false,
  step = 1,
  error = false,
  isDecimal = false
}: {
  label?: string,
  value: number,
  onChange: (val: number) => void,
  placeholder?: string,
  required?: boolean,
  className?: string,
  labelClassName?: string,
  inputClassName?: string,
  icon?: any,
  showControls?: boolean,
  step?: number,
  error?: boolean,
  isDecimal?: boolean
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === 0 && displayValue === '') return;
    const formatted = isDecimal ? value.toString() : formatNumber(value);
    if (formatted !== displayValue) {
      setDisplayValue(formatted);
    }
  }, [value, isDecimal]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    if (isDecimal) {
      // Allow digits and one dot
      const cleanValue = rawValue.replace(/[^0-9.]/g, '');
      const parts = cleanValue.split('.');
      const finalValue = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');

      setDisplayValue(finalValue);
      const numValue = parseFloat(finalValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      } else if (finalValue === '') {
        onChange(0);
      }
      return;
    }

    const cleanValue = rawValue.replace(/[^0-9]/g, '');
    if (cleanValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numValue = parseInt(cleanValue, 10);
    const formatted = formatNumber(numValue);

    // Cursor position fix
    const cursorPosition = e.target.selectionStart || 0;
    const oldLength = rawValue.length;

    setDisplayValue(formatted);
    onChange(numValue);

    // We need to wait for the next render to set the cursor position
    setTimeout(() => {
      if (inputRef.current) {
        const newLength = formatted.length;
        const newPosition = cursorPosition + (newLength - oldLength);
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  return (
    <div className={className}>
      {label && <label className={labelClassName}>{label} {required && '*'}</label>}
      <div className="relative flex items-center gap-2 mt-1">
        {showControls && (
          <button
            type="button"
            onClick={() => onChange(Math.max(0, value - step))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Minus size={14} />
          </button>
        )}
        <div className="relative flex-1">
          {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />}
          <input
            ref={inputRef}
            type="text"
            inputMode={isDecimal ? "decimal" : "numeric"}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            required={required}
            className={`${inputClassName} ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500 ring-2 ring-red-500/10' : ''} ${showControls ? 'text-center' : ''}`}
          />
        </div>
        {showControls && (
          <button
            type="button"
            onClick={() => onChange(value + step)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const CreatableSelect = ({
  label,
  value,
  options,
  onChange,
  onCreate,
  placeholder = "-- Chọn --",
  required = false,
  className = "",
  labelClassName = "text-[10px] font-bold text-gray-400 uppercase",
  selectClassName = "w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white",
}: {
  label?: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (id: string) => void;
  onCreate: (name: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    if (!isOpen) {
      if (selectedOption) {
        setSearchTerm(selectedOption.name);
      } else if (value && !isUUID(value)) {
        setSearchTerm(value);
      } else {
        setSearchTerm("");
      }
    }
  }, [value, selectedOption, isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedOption) {
          setSearchTerm(selectedOption.name);
        } else if (value && !isUUID(value)) {
          setSearchTerm(value);
        } else {
          setSearchTerm("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption, value]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className={labelClassName}>{label} {required && '*'}</label>}
      <div className="relative mt-1">
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
              if (e.target.value === "") onChange("");
            }}
            onFocus={() => setIsOpen(true)}
            className={`${selectClassName} pr-10`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm("");
                  onChange("");
                }}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={12} />
              </button>
            )}
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (filteredOptions.length > 0 || (searchTerm && !options.find(opt => opt.name.toLowerCase() === searchTerm.toLowerCase()))) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-[120] left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {filteredOptions.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.id);
                      setSearchTerm(opt.name);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-primary/5 transition-colors ${value === opt.id ? 'bg-primary/10 text-primary font-bold' : 'text-gray-700'}`}
                  >
                    {opt.name}
                  </div>
                ))}

                {searchTerm && !options.find(opt => opt.name.toLowerCase() === searchTerm.toLowerCase()) && (
                  <div
                    onClick={() => {
                      onCreate(searchTerm);
                      setIsOpen(false);
                    }}
                    className="px-4 py-3 border-t border-gray-50 bg-gray-50/50 cursor-pointer hover:bg-primary/5 transition-colors flex items-center gap-2 text-primary font-bold text-sm"
                  >
                    <Plus size={16} />
                    <span>Thêm mới: "{searchTerm}"</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {required && !value && <input tabIndex={-1} autoComplete="off" style={{ opacity: 0, height: 0, width: 0, position: 'absolute' }} required />}
    </div>
  );
};

const numberToWords = (number: number): string => {
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];

  if (number === 0) return "không đồng";

  const readGroup = (n: number) => {
    let s = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) {
      s += units[h] + " trăm ";
      if (t === 0 && u > 0) s += "lẻ ";
    }

    if (t > 0) {
      s += tens[t] + " ";
    }

    if (u > 0) {
      if (u === 1 && t > 1) s += "mốt";
      else if (u === 5 && t > 0) s += "lăm";
      else s += units[u];
    }

    return s.trim();
  };

  let res = "";
  const billion = Math.floor(number / 1000000000);
  const million = Math.floor((number % 1000000000) / 1000000);
  const thousand = Math.floor((number % 1000000) / 1000);
  const remainder = number % 1000;

  if (billion > 0) res += readGroup(billion) + " tỷ ";
  if (million > 0) res += readGroup(million) + " triệu ";
  if (thousand > 0) res += readGroup(thousand) + " ngàn ";
  if (remainder > 0) res += readGroup(remainder);

  return res.trim() + " đồng";
};

// --- Components ---

const LoginPage = ({ onLogin }: { onLogin: (user: Employee) => void }) => {
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
      // Build query: if it's a UUID, check both id and code. If not, only check code.
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
      {/* Background decoration */}
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

      {/* Instructions Modal */}
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

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative ${active
        ? 'bg-primary-light text-primary font-semibold'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
  >
    <Icon size={20} className={active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'} />
    <span className="text-sm flex-1 text-left">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md shadow-red-500/20 border border-white/50">
        {badge}
      </span>
    )}
  </button>
);

const MaterialGroups = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showMaterialDetailModal, setShowMaterialDetailModal] = useState(false);

  const [groups, setGroups] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'group' | 'material'>('group');

  const initialFormState = { id: '', name: '', notes: '' };
  const initialMaterialFormState = {
    id: '',
    name: '',
    group_id: '',
    warehouse_id: '',
    specification: '',
    unit: '',
    description: '',
    image_url: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [materialFormData, setMaterialFormData] = useState(initialMaterialFormState);

  useEffect(() => {
    fetchGroups();
    fetchWarehouses();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('material_groups')
      .select('*')
      .order('id', { ascending: true });
    if (data) setGroups(data);
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterialsByGroup = async (groupId: string) => {
    setMaterialsLoading(true);
    const { data, error } = await supabase
      .from('materials')
      .select('*, warehouses(name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });


    if (error) {
      console.error('Error fetching materials:', error);
      alert('Lỗi tải vật tư: ' + error.message);
    }
    if (data) setMaterials(data);
    setMaterialsLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        const { error } = await supabase.from('material_groups').update({
          name: formData.name,
          notes: formData.notes
        }).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('material_groups').insert([{
          name: formData.name,
          notes: formData.notes
        }]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchGroups();
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaterialSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dataToSubmit = { ...materialFormData, group_id: selectedGroup.id };
      if (isEditingMaterial) {
        const { error } = await supabase.from('materials').update(dataToSubmit).eq('id', materialFormData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materials').insert([dataToSubmit]);
        if (error) throw error;
      }
      setShowMaterialModal(false);
      fetchMaterialsByGroup(selectedGroup.id);
      setMaterialFormData(initialMaterialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (group: any) => {
    setSelectedGroup(group);
    fetchMaterialsByGroup(group.id);
    setShowDetailModal(true);
  };

  const handleEdit = (e: MouseEvent, item: any) => {
    e.stopPropagation();
    setFormData({
      id: item.id,
      name: item.name,
      notes: item.notes || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleEditMaterial = (item: any) => {
    setMaterialFormData(item);
    setIsEditingMaterial(true);
    setShowMaterialModal(true);
  };

  const handleDeleteClick = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete(id);
    setDeleteType('group');
    setShowDeleteModal(true);
  };

  const handleDeleteMaterialClick = (id: string) => {
    setItemToDelete(id);
    setDeleteType('material');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (deleteType === 'group') {
        const { error } = await supabase.from('material_groups').delete().eq('id', itemToDelete);
        if (error) throw error;
        fetchGroups();
      } else {
        const { error } = await supabase.from('materials').delete().eq('id', itemToDelete);
        if (error) throw error;
        fetchMaterialsByGroup(selectedGroup.id);
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
    setShowDeleteModal(false);
  };

  const handleMaterialImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMaterialFormData({ ...materialFormData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const uniqueMaterialIds = Array.from(new Set(materials.map(m => m.id)));

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Nhóm vật tư" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-primary" /> Nhóm vật tư
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý phân loại danh mục vật tư hệ thống</p>
        </div>
        <button
          onClick={() => { setFormData(initialFormState); setIsEditing(false); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
          <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
          <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự</label>
          <select className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Tất cả --</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
          <select className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Tất cả kho --</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Gõ để tìm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 w-32">Mã nhóm</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Nhóm vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredGroups.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Chưa có nhóm vật tư nào</td></tr>
              ) : (
                filteredGroups.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{item.code || item.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic">{item.notes || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleEdit(e, item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                        <button onClick={(e) => handleDeleteClick(e, item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa {deleteType === 'group' ? 'nhóm vật tư' : 'vật tư'} <strong>{itemToDelete}</strong>? Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">Hủy bỏ</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">Xóa ngay</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col my-8"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Layers size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật nhóm' : 'Thêm nhóm vật tư'}</h3>
                    <p className="text-xs text-white/70">Mã nhóm sẽ được hệ thống tự động sinh</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tên nhóm vật tư *</label>
                    <input
                      required
                      type="text"
                      placeholder="Ví dụ: Tôn, sắt, thép..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                    <textarea
                      rows={3}
                      placeholder="Thông tin thêm về nhóm này..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <div className="mt-8 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
                <div className="text-center flex-1">
                  <h3 className="text-xl font-bold text-primary uppercase tracking-widest">Chi tiết nhóm vật tư</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã nhóm vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedGroup.code || selectedGroup.id.slice(0, 8)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedGroup.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 text-primary rounded-lg"><Package size={16} /></div>
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Danh mục vật tư trong nhóm</h4>
                      <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">{materials.length}</span>
                    </div>
                    <button
                      onClick={() => { setMaterialFormData(initialMaterialFormState); setIsEditingMaterial(false); setShowMaterialModal(true); }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={14} /> Thêm dòng
                    </button>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-primary text-white">
                          <th className="px-4 py-2 text-[10px] font-bold uppercase border-r border-white/10">Mã vật tư</th>
                          <th className="px-4 py-2 text-[10px] font-bold uppercase border-r border-white/10">Tên vật tư</th>
                          <th className="px-4 py-2 text-[10px] font-bold uppercase border-r border-white/10">Kho</th>
                          <th className="px-4 py-2 text-[10px] font-bold uppercase border-r border-white/10">Quy cách</th>
                          <th className="px-4 py-2 text-[10px] font-bold uppercase text-center w-24">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {materialsLoading ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Đang tải vật tư...</td></tr>
                        ) : materials.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Nhóm này chưa có vật tư nào</td></tr>
                        ) : (
                          materials.map((mat) => (
                            <tr key={mat.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-4 py-2 text-xs font-medium text-gray-700">{mat.code || mat.id.slice(0, 8)}</td>
                              <td className="px-4 py-2 text-xs text-gray-600">{mat.name}</td>
                              <td className="px-4 py-2 text-xs text-gray-500">{mat.warehouses?.name || '-'}</td>
                              <td className="px-4 py-2 text-xs text-gray-500">{mat.specification || '-'}</td>
                              <td className="px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => { setSelectedMaterial(mat); setShowMaterialDetailModal(true); }} className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"><Eye size={14} /></button>
                                  <button onClick={() => handleEditMaterial(mat)} className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"><Edit size={14} /></button>
                                  <button onClick={() => handleDeleteMaterialClick(mat.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={(e) => handleDeleteClick(e, selectedGroup.id)}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Trash2 size={16} /> Xóa
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={(e) => handleEdit(e, selectedGroup)}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors shadow-lg shadow-yellow-500/20"
                  >
                    <Edit size={16} /> Sửa
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded-xl text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg shadow-gray-500/20"
                  >
                    <X size={16} /> Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMaterialModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8"
            >
              <div className="bg-blue-600 p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Package size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditingMaterial ? 'Cập nhật vật tư' : 'Thêm vật tư mới'}</h3>
                    <p className="text-xs text-white/70">Thuộc nhóm: {selectedGroup?.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowMaterialModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleMaterialSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư (ID) *</label>
                    <div className="relative">
                      <input
                        list="material-ids-group"
                        required
                        type="text"
                        value={materialFormData.id}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMaterialFormData({ ...materialFormData, id: val });
                          const existing = materials.find(m => m.id === val);
                          if (existing) {
                            setMaterialFormData(existing);
                          }
                        }}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <datalist id="material-ids-group">
                        {uniqueMaterialIds.map(id => <option key={id} value={id} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư *</label>
                    <input
                      required
                      type="text"
                      value={materialFormData.name}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Kho lưu trữ</label>
                    <select
                      value={materialFormData.warehouse_id}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, warehouse_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Chọn kho --</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách</label>
                    <input
                      type="text"
                      value={materialFormData.specification}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, specification: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                    <input
                      type="text"
                      value={materialFormData.unit}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, unit: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả</label>
                    <textarea
                      rows={2}
                      value={materialFormData.description}
                      onChange={(e) => setMaterialFormData({ ...materialFormData, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Hình ảnh vật tư</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group relative">
                        {materialFormData.image_url ? (
                          <>
                            <img src={materialFormData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setMaterialFormData({ ...materialFormData, image_url: '' })}
                              className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <ImageIcon className="text-gray-300" size={20} />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          id="group-material-image"
                          accept="image/*"
                          onChange={handleMaterialImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="group-material-image"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-gray-200 cursor-pointer transition-colors"
                        >
                          <ImageIcon size={12} /> Tải ảnh
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 mt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowMaterialModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu vật tư'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Material Detail Modal (The Eye) */}
      <AnimatePresence>
        {showMaterialDetailModal && selectedMaterial && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
                <div className="text-center flex-1">
                  <h3 className="text-xl font-bold text-primary uppercase tracking-widest">Chi tiết danh mục vật tư</h3>
                </div>
                <button onClick={() => setShowMaterialDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.code || selectedMaterial.id.slice(0, 8)}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Kho lưu trữ</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.warehouses?.name || '-'}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.specification || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm vật tư</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedGroup?.code || selectedGroup?.id.slice(0, 8)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                    <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.unit || '-'}</p>
                  </div>
                </div>

                {selectedMaterial.image_url && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Hình ảnh</label>
                    <div className="w-full h-48 rounded-2xl overflow-hidden border border-gray-100">
                      <img src={selectedMaterial.image_url} alt={selectedMaterial.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => { setShowMaterialDetailModal(false); handleDeleteMaterialClick(selectedMaterial.id); }}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Trash2 size={16} /> Xóa
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowMaterialDetailModal(false); handleEditMaterial(selectedMaterial); }}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors shadow-lg shadow-yellow-500/20"
                  >
                    <Edit size={16} /> Sửa
                  </button>
                  <button
                    onClick={() => setShowMaterialDetailModal(false)}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded-xl text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg shadow-gray-500/20"
                  >
                    <X size={16} /> Đóng
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

const Materials = ({ user, onBack, onNavigate }: { user: Employee, onBack?: () => void, onNavigate?: (page: string) => void }) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const initialFormState = {
    id: '',
    code: '',
    name: '',
    group_id: '',
    specification: '',
    unit: '',
    description: '',
    image_url: '',
    status: 'Đang sử dụng'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchMaterials();
    fetchGroups();
    fetchWarehouses();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      console.log('Fetching materials...');
      const { data, error } = await supabase
        .from('materials')
        .select('*, material_groups(name)')
        .neq('status', 'Đã xóa')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching materials:', error);
        // If error is related to missing columns, try a simpler select
        if (error.message.includes('column')) {
          const { data: simpleData, error: simpleError } = await supabase.from('materials').select('id, name').neq('status', 'Đã xóa').order('name');
          if (simpleError) {
             const { data: ultraSimpleData, error: ultraSimpleError } = await supabase.from('materials').select('id, name').order('name');
             if (ultraSimpleError) throw ultraSimpleError;
             setMaterials(ultraSimpleData || []);
          } else {
             setMaterials(simpleData || []);
          }
        } else {
          throw error;
        }
      } else {
        console.log('Materials data received:', data);
        setMaterials(data || []);
      }
    } catch (err: any) {
      console.error('Final error fetching materials:', err);
      alert('Lỗi tải danh mục vật tư: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    const { data } = await supabase.from('material_groups').select('*').order('name');
    if (data) setGroups(data);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setWarehouses(data);
  };

  const generateNextMaterialCode = async () => {
    const random = Math.floor(100 + Math.random() * 900);
    try {
      const { data } = await supabase
        .from('materials')
        .select('code')
        .like('code', 'VAT%')
        .order('code', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].code) {
        const lastCode = data[0].code;
        const match = lastCode.match(/VAT(\d+)/);
        if (match && match[1]) {
          const nextNumber = parseInt(match[1]) + 1;
          return `VAT${nextNumber.toString().padStart(3, '0')}-${random}`;
        }
      }
      return `VAT001-${random}`;
    } catch (err) {
      console.error('Error generating material code:', err);
      return `VAT001-${random}`;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log('--- Material handleSubmit triggered ---');
    console.log('Submitting form data:', formData);
    setSubmitting(true);
    try {
      // Resolve group_id if it's a name
      let finalGroupId = formData.group_id;
      if (formData.group_id && !isUUID(formData.group_id)) {
        const groupByName = groups.find(g => g.name.toLowerCase() === formData.group_id.toLowerCase());
        if (groupByName) {
          finalGroupId = groupByName.id;
        } else {
          // Create new group
          const { data: newGroup, error: groupErr } = await supabase.from('material_groups').insert([{ name: formData.group_id }]).select();
          if (groupErr) throw groupErr;
          if (newGroup) {
            finalGroupId = newGroup[0].id;
            fetchGroups();
          }
        }
      }

      const dbPayload = {
        code: formData.code,
        name: formData.name,
        group_id: finalGroupId || null, // Convert empty string to null safely
        warehouse_id: formData.warehouse_id || null, // Convert empty string to null safely
        specification: formData.specification,
        unit: formData.unit,
        description: formData.description,
        image_url: formData.image_url,
        status: formData.status || 'Đang sử dụng'
      };

      if (isEditing && formData.id) {
        const { error } = await supabase.from('materials').update(dbPayload).eq('id', formData.id);
        if (error) throw error;
      } else {
        dbPayload.code = dbPayload.code || await generateNextMaterialCode();
        const { error } = await supabase.from('materials').insert([dbPayload]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchMaterials();
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setFormData(item);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('materials').update({ status: 'Đã xóa' }).eq('id', itemToDelete);
      if (error) throw error;
      fetchMaterials();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
    setShowDeleteModal(false);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredMaterials = materials.filter(m => {
    if (m.status === 'Đã xóa') return false;
    const name = m.name || '';
    const code = m.code || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = groupFilter === '' || m.group_id === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const uniqueMaterialIds = Array.from(new Set(materials.map(m => m.id)));

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Danh mục Vật tư" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-primary" /> Danh mục Vật tư ({filteredMaterials.length})
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý toàn bộ danh sách vật tư, thiết bị trong hệ thống</p>
        </div>
        <button
          onClick={async () => {
            const nextCode = await generateNextMaterialCode();
            setFormData({ ...initialFormState, code: nextCode });
            setIsEditing(false);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm vật tư</label>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">-- Tất cả nhóm --</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã vật tư..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchMaterials}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
          >
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 w-32">Mã vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Tên vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Nhóm</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Quy cách</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">ĐVT</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredMaterials.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Không tìm thấy vật tư nào</td></tr>
              ) : (
                filteredMaterials.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => { setSelectedMaterial(item); setShowDetailModal(true); }}
                  >
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{item.code || item.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                      <div className="flex items-center gap-2">
                        {item.image_url && (
                          <div className="w-6 h-6 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        {item.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.material_groups?.name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.specification || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.unit || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa vật tư <strong>{materials.find(m => m.id === itemToDelete)?.code || itemToDelete.slice(0, 8)}</strong>? Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">Hủy bỏ</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">Xóa ngay</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Package size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật vật tư' : 'Thêm vật tư mới'}</h3>
                    <p className="text-xs text-white/70">Nhập thông tin chi tiết vật tư vào hệ thống</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư</label>
                        <input
                          required
                          type="text"
                          disabled={isEditing}
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư *</label>
                        <input
                          required
                          type="text"
                          placeholder="Ví dụ: Tôn kẽm 0.4mm"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <CreatableSelect
                        label="Nhóm vật tư *"
                        value={formData.group_id}
                        options={groups}
                        onChange={(val) => setFormData({ ...formData, group_id: val })}
                        onCreate={(val) => setFormData({ ...formData, group_id: val })}
                        placeholder="Chọn nhóm..."
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <CreatableSelect
                        label="Đơn vị tính"
                        value={formData.unit}
                        options={Array.from(new Set(materials.map(m => m.unit))).filter(Boolean).map((u: any) => ({ id: String(u), name: String(u) }))}
                        onChange={(val) => setFormData({ ...formData, unit: val })}
                        onCreate={(val) => setFormData({ ...formData, unit: val })}
                        placeholder="Chọn hoặc nhập mới..."
                      />

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách / Kích thước</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 1200mm x 2400mm"
                          value={formData.specification}
                          onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả chi tiết</label>
                        <textarea
                          rows={3}
                          placeholder="Thông tin thêm về vật tư..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Hình ảnh vật tư</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group relative">
                          {formData.image_url ? (
                            <>
                              <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, image_url: '' })}
                                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <ImageIcon className="text-gray-300" size={24} />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="file"
                            id="material-image"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="material-image"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 cursor-pointer transition-colors"
                          >
                            <ImageIcon size={14} /> Tải ảnh từ máy
                          </label>
                          <p className="text-[10px] text-gray-400 italic">Dung lượng tối đa 2MB. Hỗ trợ JPG, PNG.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedMaterial && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
                <div className="text-center flex-1">
                  <h3 className="text-xl font-bold text-primary uppercase tracking-widest">Chi tiết vật tư</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto flex-1">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-48 h-48 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                    {selectedMaterial.image_url ? (
                      <img src={selectedMaterial.image_url} alt={selectedMaterial.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                        <ImageIcon size={48} />
                        <span className="text-[10px] font-bold uppercase">Không có ảnh</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.code || selectedMaterial.id.slice(0, 8)}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.name}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm vật tư</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.material_groups?.name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Kho lưu trữ</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.warehouses?.name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.unit || '-'}</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách / Kích thước</label>
                      <p className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{selectedMaterial.specification || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả chi tiết</label>
                  <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 italic">
                    {selectedMaterial.description || 'Chưa có mô tả cho vật tư này.'}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => { setShowDetailModal(false); handleDeleteClick(selectedMaterial.id); }}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Trash2 size={16} /> Xóa
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDetailModal(false); handleEdit(selectedMaterial); }}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors shadow-lg shadow-yellow-500/20"
                  >
                    <Edit size={16} /> Sửa
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded-xl text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg shadow-gray-500/20"
                  >
                    <X size={16} /> Đóng
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

const Placeholder = ({ title, onBack }: { title: string, onBack?: () => void }) => (
  <div className="p-4 md:p-6 space-y-6 pb-44">
    <PageBreadcrumb title={title} onBack={onBack} />
    <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-4 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="p-4 bg-gray-50 rounded-full">
        <Settings size={48} className="animate-spin-slow" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-700">{title}</h3>
        <p className="text-sm">Tính năng này đang được phát triển...</p>
      </div>
    </div>
  </div>
);

const PageBreadcrumb = ({ title, onBack }: { title: string, onBack?: () => void }) => {
  if (!onBack) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 mb-6"
    >
      <button
        onClick={onBack}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all group shadow-sm active:scale-95"
        title="Quay lại"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
      </button>
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
          <span>Hệ thống</span>
          <ChevronRight size={10} />
        </div>
        <h2 className="text-lg font-bold text-gray-800 leading-none">{title}</h2>
      </div>
    </motion.div>
  );
};

const Trash = ({ onNavigate, onBack }: { onNavigate: (page: string) => void, onBack: () => void }) => {
  const trashItems = [
    { id: 'deleted-materials', label: 'Danh sách vật tư xóa', icon: Package, color: 'bg-red-50 text-red-600' },
    { id: 'deleted-warehouses', label: 'Danh sách kho xóa', icon: Warehouse, color: 'bg-orange-50 text-orange-600' },
    { id: 'deleted-slips', label: 'Phiếu nhập xuất đã xóa', icon: Archive, color: 'bg-blue-50 text-blue-600' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Thùng rác" onBack={onBack} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {trashItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ y: -4 }}
            onClick={() => onNavigate(item.id)}
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4 cursor-pointer group"
          >
            <div className={`p-6 rounded-2xl ${item.color} group-hover:scale-110 transition-transform`}>
              <item.icon size={40} />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-800">{item.label}</h3>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Xem dữ liệu đã xóa</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Warehouses = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const initialFormState = {
    id: '',
    code: '',
    name: '',
    address: '',
    manager_id: '',
    coordinates: '',
    notes: '',
    capacity: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchWarehouses();
    fetchEmployees();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*, users(full_name)')
        .or('status.is.null,status.neq.Đã xóa')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching warehouses with join:', error);
        // Fallback to simple fetch if join fails
        const { data: simpleData, error: simpleError } = await supabase
          .from('warehouses')
          .select('*')
          .or('status.is.null,status.neq.Đã xóa')
          .order('created_at', { ascending: false });

        if (simpleError) throw simpleError;
        setWarehouses(simpleData || []);
      } else {
        setWarehouses(data || []);
      }
    } catch (err: any) {
      console.error('Final fetch error:', err);
      alert('Lỗi tải dữ liệu kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    let query = supabase.from('users').select('*');
    if (user.role !== 'Admin App') {
      query = query.neq('role', 'Admin App');
    }
    const { data } = await query;
    if (data) setEmployees(data);
  };

  const generateNextWarehouseCode = async () => {
    try {
      const { data } = await supabase
        .from('warehouses')
        .select('code')
        .like('code', 'WH%')
        .order('code', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].code) {
        const lastCode = data[0].code;
        const lastNumber = parseInt(lastCode.replace('WH', ''));
        if (!isNaN(lastNumber)) {
          const nextNumber = lastNumber + 1;
          return `WH${nextNumber.toString().padStart(3, '0')}`;
        }
      }
      return 'WH001';
    } catch (err) {
      console.error('Error generating warehouse code:', err);
      return 'WH001';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { id, ...dbPayload } = formData;
      if (isEditing && id) {
        const { error } = await supabase.from('warehouses').update(dbPayload).eq('id', id);
        if (error) throw error;
      } else {
        const nextCode = formData.code || await generateNextWarehouseCode();
        const { error } = await supabase.from('warehouses').insert([{ ...dbPayload, code: nextCode }]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchWarehouses();
      setFormData(initialFormState);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      id: item.id,
      code: item.code || '',
      name: item.name,
      address: item.address || '',
      manager_id: item.manager_id || '',
      coordinates: item.coordinates || '',
      notes: item.notes || '',
      capacity: item.capacity || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from('warehouses').update({ status: 'Đã xóa' }).eq('id', itemToDelete);
    if (error) alert('Lỗi: ' + error.message);
    else fetchWarehouses();
    setShowDeleteModal(false);
  };

  const openInGoogleMaps = (coords: string) => {
    if (!coords) return;
    if (coords.startsWith('http')) {
      window.open(coords, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`, '_blank');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Danh sách Kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Warehouse className="text-primary" /> Danh sách Kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý hệ thống bãi đúc và kho bãi công trình</p>
        </div>
        <button
          onClick={async () => {
            const nextCode = await generateNextWarehouseCode();
            setFormData({ ...initialFormState, code: nextCode });
            setIsEditing(false);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
          <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
          <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự</label>
          <select className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Tất cả --</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
          <select className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Tất cả kho --</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Gõ để tìm..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Mã kho (ID)</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Tên kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Địa chỉ</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Nhân viên phụ trách</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Tọa độ</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Sức chứa</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : warehouses.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 italic">Chưa có dữ liệu kho bãi</td></tr>
              ) : (
                warehouses.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{item.code || item.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.address}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.users?.full_name || item.manager_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[100px]">{item.coordinates}</span>
                        {item.coordinates && (
                          <button
                            onClick={() => openInGoogleMaps(item.coordinates)}
                            className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Chỉ đường Google Maps"
                          >
                            <Navigation size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.notes}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.capacity}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                        <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa kho <strong>{warehouses.find(w => w.id === itemToDelete)?.code || itemToDelete.slice(0, 8)}</strong>? Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">Hủy bỏ</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">Xóa ngay</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Warehouse size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật thông tin kho' : 'Thêm mới kho bãi'}</h3>
                    <p className="text-xs text-white/70">Vui lòng điền đầy đủ thông tin chi tiết</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã kho</label>
                        <input
                          required
                          type="text"
                          disabled={isEditing}
                          placeholder="Ví dụ: WH001"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tên kho *</label>
                        <input
                          required
                          type="text"
                          placeholder="Nhập tên kho..."
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Địa chỉ</label>
                        <input
                          type="text"
                          placeholder="Địa chỉ cụ thể..."
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân viên phụ trách</label>
                        <select
                          value={formData.manager_id}
                          onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">-- Chọn nhân sự --</option>
                          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.code || emp.id.slice(0, 8)})</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tọa độ / Link Google Maps</label>
                        <div className="relative">
                          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="10.43, 106.59 hoặc dán link..."
                            value={formData.coordinates}
                            onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                        <textarea
                          rows={3}
                          placeholder="Thông tin thêm..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Sức chứa</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 1000 tấn"
                          value={formData.capacity}
                          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
const CustomCombobox = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  onCreateNew
}: {
  label: string,
  value: string,
  onChange: (val: string) => void,
  options: any[],
  placeholder: string,
  required?: boolean,
  onCreateNew?: (name: string) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return options.filter(opt =>
      (opt.name || '').toLowerCase().includes(search) ||
      (opt.code || '').toLowerCase().includes(search)
    );
  }, [searchTerm, options]);

  // Display value logic
  const displayValue = useMemo(() => {
    const selected = options.find(opt => opt.id === value || opt.name === value);
    if (selected) {
      return selected.code ? `[${selected.code}] ${selected.name}` : selected.name;
    }
    return searchTerm || value;
  }, [value, options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`space-y-1 relative ${isOpen ? 'z-[200]' : 'z-10'}`} ref={containerRef}>
      {label && <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>}
      <div className="relative">
        <input
          type="text"
          required={required}
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm('');
          }}
          placeholder={placeholder}
          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 pr-10 bg-white transition-all"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto py-1 z-[210] custom-scrollbar"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => (
                <button
                  key={opt.id || idx}
                  type="button"
                  onClick={() => {
                    onChange(opt.id || opt.name);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 hover:text-primary transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    {opt.code && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">#{opt.code}</span>}
                    <span>{opt.name}</span>
                  </div>
                  <Plus size={12} className="text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-gray-400 italic mb-2">Không tìm thấy kết quả</p>
              </div>
            )}

            {onCreateNew && searchTerm && !options.find(o => o.name.toLowerCase() === searchTerm.toLowerCase()) && (
              <button
                type="button"
                onClick={() => {
                  onCreateNew(searchTerm);
                  setSearchTerm('');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm bg-primary/5 text-primary font-bold hover:bg-primary/10 transition-colors flex items-center gap-2 border-t border-primary/10"
              >
                <Plus size={16} />
                Thêm mới "{searchTerm}"
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Costs = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<any>(null);
  const [costs, setCosts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [costTypes, setCostTypes] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'Chi',
    cost_type: '',
    content: '',
    warehouse_name: '',
    quantity: 0,
    unit: '',
    total_amount: 0,
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchCosts();
    fetchMaterials();
    fetchWarehouses();
    fetchCostTypes();
    fetchUnits();
  }, []);

  const fetchCosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('costs')
        .select('*, users(full_name), warehouses(name), materials(name)')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching costs:', error);
        const { data: fallbackData, error: fallbackError } = await supabase.from('costs').select('*').order('date', { ascending: false });
        if (fallbackError) throw fallbackError;
        setCosts(fallbackData || []);
      } else {
        setCosts(data || []);
      }
    } catch (err: any) {
      alert('Lỗi tải danh sách chi phí: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('id, name');
    if (data) setMaterials(data);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name');
    if (data) setWarehouses(data);
  };

  const fetchCostTypes = async () => {
    // Lấy các loại chi phí duy nhất từ bảng costs
    const { data } = await supabase.from('costs').select('cost_type');
    if (data) {
      const uniqueTypes = Array.from(new Set(data.map(item => item.cost_type)))
        .filter(Boolean)
        .map((name, index) => ({ id: index, name }));
      setCostTypes(uniqueTypes);
    }
  };

  const fetchUnits = async () => {
    // Lấy các đơn vị tính duy nhất từ bảng costs
    const { data } = await supabase.from('costs').select('unit');
    if (data) {
      const uniqueUnits = Array.from(new Set(data.map(item => item.unit)))
        .filter(Boolean)
        .map((name, index) => ({ id: index, name }));
      setUnits(uniqueUnits);
    }
  };

  const ensureValueExists = async (table: string, name: string, currentList: any[], fetchFn: () => void) => {
    if (!name) return null;
    if (isUUID(name)) return name;

    // Nếu là bảng costs thì không cần lưu vào bảng danh mục riêng
    if (table === 'costs') return null;

    const existing = currentList.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    // Auto-save new value for warehouses and materials with codes
    let code = '';
    const random = Math.floor(100 + Math.random() * 900);
    if (table === 'warehouses') {
      code = `K${(currentList.length + 1).toString().padStart(2, '0')}-${random}`;
    } else if (table === 'materials') {
      code = `VT${(currentList.length + 1).toString().padStart(3, '0')}-${random}`;
    }

    const { data, error } = await supabase.from(table).insert([{ name, code }]).select();
    if (!error && data && data[0]) {
      fetchFn();
      return data[0].id;
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Resolve warehouse_id
      const warehouse_id = await ensureValueExists('warehouses', formData.warehouse_name, warehouses, fetchWarehouses);

      // Resolve content/material
      const material_id = await ensureValueExists('materials', formData.content, materials, fetchMaterials);

      const dateObj = new Date(formData.date);
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = String(dateObj.getFullYear()).slice(-2);
      const random = Math.floor(1000 + Math.random() * 9000);
      const userPrefix = user.code || user.id.slice(0, 4);
      const finalCode = `CP-${userPrefix.toUpperCase()}-${d}${m}${y}-${random}`;

      const payload: any = {
        date: formData.date,
        transaction_type: formData.transaction_type,
        cost_code: finalCode,
        employee_id: user.id,
        cost_type: formData.cost_type,
        content: formData.content,
        warehouse_id: warehouse_id,
        material_id: material_id,
        quantity: formData.quantity,
        unit: formData.unit,
        total_amount: formData.total_amount,
        notes: formData.notes
      };

      let error;
      if (isEditing && editingId) {
        const { error: err } = await supabase.from('costs').update(payload).eq('id', editingId);
        error = err;
      } else {
        const { error: err } = await supabase.from('costs').insert([payload]);
        error = err;
      }

      if (error) throw error;

      setShowModal(false);
      setFormData(initialFormState);
      setIsEditing(false);
      setEditingId(null);
      fetchCosts();
      fetchCostTypes();
      fetchUnits();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      date: item.date,
      transaction_type: item.transaction_type || 'Chi',
      cost_type: item.cost_type,
      content: item.content || '',
      warehouse_name: item.warehouses?.name || '',
      quantity: item.quantity,
      unit: item.unit || '',
      total_amount: item.total_amount,
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setIsEditing(true);
    setShowModal(true);
    setShowDetailModal(false);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('costs').delete().eq('id', itemToDelete);
      if (error) throw error;
      fetchCosts();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      alert('Lỗi khi xóa chi phí: ' + err.message);
    }
  };

  const exportToExcel = () => {
    const data = costs.map(item => ({
      'Mã chứng từ': item.cost_code,
      'Ngày': item.date,
      'Loại giao dịch': item.transaction_type || 'Chi',
      'Người lập': item.users?.full_name || item.employee_id,
      'Hạng mục': item.cost_type,
      'Nội dung': item.content,
      'Vật tư': item.materials?.name || '',
      'Kho': item.warehouses?.name || '',
      'Số lượng': item.quantity,
      'ĐVT': item.unit,
      'Đơn giá': item.unit_price,
      'Thành tiền': item.total_amount,
      'Ghi chú': item.notes
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Chi phí");
    writeFile(wb, `QuanLyChiPhi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Quản lý Chi phí" onBack={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="text-primary" /> Tiền vào - Tiền ra
          </h2>
          <p className="text-xs text-gray-500 mt-1">Theo dõi các khoản thu chi và lợi nhuận</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <FileSpreadsheet size={18} className="text-green-600" /> Xuất Excel
          </motion.button>
          <button
            onClick={() => { setIsEditing(false); setFormData(initialFormState); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
          >
            <Plus size={18} /> Nhập giao dịch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Tổng Thu</p>
            <p className="text-xl font-black text-green-600">
              {formatCurrency(costs.filter(c => c.transaction_type === 'Thu').reduce((sum, c) => sum + Number(c.total_amount || 0), 0))}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0">
            <ArrowUpCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Tổng Chi</p>
            <p className="text-xl font-black text-red-600">
              {formatCurrency(costs.filter(c => c.transaction_type !== 'Thu').reduce((sum, c) => sum + Number(c.total_amount || 0), 0))}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Lợi Nhuận Gộp</p>
            <p className="text-xl font-black text-blue-600">
              {formatCurrency(
                costs.filter(c => c.transaction_type === 'Thu').reduce((sum, c) => sum + Number(c.total_amount || 0), 0) -
                costs.filter(c => c.transaction_type !== 'Thu').reduce((sum, c) => sum + Number(c.total_amount || 0), 0)
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Placeholder */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
          <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
          <input type="date" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự</label>
          <select className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Tất cả --</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
          <select className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Tất cả kho --</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Gõ để tìm..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ngày</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Loại GD</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Tên kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Hạng mục</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Nội dung</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-center">SL</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-center">ĐVT</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 text-right">Số tiền</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Người lập</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : costs.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 italic">Chưa có dữ liệu chi phí</td></tr>
              ) : (
                costs.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => { setSelectedCost(item); setShowDetailModal(true); }}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded-full ${item.transaction_type === 'Thu' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {item.transaction_type || 'Chi'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-medium">{item.warehouses?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.cost_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.content}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{item.unit}</td>
                    <td className={`px-4 py-3 text-xs font-bold text-right ${item.transaction_type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.transaction_type === 'Thu' ? '+' : '-'}{formatCurrency(item.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 italic truncate max-w-[150px]">{item.notes}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.users?.full_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedCost && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Wallet size={24} /></div>
                  <h3 className="font-bold text-lg">Chi tiết chi phí</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ngày chi</p>
                    <p className="font-medium">{new Date(selectedCost.date).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Người chi</p>
                    <p className="font-medium">{selectedCost.users?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Kho</p>
                    <p className="font-medium">{selectedCost.warehouses?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Loại chi phí</p>
                    <p className="font-medium">{selectedCost.cost_type}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Nội dung</p>
                    <p className="font-medium">{selectedCost.content}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Số lượng</p>
                    <p className="font-medium">{selectedCost.quantity} {selectedCost.unit}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Số tiền</p>
                    <p className="font-bold text-primary text-lg">{selectedCost.total_amount.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</p>
                    <p className="text-gray-600 italic">{selectedCost.notes || 'Không có ghi chú'}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(selectedCost)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Edit size={18} /> Sửa
                  </button>
                  <button
                    onClick={() => { setShowDetailModal(false); handleDeleteClick(selectedCost.id); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} /> Xóa
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-gray-500 mb-6">Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa bản ghi này?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Wallet size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật chi phí' : 'Nhập chi phí'}</h3>
                    <p className="text-xs text-white/70">Vui lòng điền đầy đủ thông tin chi phí</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit}>
                  <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex items-start gap-3 border border-blue-100">
                    <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Sử dụng form này để nhập tay các khoản <strong>Thu</strong> (doanh thu, thanh lý) hoặc khoản <strong>Chi</strong> (mua sắm ngoài hệ thống kho).
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Loại giao dịch *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer bg-green-50 px-4 py-2 rounded-xl text-sm font-bold text-green-700 border border-green-200">
                        <input type="radio" name="transType" checked={formData.transaction_type === 'Thu'} onChange={() => setFormData({ ...formData, transaction_type: 'Thu' })} className="accent-green-600 w-4 h-4 cursor-pointer" />
                        Khoản Thu (Tiền vào)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-red-50 px-4 py-2 rounded-xl text-sm font-bold text-red-700 border border-red-200">
                        <input type="radio" name="transType" checked={formData.transaction_type === 'Chi'} onChange={() => setFormData({ ...formData, transaction_type: 'Chi' })} className="accent-red-600 w-4 h-4 cursor-pointer" />
                        Khoản Chi (Tiền ra)
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày chi *</label>
                          <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Người lập</label>
                          <input
                            type="text"
                            readOnly
                            value={user.full_name}
                            className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 outline-none"
                          />
                        </div>
                      </div>

                      <CreatableSelect
                        label="Loại chi phí *"
                        value={formData.cost_type}
                        options={costTypes}
                        onChange={(val) => setFormData({ ...formData, cost_type: val })}
                        onCreate={(val) => setFormData({ ...formData, cost_type: val })}
                        placeholder="Chọn loại chi phí..."
                        required
                      />

                      <CreatableSelect
                        label="Tên kho *"
                        value={formData.warehouse_name}
                        options={warehouses}
                        onChange={(val) => setFormData({ ...formData, warehouse_name: val })}
                        onCreate={(val) => setFormData({ ...formData, warehouse_name: val })}
                        placeholder="Chọn kho..."
                        required
                      />

                      <CreatableSelect
                        label="Nội dung chi *"
                        value={formData.content}
                        options={materials}
                        onChange={(val) => setFormData({ ...formData, content: val })}
                        onCreate={(val) => setFormData({ ...formData, content: val })}
                        placeholder="Chọn nội dung..."
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <NumericInput
                          label="Số lượng"
                          value={formData.quantity}
                          onChange={(val) => setFormData({ ...formData, quantity: val })}
                        />
                        <CreatableSelect
                          label="Đơn vị tính"
                          value={formData.unit}
                          options={units}
                          onChange={(val) => setFormData({ ...formData, unit: val })}
                          onCreate={(val) => setFormData({ ...formData, unit: val })}
                          placeholder="Chọn/Nhập..."
                        />
                      </div>

                      <NumericInput
                        label="Số tiền *"
                        required
                        value={formData.total_amount}
                        onChange={(val) => setFormData({ ...formData, total_amount: val })}
                        inputClassName="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold text-primary"
                      />

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                        <textarea
                          rows={3}
                          placeholder="Ghi chú thêm..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu chi phí'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CostFilter = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    category: '',
    warehouse: '',
    employee: '',
    content: ''
  });

  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<any>(null);

  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
    handleFilter();
  }, []);

  const fetchFilterOptions = async () => {
    // ... existing code ...
    // Fetch unique categories
    const { data: catData } = await supabase.from('costs').select('cost_category');
    if (catData) {
      const unique = Array.from(new Set(catData.map(i => i.cost_category).filter(Boolean)))
        .map((name, id) => ({ id, name }));
      setCategories(unique);
    }

    // Fetch warehouses
    const { data: whData } = await supabase.from('warehouses').select('id, name');
    if (whData) setWarehouses(whData);

    // Fetch employees
    let empQuery = supabase.from('users').select('id, full_name');
    if (user.role !== 'Admin App') {
      empQuery = empQuery.neq('role', 'Admin App');
    }
    const { data: empData } = await empQuery;
    if (empData) setEmployees(empData.map(e => ({ id: e.id, name: e.full_name })));

    // Fetch unique contents
    const { data: contentData } = await supabase.from('costs').select('content');
    if (contentData) {
      const unique = Array.from(new Set(contentData.map(i => i.content).filter(Boolean)))
        .map((name, id) => ({ id, name }));
      setContents(unique);
    }
  };

  const handleFilter = async () => {
    // ... existing code ...
    setLoading(true);
    try {
      let query = supabase
        .from('costs')
        .select('*, users(full_name), warehouses(name), materials(name)')
        .gte('date', filters.fromDate)
        .lte('date', filters.toDate);

      if (filters.category) query = query.ilike('cost_category', `%${filters.category}%`);
      if (filters.warehouse) {
        const wh = warehouses.find(w => w.name === filters.warehouse);
        if (wh) query = query.eq('warehouse_id', wh.id);
      }
      if (filters.employee) {
        const emp = employees.find(e => e.name === filters.employee);
        if (emp) query = query.eq('employee_id', emp.id);
      }
      if (filters.content) query = query.ilike('content', `%${filters.content}%`);

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      setCosts(data || []);
    } catch (error) {
      console.error('Error filtering costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setIsResetting(true);
    setFilters({
      fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      category: '',
      warehouse: '',
      employee: '',
      content: ''
    });
    setTimeout(() => {
      handleFilter();
      setIsResetting(false);
    }, 500);
  };

  const totalAmount = costs.reduce((sum, item) => sum + (item.total_amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-32">
      <PageBreadcrumb
        title="Lọc chi phí"
        onBack={onBack}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Filter Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Filter size={18} className="text-primary" /> Lọc chi phí
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetFilters}
                className="flex flex-col items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-primary transition-colors group"
              >
                <div className="p-2 bg-gray-50 rounded-full group-hover:bg-primary/10 transition-colors">
                  <motion.div
                    animate={{ rotate: isResetting ? -360 : 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <RotateCcw size={16} />
                  </motion.div>
                </div>
                Reset bộ lọc
              </motion.button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <CustomCombobox
                label="Nhóm chi phí"
                value={filters.category}
                onChange={(val) => setFilters({ ...filters, category: val })}
                options={categories}
                placeholder="Chọn nhóm chi phí..."
              />

              <CustomCombobox
                label="Chọn kho"
                value={filters.warehouse}
                onChange={(val) => setFilters({ ...filters, warehouse: val })}
                options={warehouses}
                placeholder="Chọn kho..."
              />

              <CustomCombobox
                label="Chọn nhân viên"
                value={filters.employee}
                onChange={(val) => setFilters({ ...filters, employee: val })}
                options={employees}
                placeholder="Chọn nhân viên..."
              />

              <CustomCombobox
                label="Nội dung chi"
                value={filters.content}
                onChange={(val) => setFilters({ ...filters, content: val })}
                options={contents}
                placeholder="Chọn nội dung chi..."
              />

              <div className="pt-4 border-t border-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase">Tổng số tiền</span>
                  <span className="text-xl font-black text-primary">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Bằng chữ</p>
                  <p className="text-xs font-medium text-primary italic">{numberToWords(totalAmount)}</p>
                </div>
              </div>

              <button
                onClick={handleFilter}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RotateCcw size={18} className="animate-spin" /> : <Search size={18} />}
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Kết quả lọc chi phí</h3>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-primary transition-colors"><Download size={18} /></button>
                <button className="p-2 text-gray-400 hover:text-primary transition-colors"><Printer size={18} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                  <RotateCcw size={32} className="animate-spin" />
                  <p className="text-sm font-medium">Đang tải dữ liệu...</p>
                </div>
              ) : costs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                  <Search size={32} />
                  <p className="text-sm font-medium">Không tìm thấy kết quả nào.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {costs.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => {
                        setSelectedCost(item);
                        setShowDetailModal(true);
                      }}
                      className="p-4 rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full uppercase">
                          {item.cost_code || item.id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">{formatDate(item.date)}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 mb-1 group-hover:text-primary transition-colors">{item.content}</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                          <User size={12} /> {item.users?.full_name}
                          {item.warehouses?.name && (
                            <>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <Warehouse size={12} /> {item.warehouses.name}
                            </>
                          )}
                        </div>
                        <span className="text-sm font-black text-primary">{formatCurrency(item.total_amount)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedCost && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><FileText size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">Chi tiết chi phí</h3>
                    <p className="text-xs text-white/70">Mã: {selectedCost.cost_code || selectedCost.id.slice(0, 8)}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <DetailItem label="Ngày chi" value={formatDate(selectedCost.date)} />
                  <DetailItem label="Người chi" value={selectedCost.users?.full_name} />
                  <DetailItem label="Nội dung" value={selectedCost.content} className="col-span-2" />
                  <DetailItem label="Nhóm chi phí" value={selectedCost.cost_category} />
                  <DetailItem label="Loại hình" value={selectedCost.cost_type} />
                  <DetailItem label="Kho" value={selectedCost.warehouses?.name || 'N/A'} />
                  <DetailItem label="Đơn vị tính" value={selectedCost.unit} />
                  <DetailItem label="Số lượng" value={selectedCost.quantity} />
                  <DetailItem label="Đơn giá" value={formatCurrency(selectedCost.unit_price || 0)} />
                  <DetailItem label="Tổng tiền" value={formatCurrency(selectedCost.total_amount)} color="text-primary font-black text-lg" />
                  <DetailItem label="Trạng thái nhập kho" value={selectedCost.stock_status} />
                  <DetailItem label="Ghi chú" value={selectedCost.notes} className="col-span-2" />
                </div>

                <div className="bg-primary/5 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Bằng chữ</p>
                  <p className="text-sm font-bold text-primary italic">{numberToWords(selectedCost.total_amount)}</p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CostReport = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // New states for entry flow
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [costTypes, setCostTypes] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const [masterForm, setMasterForm] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_id: user.id,
    employee_name: user.full_name,
    items: [] as any[]
  });

  const [detailForm, setDetailForm] = useState({
    index: -1, // for editing existing items in the list
    content: '',
    unit_price: 0,
    quantity: 1,
    total_amount: 0,
    cost_type: '',
    unit: '',
    warehouse_name: '',
    notes: '',
    cost_category: 'Chi phí',
    stock_status: 'Chưa nhập'
  });

  useEffect(() => {
    fetchCosts();
    fetchWarehouses();
    fetchMaterials();
    fetchCostTypes();
    fetchUnits();
  }, []);

  const fetchCosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('costs')
      .select('*, users(full_name), warehouses(name), materials(name)')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching costs:', error);
    } else if (data) {
      setCosts(data);
    }
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('id, name');
    if (data) setMaterials(data);
  };

  const fetchCostTypes = async () => {
    const { data } = await supabase.from('costs').select('cost_type');
    if (data) {
      const uniqueTypes = Array.from(new Set(data.map(item => item.cost_type)))
        .filter(Boolean)
        .map((name, index) => ({ id: index, name }));
      setCostTypes(uniqueTypes);
    }
  };

  const fetchUnits = async () => {
    const { data } = await supabase.from('costs').select('unit');
    if (data) {
      const uniqueUnits = Array.from(new Set(data.map(item => item.unit)))
        .filter(Boolean)
        .map((name, index) => ({ id: index, name }));
      setUnits(uniqueUnits);
    }
  };

  const generateCostCode = (dateStr: string, empId: string) => {
    const dateObj = new Date(dateStr);
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = String(dateObj.getFullYear()).slice(-2);
    return `${empId.toUpperCase()}-${d}${m}${y}`;
  };

  const handleAddReport = () => {
    setMasterForm({
      date: new Date().toISOString().split('T')[0],
      employee_id: user.id,
      employee_name: user.full_name,
      items: []
    });
    setShowMasterModal(true);
  };

  const handleEditReport = (group: any) => {
    setMasterForm({
      date: group.date,
      employee_id: group.employee_id,
      employee_name: group.employee_name,
      items: group.items.map((item: any) => ({
        ...item,
        warehouse_name: item.warehouses?.name || '',
        cost_category: item.cost_category || 'Chi phí',
        stock_status: item.stock_status || 'Chưa nhập'
      }))
    });
    setShowMasterModal(true);
  };

  const handleAddItem = () => {
    setDetailForm({
      index: -1,
      content: '',
      unit_price: 0,
      quantity: 1,
      total_amount: 0,
      cost_type: '',
      unit: '',
      warehouse_name: '',
      notes: '',
      cost_category: 'Chi phí',
      stock_status: 'Chưa nhập'
    });
    setShowDetailModal(true);
  };

  const handleEditItem = (index: number) => {
    const item = masterForm.items[index];
    setDetailForm({
      index,
      ...item
    });
    setShowDetailModal(true);
  };

  const handleSaveDetail = () => {
    if (!detailForm.content || !detailForm.cost_type) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    const newItem = {
      ...detailForm,
      total_amount: detailForm.quantity * detailForm.unit_price
    };

    if (detailForm.index >= 0) {
      const newItems = [...masterForm.items];
      newItems[detailForm.index] = newItem;
      setMasterForm({ ...masterForm, items: newItems });
    } else {
      setMasterForm({ ...masterForm, items: [...masterForm.items, newItem] });
    }
    setShowDetailModal(false);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = masterForm.items.filter((_, i) => i !== index);
    setMasterForm({ ...masterForm, items: newItems });
  };

  const handleSaveAll = async () => {
    if (masterForm.items.length === 0) {
      alert('Vui lòng thêm ít nhất một hạng mục chi');
      return;
    }

    setSubmitting(true);
    try {
      const costCode = generateCostCode(masterForm.date, masterForm.employee_id);

      const itemsToInsert = await Promise.all(masterForm.items.map(async (item) => {
        // Ensure warehouse exists
        let warehouse_id = null;
        if (item.warehouse_name) {
          const existingWh = warehouses.find(w => w.name.toLowerCase() === item.warehouse_name.toLowerCase());
          if (existingWh) {
            warehouse_id = existingWh.id;
          } else {
            const { data: newWh } = await supabase.from('warehouses').insert([{ name: item.warehouse_name }]).select();
            if (newWh) warehouse_id = newWh[0].id;
          }
        }

        // Ensure material exists
        let material_id = null;
        if (item.content) {
          const existingMat = materials.find(m => m.name.toLowerCase() === item.content.toLowerCase());
          if (existingMat) {
            material_id = existingMat.id;
          } else {
            const { data: newMat } = await supabase.from('materials').insert([{ name: item.content }]).select();
            if (newMat) material_id = newMat[0].id;
          }
        }

        const payload = {
          date: masterForm.date,
          cost_code: costCode,
          employee_id: masterForm.employee_id,
          cost_type: item.cost_type,
          content: item.content,
          warehouse_id,
          material_id,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          notes: item.notes,
          cost_category: item.cost_category,
          stock_status: item.stock_status
        };

        return item.id ? { ...payload, id: item.id } : payload;
      }));

      // Separate new and existing items
      const newItems = itemsToInsert.filter(item => !item.id);
      const existingItems = itemsToInsert.filter(item => item.id);

      if (newItems.length > 0) {
        const { error } = await supabase.from('costs').insert(newItems);
        if (error) throw error;
      }

      if (existingItems.length > 0) {
        for (const item of existingItems) {
          const { error } = await supabase.from('costs').update(item).eq('id', item.id);
          if (error) throw error;
        }
      }

      setShowMasterModal(false);
      fetchCosts();
      alert('Lưu báo cáo chi phí thành công!');
    } catch (err: any) {
      alert('Lỗi khi lưu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Group costs by date and employee
  const groupedData = costs.reduce((acc: any[], current: any) => {
    const date = current.date;
    const employeeId = current.employee_id;
    const employeeName = current.users?.full_name || 'N/A';

    const existingGroup = acc.find(g => g.date === date && g.employee_id === employeeId);

    if (existingGroup) {
      existingGroup.total_amount += current.total_amount;
      existingGroup.items.push(current);
    } else {
      acc.push({
        date,
        employee_id: employeeId,
        employee_name: employeeName,
        total_amount: current.total_amount,
        items: [current]
      });
    }
    return acc;
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Báo cáo chi phí" onBack={onBack} />
        <button
          onClick={handleAddReport}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Thêm báo cáo
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Summary List */}
        <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${selectedGroup ? 'hidden lg:block' : 'block'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ngày chi</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Người chi</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Tổng số tiền</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
                ) : groupedData.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Chưa có dữ liệu chi phí</td></tr>
                ) : (
                  groupedData.map((group, idx) => (
                    <tr
                      key={`${group.date}-${group.employee_id}-${idx}`}
                      onClick={() => { setSelectedGroup(group); setSelectedItem(null); }}
                      className={`hover:bg-primary/5 cursor-pointer transition-colors ${selectedGroup?.date === group.date && selectedGroup?.employee_id === group.employee_id ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(group.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{group.employee_name}</td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">{formatCurrency(group.total_amount)}</td>
                      <td className="px-4 py-3 text-gray-400 flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditReport(group); }}
                          className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <ChevronRight size={16} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Detail View */}
        {selectedGroup && (
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedGroup(null)} className="lg:hidden p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <ArrowLeft size={18} className="text-gray-500" />
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Hạng mục chi</h3>
                    <p className="text-[10px] text-gray-500">{formatDate(selectedGroup.date)} - {selectedGroup.employee_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg">{selectedGroup.items.length} mục</span>
                  <button onClick={() => setSelectedGroup(null)} className="hidden lg:block p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ngày chi</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Loại chi phí</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedGroup.items.map((item: any) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'bg-gray-50' : ''}`}
                      >
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 font-medium">{item.cost_type}</td>
                        <td className="px-4 py-3 text-xs font-bold text-red-600 text-right">{formatCurrency(item.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Item Details (Level 2) */}
            {selectedItem && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <FileText size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Chi tiết khoản chi</h3>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{selectedItem.cost_code}-{String(selectedGroup.items.indexOf(selectedItem) + 1).padStart(2, '0')}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  <DetailItem label="ID_ChiTiet" value={`${selectedItem.cost_code}-${String(selectedGroup.items.indexOf(selectedItem) + 1).padStart(2, '0')}`} />
                  <DetailItem label="ID_ChiPhi" value={selectedItem.cost_code} />
                  <DetailItem label="Nội dung chi" value={selectedItem.content} />
                  <DetailItem label="Đơn giá" value={formatCurrency(selectedItem.total_amount / (selectedItem.quantity || 1))} />
                  <DetailItem label="Số lượng" value={selectedItem.quantity} />
                  <DetailItem label="Số tiền" value={formatCurrency(selectedItem.total_amount)} color="text-red-600 font-bold text-lg" />
                  <DetailItem label="Ngày chi" value={formatDate(selectedItem.date)} />
                  <DetailItem label="Loại chi phí" value={selectedItem.cost_type} />
                  <DetailItem label="Đơn vị tính" value={selectedItem.unit} />
                  <DetailItem label="Tên kho" value={selectedItem.warehouses?.name || 'N/A'} />
                  <DetailItem label="Người chi" value={selectedItem.users?.full_name} />
                  <DetailItem label="TT" value={String(selectedGroup.items.indexOf(selectedItem) + 1).padStart(2, '0')} />
                  <DetailItem label="Loại hình chi" value={selectedItem.cost_category || 'N/A'} />
                  <DetailItem label="Tình trạng nhập kho" value={selectedItem.stock_status || 'N/A'} />
                  <DetailItem label="Ghi chú" value={selectedItem.notes || 'Không có ghi chú'} className="col-span-full" />
                  <div className="col-span-full pt-4 border-t border-gray-50">
                    <DetailItem label="Số tiền bằng chữ" value={numberToWords(selectedItem.total_amount)} color="text-primary font-medium italic" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Master Form Modal (Image 3) */}
      <AnimatePresence>
        {showMasterModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><FileText size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">Chi phí không xóa</h3>
                    <p className="text-xs text-white/70">Mã: {generateCostCode(masterForm.date, masterForm.employee_id)}</p>
                  </div>
                </div>
                <button onClick={() => setShowMasterModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">ID_ChiPhi</label>
                    <input type="text" readOnly value={generateCostCode(masterForm.date, masterForm.employee_id)} className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày chi</label>
                    <input
                      type="date"
                      value={masterForm.date}
                      onChange={(e) => setMasterForm({ ...masterForm, date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Người chi</label>
                    <input type="text" readOnly value={masterForm.employee_name} className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Hạng mục chi</h4>
                    <button
                      onClick={handleAddItem}
                      className="flex items-center gap-1 text-primary hover:text-primary-hover font-bold text-sm transition-colors"
                    >
                      <PlusCircle size={18} /> Mới
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100/50">
                          <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">TT</th>
                          <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Nội dung</th>
                          <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">Số tiền</th>
                          <th className="px-4 py-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {masterForm.items.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic text-xs">Chưa có hạng mục nào. Nhấn "Mới" để thêm.</td></tr>
                        ) : (
                          masterForm.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white transition-colors group">
                              <td className="px-4 py-2 text-xs text-gray-500">{idx + 1}</td>
                              <td className="px-4 py-2 text-xs font-medium text-gray-700">{item.content}</td>
                              <td className="px-4 py-2 text-xs font-bold text-primary text-right">{formatCurrency(item.total_amount)}</td>
                              <td className="px-4 py-2 flex items-center justify-end gap-2">
                                <button onClick={() => handleEditItem(idx)} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                                <button onClick={() => handleRemoveItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-primary/5 p-6 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase">Tổng số tiền</span>
                    <span className="text-xl font-black text-primary">
                      {formatCurrency(masterForm.items.reduce((sum, item) => sum + item.total_amount, 0))}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-primary/10">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Tổng tiền bằng chữ</p>
                    <p className="text-xs font-medium text-primary italic">
                      {numberToWords(masterForm.items.reduce((sum, item) => sum + item.total_amount, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowMasterModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                <button
                  onClick={handleSaveAll}
                  disabled={submitting}
                  className="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu báo cáo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Form Modal (Image 4/5) */}
      <AnimatePresence>
        {showDetailModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><PlusCircle size={24} /></div>
                  <h3 className="font-bold text-lg">Chi phí chi tiết</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">ID_ChiPhi</label>
                      <input type="text" readOnly value={generateCostCode(masterForm.date, masterForm.employee_id)} className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 outline-none" />
                    </div>

                    <CreatableSelect
                      label="Nội dung chi *"
                      value={detailForm.content}
                      options={materials}
                      onChange={(val) => setDetailForm({ ...detailForm, content: val })}
                      onCreate={(val) => setDetailForm({ ...detailForm, content: val })}
                      placeholder="Chọn nội dung..."
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <NumericInput
                        label="Đơn giá"
                        value={detailForm.unit_price}
                        onChange={(val) => setDetailForm({ ...detailForm, unit_price: val })}
                      />
                      <NumericInput
                        label="Số lượng"
                        value={detailForm.quantity}
                        onChange={(val) => setDetailForm({ ...detailForm, quantity: val })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Số tiền</label>
                      <div className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold text-primary">
                        {formatCurrency(detailForm.quantity * detailForm.unit_price)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <CreatableSelect
                      label="Loại chi phí *"
                      value={detailForm.cost_type}
                      options={costTypes}
                      onChange={(val) => setDetailForm({ ...detailForm, cost_type: val })}
                      onCreate={(val) => setDetailForm({ ...detailForm, cost_type: val })}
                      placeholder="Chọn loại chi phí..."
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <CreatableSelect
                        label="Đơn vị tính"
                        value={detailForm.unit}
                        options={units}
                        onChange={(val) => setDetailForm({ ...detailForm, unit: val })}
                        onCreate={(val) => setDetailForm({ ...detailForm, unit: val })}
                        placeholder="Chọn/Nhập..."
                      />
                      <CreatableSelect
                        label="Tên kho"
                        value={detailForm.warehouse_name}
                        options={warehouses}
                        onChange={(val) => setDetailForm({ ...detailForm, warehouse_name: val })}
                        onCreate={(val) => setDetailForm({ ...detailForm, warehouse_name: val })}
                        placeholder="Chọn kho..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Loại hình chi</label>
                        <div className="flex gap-2">
                          {['Chi phí', 'Nhập kho'].map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setDetailForm({ ...detailForm, cost_category: cat })}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${detailForm.cost_category === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tình trạng nhập kho</label>
                        <select
                          value={detailForm.stock_status}
                          onChange={(e) => setDetailForm({ ...detailForm, stock_status: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="Chưa nhập">Chưa nhập</option>
                          <option value="Đã nhập">Đã nhập</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                      <textarea
                        rows={3}
                        value={detailForm.notes}
                        onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        placeholder="Ghi chú thêm..."
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Số tiền bằng chữ</p>
                  <p className="text-xs font-medium text-gray-600 italic">
                    {numberToWords(detailForm.quantity * detailForm.unit_price)}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowDetailModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                <button
                  onClick={handleSaveDetail}
                  className="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


const DetailItem = ({ label, value, color = "text-gray-700", className = "" }: { label: string, value: any, color?: string, className?: string }) => (
  <div className={`space-y-1 ${className}`}>
    <span className="text-[10px] font-bold text-gray-400 uppercase block">{label}</span>
    <span className={`text-sm ${color}`}>{value}</span>
  </div>
);

const Dashboard = ({ user, onNavigate }: { user: Employee, onNavigate: (page: string, params?: any) => void }) => {
  const [counts, setCounts] = useState({
    employees: 0,
    materials: 0,
    warehouses: 0,
    slips: 0,
    pendingSlips: 0
  });
  const [loading, setLoading] = useState(true);
  const [hasClockedIn, setHasClockedIn] = useState(false);

  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        // Fetch Counts
        let empQuery = supabase.from('users').select('*', { count: 'exact', head: true }).neq('status', 'Nghỉ việc');
        if (user.role !== 'Admin App') {
          empQuery = empQuery.neq('role', 'Admin App');
        }
        const { count: empCount } = await empQuery;
        const { count: matCount } = await supabase.from('materials').select('*', { count: 'exact', head: true });
        const { count: whCount } = await supabase.from('warehouses').select('*', { count: 'exact', head: true });
        const { count: groupCount } = await supabase.from('material_groups').select('*', { count: 'exact', head: true });

        const [siP, soP, trP, siT, soT, trT] = await Promise.all([
          supabase.from('stock_in').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
          supabase.from('stock_out').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
          supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
          supabase.from('stock_in').select('*', { count: 'exact', head: true }),
          supabase.from('stock_out').select('*', { count: 'exact', head: true }),
          supabase.from('transfers').select('*', { count: 'exact', head: true })
        ]);

        setCounts({
          employees: empCount || 0,
          materials: matCount || 0,
          warehouses: whCount || 0,
          materialGroups: groupCount || 0,
          slips: (siT.count || 0) + (soT.count || 0) + (trT.count || 0),
          pendingSlips: (siP.count || 0) + (soP.count || 0) + (trP.count || 0)
        });

        // Fetch Inventory Data for Quick View
        const { data: materials } = await supabase.from('materials').select('id, name, unit').limit(10);
        if (materials) {
          const { data: inventory } = await supabase.from('inventory').select('*');
          const invData = materials.map(mat => {
            const balance = (inventory || []).filter(i => i.material_id === mat.id).reduce((s, i) => s + (i.quantity || 0), 0);
            return { ...mat, balance };
          });

          // Group by name to handle duplicates
          const groupedInv: any[] = [];
          invData.forEach(item => {
            const existing = groupedInv.find(g => g.name.toLowerCase().trim() === item.name.toLowerCase().trim() && g.unit === item.unit);
            if (existing) {
              existing.balance += item.balance;
            } else {
              groupedInv.push({ ...item });
            }
          });
          setInventory(groupedInv.filter(i => i.balance !== 0));
        }

        // Check attendance
        const today = new Date().toISOString().split('T')[0];
        const { data: attData } = await supabase.from('attendance').select('*').eq('employee_id', user.id).eq('date', today).maybeSingle();
        setHasClockedIn(!!attData);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, [user.id]);

  const stats: any[] = [
    { label: 'NHÂN SỰ', value: counts.employees, icon: Users, color: 'bg-blue-50 text-blue-600', page: 'hr-records' },
    { label: 'VẬT TƯ', value: counts.materials, icon: Package, color: 'bg-green-50 text-green-600', page: 'materials' },
    { label: 'NHÓM VẬT TƯ', value: counts.materialGroups, icon: Layers, color: 'bg-indigo-50 text-indigo-600', page: 'material-groups' },
    { label: 'KHO BÃI', value: counts.warehouses, icon: Warehouse, color: 'bg-orange-50 text-orange-600', page: 'warehouses' },
    (user.role === 'Admin' || user.role === 'Admin App')
      ? { label: 'PHIẾU DUYỆT', value: counts.pendingSlips, icon: ClipboardCheck, color: 'bg-purple-50 text-purple-600', page: 'pending-approvals' }
      : {
        label: 'CHẤM CÔNG',
        value: hasClockedIn ? 'ĐÃ CHẤM' : 'CHƯA CHẤM',
        icon: CalendarCheck,
        color: hasClockedIn ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600',
        page: 'attendance'
      },
  ];

  const sections = [
    {
      title: 'QUẢN LÝ TÀI CHÍNH',
      items: [
        { label: 'Chi phí', icon: Wallet, page: 'costs' },
        { label: 'Báo cáo chi phí', icon: FileText, page: 'cost-report' },
        { label: 'Lọc chi phí', icon: Filter, page: 'cost-filter' },
      ]
    },
    {
      title: 'QUẢN LÝ KHO',
      items: [
        { label: 'Nhập kho', icon: ArrowDownCircle, page: 'stock-in' },
        { label: 'Xuất kho', icon: ArrowUpCircle, page: 'stock-out' },
        { label: 'Luân chuyển kho', icon: ArrowLeftRight, page: 'transfer' },
        { label: 'Kiểm tra tồn kho', icon: BarChart3, page: 'inventory-report' },
        { label: 'Danh sách kho', icon: Warehouse, page: 'warehouses' },
        { label: 'Nhóm vật tư', icon: Layers, page: 'material-groups' },
        { label: 'Danh mục vật tư', icon: Settings, page: 'materials' },
      ]
    },
    {
      title: 'TIỀN LƯƠNG',
      items: [
        { label: 'Chấm công', icon: CalendarCheck, page: 'attendance' },
        { label: 'Tạm ứng & phụ cấp', icon: Banknote, page: 'advances' },
        { label: 'Tổng hợp lương/tháng', icon: Wallet, page: 'payroll' },
        { label: 'Cài đặt lương', icon: Settings2, page: 'salary-settings' },
      ]
    },
    {
      title: 'ĐỐI TÁC',
      items: [
        { label: 'Khách hàng & nhà cung cấp', icon: Handshake, page: 'partners' },
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { label: 'Quản lý nhân sự', icon: UserCircle, page: 'hr-records' },
        { label: 'Nhật ký / Ghi chú', icon: FileText, page: 'notes' },
        { label: 'Thiết lập Lịch nhắc', icon: Bell, page: 'reminders' },
        { label: 'Thùng rác', icon: Trash2, page: 'trash' },
      ]
    },
    {
      title: 'CÔNG CỤ',
      items: [
        { label: 'Backup', icon: Settings, page: 'backup-settings' },
        { label: 'Sao lưu ngay', icon: Download, page: 'backup-now' },
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (user.role === 'User') {
        const allowed = ['stock-in', 'stock-out', 'transfer', 'attendance', 'cost-report'];
        return allowed.includes(item.page);
      }
      return true;
    })
  })).filter(section => section.items.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-8 pb-44">
      <div>
        <h2 className="text-xs font-bold text-primary mb-4 flex items-center gap-2">
          <LayoutDashboard size={16} /> TỔNG QUAN
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              onClick={() => onNavigate(stat.page, stat.params)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-xl ${stat.color === 'bg-green-50 text-green-600' ? 'bg-primary-light text-primary' : stat.color}`}>
                <stat.icon size={24} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {filteredSections.map((section, sIdx) => (
        <div key={sIdx}>
          <h2 className="text-xs font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Boxes size={16} /> {section.title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {section.items.map((item, iIdx) => (
              <motion.div
                key={iIdx}
                whileHover={{ y: -4 }}
                onClick={() => onNavigate(item.page)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer group"
              >
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary-light transition-colors">
                  <item.icon size={24} className="text-gray-600 group-hover:text-primary" />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* Quick Inventory Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
            <Package size={16} /> TỒN KHO NHANH
          </h2>
          <button
            onClick={() => onNavigate('inventory-report')}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
          >
            Xem tất cả <ArrowRight size={12} />
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vật tư</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Tồn kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-400 italic text-xs">Đang tải...</td></tr>
                ) : inventory.length === 0 ? (
                  <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-400 italic text-xs">Chưa có dữ liệu tồn kho</td></tr>
                ) : (
                  inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="text-xs font-bold text-gray-800">{item.name}</div>
                        <div className="text-[9px] text-gray-400">{item.unit}</div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-xs font-bold ${item.balance <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatNumber(item.balance)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const PendingApprovals = ({ user, onBack, onNavigate, onRefreshCount }: { user: Employee, onBack: () => void, onNavigate: (page: string, params?: any) => void, onRefreshCount?: () => void }) => {
  const [pendingSlips, setPendingSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingSlips();
  }, []);

  const fetchPendingSlips = async () => {
    setLoading(true);
    try {
      const [si, so, tr] = await Promise.all([
        supabase.from('stock_in').select('*, warehouses(name), materials(name, unit)').eq('status', 'Chờ duyệt'),
        supabase.from('stock_out').select('*, warehouses(name), materials(name, unit)').eq('status', 'Chờ duyệt'),
        supabase.from('transfers').select('*, from_wh:warehouses!from_warehouse_id(name), to_wh:warehouses!to_warehouse_id(name), materials(name, unit)').eq('status', 'Chờ duyệt')
      ]);

      const siData = (si.data || []).map(item => ({
        ...item,
        type: 'Nhập kho',
        table: 'stock_in',
        isEdit: item.notes?.startsWith('[SỬA]')
      }));
      const soData = (so.data || []).map(item => ({
        ...item,
        type: 'Xuất kho',
        table: 'stock_out',
        isEdit: item.notes?.startsWith('[SỬA]')
      }));
      const trData = (tr.data || []).map(item => ({
        ...item,
        type: 'Luân chuyển',
        table: 'transfers',
        isEdit: item.notes?.startsWith('[SỬA]')
      }));

      setPendingSlips([...siData, ...soData, ...trData].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err: any) {
      console.error('Error fetching pending slips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, status: string, table: string) => {
    try {
      const finalStatus = status === 'Từ chối' ? 'Đã xóa' : status;
      const { data: slip, error: fetchError } = await supabase.from(table).select('*').eq('id', id).single();
      if (fetchError) throw fetchError;

      const { error } = await supabase.from(table).update({ status: finalStatus }).eq('id', id);
      if (error) throw error;

      // Update inventory if approved
      if (status === 'Đã duyệt') {
        if (table === 'stock_in') {
          await updateInventory(slip.warehouse_id, slip.material_id, slip.quantity);
        } else if (table === 'stock_out') {
          await updateInventory(slip.warehouse_id, slip.material_id, -slip.quantity);
        } else if (table === 'transfers') {
          await updateInventory(slip.from_warehouse_id, slip.material_id, -slip.quantity);
          await updateInventory(slip.to_warehouse_id, slip.material_id, slip.quantity);
        }
      }

      fetchPendingSlips();
      if (onRefreshCount) onRefreshCount();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const updateInventory = async (warehouseId: string, materialId: string, quantityChange: number) => {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('warehouse_id', warehouseId)
        .eq('material_id', materialId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching inventory:', fetchError);
        return;
      }

      if (current) {
        const newQty = (current.quantity || 0) + quantityChange;
        await supabase.from('inventory').update({ quantity: newQty }).eq('warehouse_id', warehouseId).eq('material_id', materialId);
      } else {
        await supabase.from('inventory').insert([{ warehouse_id: warehouseId, material_id: materialId, quantity: quantityChange }]);
      }
    } catch (err) {
      console.error('Error updating inventory:', err);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Phiếu chờ duyệt" onBack={onBack} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="text-primary" /> Danh sách phiếu chờ duyệt
          </h3>
          <p className="text-xs text-gray-500 mt-1">Tổng hợp tất cả các phiếu đang chờ Admin phê duyệt</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Loại phiếu</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ngày / Mã</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vật tư / Kho</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Số lượng / Đơn giá</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Thành tiền</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Đang tải dữ liệu...</td>
                </tr>
              ) : pendingSlips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Không có phiếu nào đang chờ duyệt</td>
                </tr>
              ) : (
                pendingSlips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold w-fit ${slip.type === 'Nhập kho' ? 'bg-blue-50 text-blue-600' :
                            slip.type === 'Xuất kho' ? 'bg-orange-50 text-orange-600' :
                              'bg-purple-50 text-purple-600'
                          }`}>
                          {slip.type}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md w-fit ${slip.isEdit ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                          {slip.isEdit ? 'SỬA PHIẾU' : 'NHẬP MỚI'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-800">{formatDate(slip.date)}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{slip.import_code || slip.export_code || slip.transfer_code || slip.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-800">{slip.materials?.name}</div>
                      <div className="text-[10px] text-primary font-bold">
                        {slip.type === 'Luân chuyển'
                          ? `${slip.from_wh?.name} → ${slip.to_wh?.name}`
                          : slip.warehouses?.name
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-red-600">{formatNumber(slip.quantity)} {slip.unit || slip.materials?.unit}</div>
                      {slip.unit_price && <div className="text-[10px] text-gray-400">{formatCurrency(slip.unit_price)}</div>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-primary">{slip.total_amount ? formatCurrency(slip.total_amount) : '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApprove(slip.id, 'Đã duyệt', slip.table)}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                          title="Duyệt phiếu"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleApprove(slip.id, 'Từ chối', slip.table)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Từ chối"
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={() => onNavigate(slip.table === 'stock_in' ? 'stock-in' : slip.table === 'stock_out' ? 'stock-out' : 'transfer')}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const HRRecords = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const initialFormState = {
    id: '',
    code: '',
    full_name: '',
    email: '',
    phone: '',
    id_card: '',
    dob: '',
    join_date: new Date().toISOString().split('T')[0],
    tax_id: '',
    app_pass: '',
    department: '',
    position: '',
    has_salary: false,
    role: 'User',
    data_view_permission: '',
    avatar_url: '',
    resign_date: '',
    initial_budget: 0,
    status: 'Đang làm việc'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    let query = supabase.from('users').select('*').neq('status', 'Đã xóa');

    // Hide Admin App from non-Admin App users
    if (user.role !== 'Admin App') {
      query = query.neq('role', 'Admin App');
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (data) setEmployees(data);
    setLoading(false);
  };

  const generateNextEmployeeCode = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('code')
        .like('code', 'cdx%')
        .order('code', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastCode = data[0].code;
        const lastNumber = parseInt(lastCode.replace('cdx', ''));
        if (!isNaN(lastNumber)) {
          const nextNumber = lastNumber + 1;
          return `cdx${nextNumber.toString().padStart(3, '0')}`;
        }
      }
      return 'cdx001';
    } catch (err) {
      console.error('Error generating code:', err);
      return 'cdx001';
    }
  };

  const handleEdit = (emp: Employee) => {
    if (emp.role === 'Admin App' && user.role !== 'Admin App') {
      alert('Bạn không có quyền chỉnh sửa tài khoản Admin App');
      return;
    }
    setFormData({
      ...emp,
      code: emp.code || '',
      dob: emp.dob || '',
      resign_date: emp.resign_date || '',
      email: emp.email || '',
      phone: emp.phone || '',
      id_card: emp.id_card || '',
      tax_id: emp.tax_id || '',
      department: emp.department || '',
      position: emp.position || '',
      data_view_permission: emp.data_view_permission || '',
      avatar_url: emp.avatar_url || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    // Check if trying to delete an Admin App account
    const target = employees.find(e => e.id === itemToDelete);
    if (target?.role === 'Admin App' && user.role !== 'Admin App') {
      alert('Bạn không có quyền xóa tài khoản Admin App');
      return;
    }

    try {
      const { error } = await supabase.from('users').update({ status: 'Đã xóa' }).eq('id', itemToDelete);
      if (error) throw error;
      fetchEmployees();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      alert('Lỗi khi xóa nhân sự: ' + err.message);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { id, ...rest } = formData;
      const dataToSubmit = {
        ...rest,
        dob: formData.dob || null,
        join_date: formData.join_date || null,
        resign_date: formData.resign_date || null,
        email: formData.email || null,
        phone: formData.phone || null,
        id_card: formData.id_card || null,
        tax_id: formData.tax_id || null,
        department: formData.department || null,
        position: formData.position || null,
        data_view_permission: formData.data_view_permission || null,
        avatar_url: formData.avatar_url || null
      };

      if (isEditing) {
        const { error } = await supabase.from('users').update(dataToSubmit).eq('id', id);
        if (error) throw error;
      } else {
        // For new records, don't send the empty ID string so Supabase generates a UUID
        const { error } = await supabase.from('users').insert([dataToSubmit]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchEmployees();
      setFormData(initialFormState);
      setIsEditing(false);
    } catch (err: any) {
      alert('Lỗi khi lưu nhân sự: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.code && emp.code.toLowerCase().includes(searchTerm.toLowerCase()));

    // Hide Admin App accounts from non-Admin App users
    if (user.role !== 'Admin App' && emp.role === 'Admin App') {
      return false;
    }
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Hồ sơ Nhân sự" onBack={onBack} />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Users size={20} className="text-primary" /> Hồ sơ Nhân sự
        </h2>
        <button
          onClick={async () => {
            const nextCode = await generateNextEmployeeCode();
            setFormData({ ...initialFormState, code: nextCode });
            setIsEditing(false);
            setShowModal(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-hover transition-colors"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm nhanh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none">
            <option>-- Nhân sự --</option>
          </select>
          <select className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none">
            <option>-- Kho --</option>
          </select>
          <input type="date" className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
          <input type="date" className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-primary text-white text-[11px] uppercase tracking-wider whitespace-nowrap">
                <th className="p-3 first:rounded-tl-lg sticky left-0 bg-primary z-10">Mã NV</th>
                <th className="p-3">Họ và tên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Số điện thoại</th>
                <th className="p-3">Ngày vào làm</th>
                {user.role === 'Admin App' && <th className="p-3">Mật khẩu ứng dụng</th>}
                <th className="p-3">Bộ phận</th>
                <th className="p-3">Chức vụ</th>
                <th className="p-3">Phân quyền</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 last:rounded-tr-lg">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-600">
              {loading ? (
                <tr><td colSpan={user.role === 'Admin App' ? 11 : 10} className="p-8 text-center">Đang tải dữ liệu...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={user.role === 'Admin App' ? 11 : 10} className="p-8 text-center">Không tìm thấy nhân sự nào</td></tr>
              ) : filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors whitespace-nowrap">
                  <td className="p-3 font-bold text-gray-800 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-b border-gray-50">{emp.code || emp.id.slice(0, 8)}</td>
                  <td className="p-3">{emp.full_name}</td>
                  <td className="p-3">{emp.email || '-'}</td>
                  <td className="p-3">{emp.phone || '-'}</td>
                  <td className="p-3">{emp.join_date || '-'}</td>
                  {user.role === 'Admin App' && <td className="p-3 font-mono text-blue-600">{emp.app_pass}</td>}
                  <td className="p-3">{emp.department || '-'}</td>
                  <td className="p-3">{emp.position || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.role === 'Admin App' ? 'bg-purple-100 text-purple-600' :
                        emp.role === 'Admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.status === 'Đang làm việc' || emp.status === 'Hoạt động' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(emp)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(emp.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa nhân sự <strong>{employees.find(e => e.id === itemToDelete)?.code || itemToDelete.slice(0, 8)}</strong>? Dữ liệu liên quan có thể bị ảnh hưởng.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative z-10 my-8 max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-4 flex items-center justify-between text-white rounded-t-3xl flex-shrink-0">
                <h3 className="font-bold">{isEditing ? 'Cập Nhật Nhân Sự' : 'Thêm Mới Nhân Sự'}</h3>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit}>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã nhân viên</label>
                        <input
                          required
                          type="text"
                          disabled={isEditing}
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Họ và tên</label>
                        <input
                          required
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Số điện thoại</label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">CMND / CCCD</label>
                        <input
                          type="text"
                          value={formData.id_card}
                          onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày sinh</label>
                        <input
                          type="date"
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày vào làm</label>
                        <input
                          type="date"
                          value={formData.join_date}
                          onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mã số thuế</label>
                        <input
                          type="text"
                          value={formData.tax_id}
                          onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      {user.role === 'Admin App' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Mật khẩu ứng dụng</label>
                          <input
                            required
                            type="text"
                            value={formData.app_pass}
                            onChange={(e) => setFormData({ ...formData, app_pass: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Bộ phận</label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Chức vụ</label>
                        <input
                          type="text"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Có tính lương</label>
                        <select
                          value={formData.has_salary ? 'true' : 'false'}
                          onChange={(e) => setFormData({ ...formData, has_salary: e.target.value === 'true' })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="false">Không</option>
                          <option value="true">Có</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Phân quyền</label>
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="User">User</option>
                          <option value="Admin">Admin</option>
                          {user.role === 'Admin App' && <option value="Admin App">Admin App</option>}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Quyền xem dữ liệu</label>
                        <input
                          type="text"
                          value={formData.data_view_permission}
                          onChange={(e) => setFormData({ ...formData, data_view_permission: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ảnh cá nhân (URL)</label>
                        <input
                          type="text"
                          value={formData.avatar_url}
                          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày nghỉ việc</label>
                        <input
                          type="date"
                          value={formData.resign_date}
                          onChange={(e) => setFormData({ ...formData, resign_date: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ngân sách đầu kỳ</label>
                        <input
                          type="number"
                          value={formData.initial_budget}
                          onChange={(e) => setFormData({ ...formData, initial_budget: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="Đang làm việc">Đang làm việc</option>
                          <option value="Nghỉ việc">Nghỉ việc</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors">Hủy bỏ</button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Attendance = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Hide Admin App from attendance list for non-Admin App users
      const { data: empData } = await supabase.from('users').select('*').neq('status', 'Nghỉ việc').neq('role', 'Admin App').order('full_name');
      if (empData) setEmployees(empData);

      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (attData) setAttendance(attData);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getStatus = (empId: string, day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.find(a => a.employee_id === empId && a.date === dateStr);
  };

  const toggleAttendance = async (empId: string, day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const current = getStatus(empId, day);

    if (current) {
      let nextStatus = 'present';
      let hours = 8;

      if (current.status === 'present') {
        nextStatus = 'half-day';
        hours = 4;
      } else if (current.status === 'half-day') {
        nextStatus = 'absent';
        hours = 0;
      } else {
        await supabase.from('attendance').delete().eq('id', current.id);
        fetchData();
        return;
      }

      await supabase.from('attendance').update({ status: nextStatus, hours_worked: hours, overtime_hours: current.overtime_hours || 0 }).eq('id', current.id);
    } else {
      await supabase.from('attendance').insert([{
        employee_id: empId,
        date: dateStr,
        status: 'present',
        hours_worked: 8,
        overtime_hours: 0
      }]);
    }
    fetchData();
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAtt, setEditingAtt] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ status: 'present', overtime: 0 });

  const openEditModal = (empId: string, day: number) => {
    const att = getStatus(empId, day);
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setEditingAtt({ empId, day, dateStr, id: att?.id });
    setEditFormData({
      status: att?.status || 'present',
      overtime: att?.overtime_hours || 0
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    const hours = editFormData.status === 'present' ? 8 : (editFormData.status === 'half-day' ? 4 : 0);
    if (editingAtt.id) {
      await supabase.from('attendance').update({
        status: editFormData.status,
        hours_worked: hours,
        overtime_hours: editFormData.overtime
      }).eq('id', editingAtt.id);
    } else {
      await supabase.from('attendance').insert([{
        employee_id: editingAtt.empId,
        date: editingAtt.dateStr,
        status: editFormData.status,
        hours_worked: hours,
        overtime_hours: editFormData.overtime
      }]);
    }
    setShowEditModal(false);
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500 text-white';
      case 'half-day': return 'bg-amber-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      default: return 'bg-gray-100 text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'X';
      case 'half-day': return '1/2';
      case 'absent': return 'V';
      default: return '';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Chấm công" onBack={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarCheck className="text-primary" /> Chấm công nhân viên
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý chuyên cần và giờ làm việc</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-3 py-1.5 rounded-xl border-none text-sm font-bold text-gray-700 outline-none">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-1.5 rounded-xl border-none text-sm font-bold text-gray-700 outline-none">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider sticky left-0 z-10 bg-primary border-r border-white/10 w-48">Nhân viên</th>
                {days.map(d => <th key={d} className="px-1 py-3 text-[10px] font-bold uppercase tracking-wider text-center border-r border-white/10 w-10">{d}</th>)}
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-20">Tổng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={days.length + 2} className="px-4 py-12 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : (
                employees.map((emp) => {
                  const empAtt = attendance.filter(a => a.employee_id === emp.id);
                  const totalDays = empAtt.reduce((sum, a) => sum + Number(a.hours_worked || 0), 0) / 8;
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-100">
                        <p className="text-xs font-bold text-gray-800 leading-tight">{emp.full_name}</p>
                        <p className="text-[9px] text-gray-400">{emp.code || emp.id.slice(0, 8)}</p>
                      </td>
                      {days.map(d => {
                        const att = getStatus(emp.id, d);
                        return (
                          <td key={d} className="p-0.5 border-r border-gray-50 relative group/cell">
                            <button
                              onClick={() => toggleAttendance(emp.id, d)}
                              onContextMenu={(e) => { e.preventDefault(); openEditModal(emp.id, d); }}
                              className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-black transition-all ${getStatusColor(att?.status)}`}
                            >
                              <span>{getStatusLabel(att?.status)}</span>
                              {att?.overtime_hours > 0 && <span className="text-[7px] leading-none mt-0.5">+{att.overtime_hours}h</span>}
                            </button>
                            <button
                              onClick={() => openEditModal(emp.id, d)}
                              className="absolute -top-1.5 -right-1.5 bg-white shadow-md border border-gray-100 rounded-full p-1 transition-all z-20 hover:scale-110 active:scale-90"
                            >
                              <Plus size={10} className="text-primary" />
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-center text-xs font-black text-primary">{totalDays.toFixed(1)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Attendance Modal */}
      <AnimatePresence>
        {showEditModal && editingAtt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Chi tiết ngày {editingAtt.day}</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái công</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {['present', 'half-day', 'absent'].map(s => (
                      <button
                        key={s}
                        onClick={() => setEditFormData({ ...editFormData, status: s })}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${editFormData.status === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}
                      >
                        {getStatusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
                <NumericInput
                  label="Giờ tăng ca (h)"
                  value={editFormData.overtime}
                  onChange={(val) => setEditFormData({ ...editFormData, overtime: val })}
                  placeholder="Ví dụ: 1.5"
                  isDecimal={true}
                />
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500">Hủy</button>
                  <button onClick={saveEdit} className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20">Lưu</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Advances = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [advances, setAdvances] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'advances' | 'allowances'>('advances');
  const [submitting, setSubmitting] = useState(false);

  const initialFormState = {
    employee_id: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reason: '',
    type: 'meal'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: empData } = await supabase.from('users').select('*').neq('status', 'Nghỉ việc').neq('role', 'Admin App').order('full_name');
    if (empData) setEmployees(empData);

    const { data: advData } = await supabase.from('advances').select('*, users(full_name)').order('date', { ascending: false });
    if (advData) setAdvances(advData);

    const { data: allData } = await supabase.from('allowances').select('*, users(full_name)').order('date', { ascending: false });
    if (allData) setAllowances(allData);
    setLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        employee_id: formData.employee_id,
        amount: formData.amount,
        date: formData.date,
        type: activeTab === 'advances' ? 'Tạm ứng' : formData.type,
        notes: formData.reason
      };

      if (isEditing && selectedItem) {
        const { error } = await supabase.from(activeTab === 'advances' ? 'advances' : 'allowances').update(payload).eq('id', selectedItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(activeTab === 'advances' ? 'advances' : 'allowances').insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchData();
      setFormData(initialFormState);
      setIsEditing(false);
      setSelectedItem(null);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      employee_id: item.employee_id,
      amount: item.amount,
      date: item.date,
      reason: item.notes || '',
      type: item.type
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
    try {
      const { error } = await supabase.from(activeTab === 'advances' ? 'advances' : 'allowances').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Tạm ứng & Phụ cấp" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setActiveTab('advances')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'advances' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}>Tạm ứng</button>
          <button onClick={() => setActiveTab('allowances')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'allowances' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}>Phụ cấp</button>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20">
          <Plus size={18} /> Thêm mới
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Nhân viên</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Số tiền</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">{activeTab === 'advances' ? 'Lý do' : 'Loại / Ghi chú'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : (activeTab === 'advances' ? advances : allowances).length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Chưa có dữ liệu</td></tr>
            ) : (
              (activeTab === 'advances' ? advances : allowances).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-800">{item.users?.full_name}</td>
                  <td className="px-4 py-3 text-xs font-black text-red-600">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 italic">
                    <div className="flex items-center justify-between">
                      <span>{item.reason || item.notes || item.type || '-'}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg">{isEditing ? 'Cập nhật' : 'Thêm'} {activeTab === 'advances' ? 'tạm ứng' : 'phụ cấp'} mới</h3>
                <button onClick={() => { setShowModal(false); setIsEditing(false); setSelectedItem(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân viên *</label>
                  <select required value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày *</label>
                  <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <NumericInput
                  label="Số tiền *"
                  required
                  value={formData.amount}
                  onChange={(val) => setFormData({ ...formData, amount: val })}
                />
                {activeTab === 'allowances' && (
                  <CreatableSelect
                    label="Loại phụ cấp"
                    value={formData.type}
                    options={[
                      { id: 'meal', name: 'Tiền cơm' },
                      { id: 'travel', name: 'Xăng xe' },
                      { id: 'phone', name: 'Điện thoại' },
                      { id: 'other', name: 'Khác' }
                    ]}
                    onChange={(val) => setFormData({ ...formData, type: val })}
                    onCreate={(val) => setFormData({ ...formData, type: val })}
                    placeholder="Chọn hoặc nhập loại mới..."
                  />
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú / Lý do</label>
                  <textarea rows={3} value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MonthlySalary = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSalaries();
  }, [selectedMonth, selectedYear]);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      // Hide Admin App from salary summary
      const { data: employees } = await supabase.from('users').select('*').neq('status', 'Nghỉ việc').neq('role', 'Admin App');
      if (!employees) return;

      const { data: settings } = await supabase.from('salary_settings').select('*');

      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      const { data: att } = await supabase.from('attendance').select('*').gte('date', startDate).lte('date', endDate);

      const { data: adv } = await supabase.from('advances').select('*').gte('date', startDate).lte('date', endDate);
      const { data: all } = await supabase.from('allowances').select('*').gte('date', startDate).lte('date', endDate);

      const calculated = employees.map(emp => {
        const set = settings?.find(s => s.employee_id === emp.id) || { base_salary: 0, daily_rate: 0 };
        const empAtt = att?.filter(a => a.employee_id === emp.id) || [];
        const empAdv = adv?.filter(a => a.employee_id === emp.id) || [];
        const empAll = all?.filter(a => a.employee_id === emp.id) || [];

        const totalDays = empAtt.reduce((sum, a) => sum + Number(a.hours_worked || 0), 0) / 8;
        const totalOT = empAtt.reduce((sum, a) => sum + Number(a.overtime_hours || 0), 0);
        const totalAdv = empAdv.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const totalAll = empAll.reduce((sum, a) => sum + Number(a.amount || 0), 0);

        const hourlyRate = Number(set.daily_rate || 0) / 8;
        const earnedSalary = totalDays * Number(set.daily_rate || 0);
        const otSalary = totalOT * hourlyRate;
        const netSalary = earnedSalary + otSalary + totalAll - totalAdv;

        return {
          ...emp,
          totalDays,
          totalOT,
          earnedSalary,
          otSalary,
          totalAdv,
          totalAll,
          netSalary,
          dailyRate: Number(set.daily_rate || 0),
          hourlyRate,
          attendanceDetails: empAtt,
          advancesDetails: empAdv,
          allowancesDetails: empAll
        };
      });

      setSalaries(calculated);
    } catch (err) {
      console.error('Error calculating salaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Tổng hợp lương" onBack={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="text-primary" /> Tổng hợp lương tháng
          </h2>
          <p className="text-xs text-gray-500 mt-1">Bảng lương chi tiết dựa trên công và các khoản phụ phí</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-3 py-1.5 rounded-xl border-none text-sm font-bold text-gray-700 outline-none">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-1.5 rounded-xl border-none text-sm font-bold text-gray-700 outline-none">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Nhân viên</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Công</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Tăng ca</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Lương công</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Phụ cấp</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Tạm ứng</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Thực lĩnh</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 italic">Đang tính toán...</td></tr>
            ) : (
              salaries.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-800">{s.full_name}</p>
                    <p className="text-[9px] text-gray-400">{s.code || s.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-gray-600">{s.totalDays.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-amber-600">{s.totalOT.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-600">{formatCurrency(s.earnedSalary + s.otSalary)}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-green-600">+{formatCurrency(s.totalAll)}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-red-600">-{formatCurrency(s.totalAdv)}</td>
                  <td className="px-4 py-3 text-right text-xs font-black text-primary">{formatCurrency(s.netSalary)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setSelectedSalary(s); setShowDetailModal(true); }}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Individual Salary Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedSalary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Chi tiết lương cá nhân</h3>
                  <p className="text-xs text-gray-500">Tháng {selectedMonth} năm {selectedYear}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8">
                {/* Header Info */}
                <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black text-xl">
                    {selectedSalary.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-800">{selectedSalary.full_name}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Mã NV: {selectedSalary.code || selectedSalary.id.slice(0, 8)}</p>
                  </div>
                </div>

                {/* Calculation Table */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi tiết tính toán</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Lương ngày (8h)</span>
                      <span className="font-bold text-gray-800">{formatCurrency(selectedSalary.dailyRate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Lương giờ (Tăng ca)</span>
                      <span className="font-bold text-gray-800">{formatCurrency(selectedSalary.hourlyRate)}</span>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng công ({selectedSalary.totalDays.toFixed(1)} ngày)</span>
                      <span className="font-bold text-gray-800">{formatCurrency(selectedSalary.earnedSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng tăng ca ({selectedSalary.totalOT.toFixed(1)} giờ)</span>
                      <span className="font-bold text-amber-600">+{formatCurrency(selectedSalary.otSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng phụ cấp</span>
                      <span className="font-bold text-green-600">+{formatCurrency(selectedSalary.totalAll)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng tạm ứng</span>
                      <span className="font-bold text-red-600">-{formatCurrency(selectedSalary.totalAdv)}</span>
                    </div>
                    <div className="pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                      <span className="text-lg font-black text-gray-800 uppercase">Thực lĩnh</span>
                      <span className="text-2xl font-black text-primary">{formatCurrency(selectedSalary.netSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Notes */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[10px] text-amber-700 leading-relaxed italic">
                    * Bảng lương này được tính toán tự động dựa trên dữ liệu chấm công và các khoản phát sinh trong tháng.
                    Mọi thắc mắc vui lòng liên hệ bộ phận kế toán.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors">
                    <Printer size={18} /> In bảng lương
                  </button>
                  <button onClick={() => setShowDetailModal(false)} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">
                    Đóng
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

const SalarySettings = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    base_salary: 0,
    daily_rate: 0,
    insurance_deduction: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let empQuery = supabase.from('users').select('*').neq('status', 'Nghỉ việc');
    if (user.role !== 'Admin App') {
      empQuery = empQuery.neq('role', 'Admin App');
    }
    const { data: empData } = await empQuery.order('full_name');
    const { data: setData } = await supabase.from('salary_settings').select('*');

    if (empData) {
      const combined = empData.map(e => ({
        ...e,
        settings: setData?.find(s => s.employee_id === e.id) || { base_salary: 0, daily_rate: 0, insurance_deduction: 0 }
      }));
      setEmployees(combined);
    }
    setLoading(false);
  };

  const handleEdit = (emp: any) => {
    setSelectedEmp(emp);
    setFormData({
      base_salary: emp.settings.base_salary,
      daily_rate: emp.settings.daily_rate,
      insurance_deduction: emp.settings.insurance_deduction
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await supabase.from('salary_settings').upsert({
        employee_id: selectedEmp.id,
        ...formData
      }, { onConflict: 'employee_id' });
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Cài đặt lương" onBack={onBack} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings2 className="text-primary" /> Cài đặt lương
        </h2>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Nhân viên</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Lương/Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-20">Sửa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-gray-800">{emp.full_name}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-primary">{formatCurrency(emp.settings.daily_rate)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEdit(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg">Thiết lập lương</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <NumericInput
                  label="Lương theo ngày công *"
                  required
                  value={formData.daily_rate}
                  onChange={(val) => setFormData({ ...formData, daily_rate: val })}
                />
                <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                  Cập nhật
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Stock Management Components ---

const StockIn = ({ user, onBack, initialStatus }: { user: Employee, onBack?: () => void, initialStatus?: string }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'Tất cả');
  const [materialHistory, setMaterialHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    material_id: '',
    quantity: 0,
    unit_price: 0,
    unit: '',
    notes: '',
    import_code: `NK-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'Chờ duyệt'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
    fetchWarehouses();
    fetchMaterials();
  }, []);

  const fetchSlips = async () => {
    setLoading(true);
    try {
      let query = supabase.from('stock_in').select('*, warehouses(name), materials(name, unit)').order('created_at', { ascending: false });

      if (statusFilter !== 'Tất cả') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching stock_in:', error);
        // Fallback to simple select if join fails
        const { data: fallbackData, error: fallbackError } = await supabase.from('stock_in').select('*').order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        setSlips(fallbackData || []);
      } else {
        setSlips(data || []);
      }
    } catch (err: any) {
      alert('Lỗi tải phiếu nhập kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, [statusFilter]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').neq('status', 'Đã xóa').order('name');
    if (data) setMaterials(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Resolve warehouse_id
      let finalWarehouseId = formData.warehouse_id;
      if (formData.warehouse_id && !isUUID(formData.warehouse_id)) {
        const whByName = warehouses.find(w => w.name.toLowerCase() === formData.warehouse_id.toLowerCase());
        if (whByName) {
          finalWarehouseId = whByName.id;
        } else {
          const random = Math.floor(100 + Math.random() * 900);
          const code = `K${(warehouses.length + 1).toString().padStart(2, '0')}-${random}`;
          const { data: newWh, error: whErr } = await supabase.from('warehouses').insert([{ name: formData.warehouse_id, code }]).select();
          if (whErr) throw whErr;
          if (newWh) {
            finalWarehouseId = newWh[0].id;
            fetchWarehouses();
          }
        }
      }

      // Resolve material_id
      let finalMaterialId = formData.material_id;
      if (formData.material_id && !isUUID(formData.material_id)) {
        const matByName = materials.find(m => m.name.toLowerCase() === formData.material_id.toLowerCase());
        if (matByName) {
          finalMaterialId = matByName.id;
        } else {
          throw new Error('Bạn phải chọn vật tư từ Danh mục, không được tự nhập mới!');
        }
      }

      const payload = {
        ...formData,
        warehouse_id: finalWarehouseId,
        material_id: finalMaterialId,
        employee_id: user.id,
        total_amount: formData.quantity * formData.unit_price,
        unit: formData.unit || materials.find(m => m.id === finalMaterialId)?.unit || '',
        status: 'Chờ duyệt',
        notes: isEditing ? `[SỬA] ${formData.notes}` : formData.notes
      };

      if (isEditing && selectedSlip) {
        const { error } = await supabase.from('stock_in').update(payload).eq('id', selectedSlip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stock_in').insert([payload]);
        if (error) throw error;

        // ✅ Cập nhật tồn kho: cộng số lượng vào bảng inventory
        const finalUnit = (formData as any).unit || materials.find((m: any) => m.id === finalMaterialId)?.unit || '';
        const { data: existingInv } = await supabase
          .from('inventory')
          .select('*')
          .eq('material_id', finalMaterialId)
          .eq('warehouse_id', finalWarehouseId)
          .maybeSingle();

        if (existingInv) {
          await supabase.from('inventory').update({
            quantity: Number(existingInv.quantity) + Number(formData.quantity),
            unit: finalUnit || existingInv.unit,
            updated_at: new Date().toISOString()
          }).eq('id', existingInv.id);
        } else {
          await supabase.from('inventory').insert([{
            material_id: finalMaterialId,
            warehouse_id: finalWarehouseId,
            quantity: formData.quantity,
            unit: finalUnit,
            updated_at: new Date().toISOString()
          }]);
        }
      }

      setShowModal(false);
      fetchSlips();
      setFormData(initialFormState);
      setIsEditing(false);
      setSelectedSlip(null);
      alert(isEditing ? 'Cập nhật phiếu nhập thành công!' : 'Nhập kho thành công! Tồn kho đã được cập nhật.');
    } catch (err: any) {
      alert('Lỗi: ' + (err as any).message); // Removed unsupported `toast`
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = async (slip: any) => {
    setSelectedSlip(slip);
    setShowDetailModal(true);

    // Fetch material history
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('stock_in')
        .select('*, warehouses(name)')
        .eq('material_id', slip.material_id)
        .eq('status', 'Đã duyệt')
        .order('date', { ascending: false })
        .limit(5);
      setMaterialHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEdit = () => {
    setFormData({
      date: selectedSlip.date,
      warehouse_id: selectedSlip.warehouse_id,
      material_id: selectedSlip.material_id,
      quantity: selectedSlip.quantity,
      unit_price: selectedSlip.unit_price,
      unit: selectedSlip.unit,
      notes: selectedSlip.notes,
      import_code: selectedSlip.import_code,
      status: 'Chờ duyệt'
    });
    setIsEditing(true);
    setShowDetailModal(false);
    setShowModal(true);
  };

  const handleApprove = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('stock_in').update({ status }).eq('id', id);
      if (error) throw error;
      
      // ✅ Nếu Duyệt phiếu Nhập kho -> Tự động ghi nhận khoản Chi vào "Báo cáo chi phí"
      if (status === 'Đã duyệt') {
        const { data: slip } = await supabase.from('stock_in').select('*, users(id)').eq('id', id).maybeSingle();
        if (slip && slip.total_amount > 0) {
          const dateObj = new Date(slip.date);
          const d = String(dateObj.getDate()).padStart(2, '0');
          const m = String(dateObj.getMonth() + 1).padStart(2, '0');
          const y = String(dateObj.getFullYear()).slice(-2);
          const random = Math.floor(1000 + Math.random() * 9000);
          const userPrefix = slip.users?.id?.slice(0, 4) || 'SYS';
          const costCode = `CP-${userPrefix.toUpperCase()}-${d}${m}${y}-${random}`;

          await supabase.from('costs').insert([{
            transaction_type: 'Chi',
            cost_code: costCode,
            date: slip.date,
            employee_id: user.id, // User who approved it
            cost_type: 'Vật tư',
            content: `Nhập kho từ phiếu ${slip.import_code}`,
            material_id: slip.material_id,
            warehouse_id: slip.warehouse_id,
            quantity: slip.quantity,
            unit: slip.unit,
            unit_price: slip.unit_price,
            total_amount: slip.total_amount,
            notes: 'Tự động tạo từ hệ thống Nhập Kho'
          }]);
        }
      }

      fetchSlips();
      setShowDetailModal(false);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Nhập kho" onBack={onBack} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${statusFilter === status
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setFormData({
              ...initialFormState,
              import_code: `NK-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
            });
            setIsEditing(false);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Lập phiếu nhập
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Ngày</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Vật tư</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Kho</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-white/10">Thành tiền</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : slips.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Chưa có phiếu nhập nào</td></tr>
              ) : (
                slips.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-bold">
                      <p>{item.materials?.name}</p>
                      <p className="text-[10px] text-gray-400 font-normal">#{item.materials?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{item.warehouses?.name}</p>
                      <p className="text-[10px] text-gray-400">#{item.warehouses?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-primary font-bold">{formatCurrency(item.total_amount || 0)}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Đã duyệt' ? 'bg-green-100 text-green-600' :
                            item.status === 'Từ chối' ? 'bg-red-100 text-red-600' :
                              'bg-yellow-100 text-yellow-600'
                          }`}>
                          {item.status || 'Chờ duyệt'}
                        </span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-primary transition-colors" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedSlip && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Chi tiết vật tư nhập</h3>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <Navigation size={32} />
                  </div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Xem lịch sử vật tư</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Vật tư</span>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">{selectedSlip.materials?.name || 'N/A'}</p>
                      <p className="text-[10px] text-gray-400">Mã: {selectedSlip.materials?.code || selectedSlip.material_id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Kho nhập</span>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">{selectedSlip.warehouses?.name || 'N/A'}</p>
                      <p className="text-[10px] text-gray-400">Mã: {selectedSlip.warehouses?.code || selectedSlip.warehouse_id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Ngày</span>
                    <span className="text-sm font-medium text-gray-800">{formatDate(selectedSlip.date)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Số lượng nhập</span>
                    <span className="text-sm font-bold text-red-600">{formatNumber(selectedSlip.quantity)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Đơn vị tính</span>
                    <span className="text-sm font-medium text-gray-800">{selectedSlip.unit || selectedSlip.materials?.unit || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Đơn giá</span>
                    <span className="text-sm font-medium text-gray-800">{formatCurrency(selectedSlip.unit_price || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Thành tiền</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(selectedSlip.total_amount || 0)}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Thành tiền bằng chữ</span>
                    <span className="text-sm font-medium text-blue-600 italic">{numberToWords(selectedSlip.total_amount || 0)}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Diễn giải</span>
                    <span className="text-sm font-medium text-gray-800">{selectedSlip.notes || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-3 border-b border-gray-50 pb-3">
                    <span className="text-xs text-gray-400 font-bold uppercase">Lịch sử nhập gần đây</span>
                    {loadingHistory ? (
                      <p className="text-xs text-gray-400 italic">Đang tải lịch sử...</p>
                    ) : materialHistory.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Chưa có lịch sử nhập</p>
                    ) : (
                      <div className="space-y-2">
                        {materialHistory.map((h, i) => (
                          <div key={i} className="flex justify-between items-center text-[11px] bg-gray-50 p-2 rounded-lg">
                            <span className="text-gray-500">{formatDate(h.date)}</span>
                            <span className="font-bold text-primary">{formatNumber(h.quantity)} {h.unit}</span>
                            <span className="text-gray-400">{h.warehouses?.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
                <button
                  onClick={handleEdit}
                  className="px-6 py-2 bg-blue-100 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-200 transition-colors flex items-center gap-2"
                >
                  <Edit size={16} /> Sửa phiếu
                </button>
                {(user.role === 'Admin' || user.role === 'Admin App') && selectedSlip.status === 'Chờ duyệt' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedSlip.id, 'Từ chối')}
                      className="px-6 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors"
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => handleApprove(selectedSlip.id, 'Đã duyệt')}
                      className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                    >
                      Duyệt phiếu
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-xl text-sm font-bold hover:bg-gray-600 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowDownCircle size={24} /></div>
                  <h3 className="font-bold text-lg">{isEditing ? 'Sửa phiếu nhập kho' : 'Lập phiếu nhập kho'}</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày nhập *</label>
                      <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>

                    <CreatableSelect
                      label="Tên vật tư nhập *"
                      value={formData.material_id}
                      options={materials}
                      onChange={(val) => {
                        const mat = materials.find(m => m.id === val);
                        setFormData({
                          ...formData,
                          material_id: val,
                          unit: mat?.unit || formData.unit
                        });
                      }}
                      onCreateNew={() => alert('Vui lòng chọn vật tư có trong Danh mục. Để thêm vật tư mới, hãy vào mục Danh mục vật tư.')}
                      placeholder="Chọn vật tư..."
                      required
                    />

                    <NumericInput
                      label="Số lượng nhập *"
                      required
                      value={formData.quantity}
                      onChange={(val) => setFormData({ ...formData, quantity: val })}
                      showControls
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Thành tiền</label>
                      <div className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm text-center bg-gray-50 outline-none font-bold text-primary">
                        {formatCurrency(formData.quantity * formData.unit_price)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <CreatableSelect
                      label="Tên kho nhập *"
                      value={formData.warehouse_id}
                      options={warehouses}
                      onChange={(val) => setFormData({ ...formData, warehouse_id: val })}
                      onCreate={(val) => setFormData({ ...formData, warehouse_id: val })}
                      placeholder="Chọn kho..."
                      required
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                      <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>

                    <NumericInput
                      label="Đơn giá"
                      value={formData.unit_price}
                      onChange={(val) => setFormData({ ...formData, unit_price: val })}
                      showControls
                      step={1000}
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Diễn giải</label>
                      <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy lệnh</button>
                    <button type="submit" disabled={submitting} className="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                      {submitting ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StockOut = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [availableStock, setAvailableStock] = useState<number | null>(null);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    material_id: '',
    quantity: 0,
    notes: '',
    status: 'Chờ duyệt'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
    fetchWarehouses();
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (formData.warehouse_id && formData.material_id) {
      checkStock();
    } else {
      setAvailableStock(null);
    }
  }, [formData.warehouse_id, formData.material_id]);

  const checkStock = async () => {
    const wh = warehouses.find(w => w.name === formData.warehouse_id || w.id === formData.warehouse_id);
    const mat = materials.find(m => m.name === formData.material_id || m.id === formData.material_id);

    if (!wh?.id || !mat?.id) return;

    try {
      // Calculate stock: total in - total out - total transfer from + total transfer to
      const { data: inData } = await supabase.from('stock_in').select('quantity').eq('warehouse_id', wh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt');
      const { data: outData } = await supabase.from('stock_out').select('quantity').eq('warehouse_id', wh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt');
      const { data: transFrom } = await supabase.from('transfers').select('quantity').eq('from_warehouse_id', wh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt');
      const { data: transTo } = await supabase.from('transfers').select('quantity').eq('to_warehouse_id', wh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt');

      const totalIn = (inData || []).reduce((sum, item) => sum + Number(item.quantity), 0);
      const totalOut = (outData || []).reduce((sum, item) => sum + Number(item.quantity), 0);
      const totalTransFrom = (transFrom || []).reduce((sum, item) => sum + Number(item.quantity), 0);
      const totalTransTo = (transTo || []).reduce((sum, item) => sum + Number(item.quantity), 0);

      setAvailableStock(totalIn - totalOut - totalTransFrom + totalTransTo);
    } catch (err) {
      console.error('Error checking stock:', err);
    }
  };

  const fetchSlips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('stock_out').select('*, warehouses(name), materials(name, unit)').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching stock_out:', error);
        const { data: fallbackData, error: fallbackError } = await supabase.from('stock_out').select('*').order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        setSlips(fallbackData || []);
      } else {
        setSlips(data || []);
      }
    } catch (err: any) {
      alert('Lỗi tải phiếu xuất kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').neq('status', 'Đã xóa').order('name');
    if (data) setMaterials(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Resolve warehouse_id
      let finalWarehouseId = formData.warehouse_id;
      if (formData.warehouse_id && !isUUID(formData.warehouse_id)) {
        const whByName = warehouses.find(w => w.name.toLowerCase() === formData.warehouse_id.toLowerCase());
        if (whByName) {
          finalWarehouseId = whByName.id;
        } else {
          const random = Math.floor(100 + Math.random() * 900);
          const code = `K${(warehouses.length + 1).toString().padStart(2, '0')}-${random}`;
          const { data: newWh, error: whErr } = await supabase.from('warehouses').insert([{ name: formData.warehouse_id, code }]).select();
          if (whErr) throw whErr;
          if (newWh) {
            finalWarehouseId = newWh[0].id;
            fetchWarehouses();
          }
        }
      }

      // Resolve material_id
      let finalMaterialId = formData.material_id;
      if (formData.material_id && !isUUID(formData.material_id)) {
        const matByName = materials.find(m => m.name.toLowerCase() === formData.material_id.toLowerCase());
        if (matByName) {
          finalMaterialId = matByName.id;
        } else {
          throw new Error('Bạn phải chọn vật tư từ Danh mục, không được tự nhập mới!');
        }
      }

      const payload = {
        ...formData,
        warehouse_id: finalWarehouseId,
        material_id: finalMaterialId,
        employee_id: user.id,
        status: 'Chờ duyệt',
        notes: isEditing ? `[SỬA] ${formData.notes}` : formData.notes
      };

      if (isEditing && selectedSlip) {
        const { error } = await supabase.from('stock_out').update(payload).eq('id', selectedSlip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stock_out').insert([payload]);
        if (error) throw error;

        // ✅ Cập nhật tồn kho (trừ SL)
        const { data: existingInv } = await supabase
          .from('inventory')
          .select('*')
          .eq('material_id', finalMaterialId)
          .eq('warehouse_id', finalWarehouseId)
          .maybeSingle();

        if (existingInv) {
          await supabase.from('inventory').update({
            quantity: Number(existingInv.quantity) - Number(formData.quantity),
            updated_at: new Date().toISOString()
          }).eq('id', existingInv.id);
        } else {
          // Fallback if not exists
          await supabase.from('inventory').insert([{
            material_id: finalMaterialId,
            warehouse_id: finalWarehouseId,
            quantity: -Number(formData.quantity),
            unit: materials.find((m: any) => m.id === finalMaterialId)?.unit || '',
            updated_at: new Date().toISOString()
          }]);
        }
      }

      setShowModal(false);
      fetchSlips();
      setFormData(initialFormState);
      setIsEditing(false);
      setSelectedSlip(null);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('stock_out').update({ status }).eq('id', id);
      if (error) throw error;
      
      if (status === 'Đã duyệt') {
        const { data: slip } = await supabase.from('stock_out').select('*, users(id)').eq('id', id).maybeSingle();
        if (slip && slip.total_amount > 0) {
          const dateObj = new Date(slip.date);
          const d = String(dateObj.getDate()).padStart(2, '0');
          const m = String(dateObj.getMonth() + 1).padStart(2, '0');
          const y = String(dateObj.getFullYear()).slice(-2);
          const random = Math.floor(1000 + Math.random() * 9000);
          const userPrefix = slip.users?.id?.slice(0, 4) || 'SYS';
          const costCode = `CP-${userPrefix.toUpperCase()}-${d}${m}${y}-${random}`;

          await supabase.from('costs').insert([{
            transaction_type: 'Thu',
            cost_code: costCode,
            date: slip.date,
            employee_id: user.id, // User who approved it
            cost_type: 'Doanh thu',
            content: `Xuất kho từ phiếu ${slip.export_code || slip.id.slice(0,8)}`,
            material_id: slip.material_id,
            warehouse_id: slip.warehouse_id,
            quantity: slip.quantity,
            unit: slip.unit,
            unit_price: slip.unit_price,
            total_amount: slip.total_amount,
            notes: 'Tự động tạo từ hệ thống Xuất Kho'
          }]);
        }
      }

      fetchSlips();
      setShowDetailModal(false);
      alert('Cập nhật trạng thái thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleRowClick = (slip: any) => {
    setSelectedSlip(slip);
    setShowDetailModal(true);
  };

  const handleEdit = () => {
    setFormData({
      date: selectedSlip.date,
      warehouse_id: selectedSlip.warehouse_id,
      material_id: selectedSlip.material_id,
      quantity: selectedSlip.quantity,
      notes: selectedSlip.notes?.replace('[SỬA] ', '') || '',
      status: 'Chờ duyệt'
    });
    setIsEditing(true);
    setShowDetailModal(false);
    setShowModal(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Xuất kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowUpCircle className="text-red-500" /> Xuất kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý phiếu xuất vật tư khỏi kho</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
        >
          <Plus size={18} /> Lập phiếu xuất
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-600 text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">SL</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : slips.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Chưa có phiếu xuất nào</td></tr>
            ) : (
              slips.map((item) => (
                <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                    <p>{item.warehouses?.name}</p>
                    <p className="text-[10px] text-gray-400">#{item.warehouses?.code}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <p>{item.materials?.name}</p>
                    <p className="text-[10px] text-gray-400">#{item.materials?.code}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-red-600 text-center font-bold">-{item.quantity}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Đã duyệt' ? 'bg-green-100 text-green-600' :
                        item.status === 'Từ chối' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                      {item.status || 'Chờ duyệt'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showDetailModal && selectedSlip && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-red-600 p-6 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg">Chi tiết phiếu xuất</h3>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ngày xuất</p>
                    <p className="text-sm font-bold text-gray-800">{formatDate(selectedSlip.date)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedSlip.status === 'Đã duyệt' ? 'bg-green-100 text-green-600' :
                        selectedSlip.status === 'Từ chối' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                      {selectedSlip.status || 'Chờ duyệt'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Kho xuất</p>
                    <p className="text-sm font-bold text-gray-800">{selectedSlip.warehouses?.name}</p>
                    <p className="text-[10px] text-gray-400">Mã: {selectedSlip.warehouses?.code || selectedSlip.warehouse_id?.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Vật tư</p>
                    <p className="text-sm font-bold text-gray-800">{selectedSlip.materials?.name}</p>
                    <p className="text-[10px] text-gray-400">Mã: {selectedSlip.materials?.code || selectedSlip.material_id?.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Số lượng</p>
                    <p className="text-sm font-bold text-red-600">-{formatNumber(selectedSlip.quantity)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Đơn giá bán</p>
                    <p className="text-sm font-medium text-gray-800">{formatCurrency(selectedSlip.unit_price || 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Thành tiền (Doanh thu)</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(selectedSlip.total_amount || 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</p>
                    <p className="text-sm text-gray-600 italic">{selectedSlip.notes || 'Không có ghi chú'}</p>
                  </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleEdit}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Edit size={18} /> Chỉnh sửa
                  </button>
                  {((user.role === 'Admin' || user.role === 'Admin App') && selectedSlip.status === 'Chờ duyệt') && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedSlip.id, 'Từ chối')}
                        className="flex-1 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors"
                      >
                        Từ chối
                      </button>
                      <button
                        onClick={() => handleApprove(selectedSlip.id, 'Đã duyệt')}
                        className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                      >
                        Duyệt phiếu
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-red-600 p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowUpCircle size={24} /></div>
                  <h3 className="font-bold text-lg">Lập phiếu xuất kho</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày xuất *</label>
                      <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-600/20" />
                    </div>

                    <CreatableSelect
                      label="Kho xuất *"
                      value={formData.warehouse_id}
                      options={warehouses}
                      onChange={(val) => setFormData({ ...formData, warehouse_id: val })}
                      onCreate={(val) => setFormData({ ...formData, warehouse_id: val })}
                      placeholder="Chọn kho..."
                      required
                    />

                    <CreatableSelect
                      label="Vật tư *"
                      value={formData.material_id}
                      options={materials}
                      onChange={(val) => setFormData({ ...formData, material_id: val })}
                      onCreateNew={() => alert('Vui lòng chọn vật tư có trong Danh mục. Để thêm vật tư mới, hãy vào mục Danh mục vật tư.')}
                      placeholder="Chọn vật tư..."
                      required
                    />

                    {availableStock !== null && (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-400 uppercase">Tồn kho hiện tại</p>
                        <p className="text-sm font-bold text-blue-600">{formatNumber(availableStock)} {materials.find(m => m.id === formData.material_id || m.name === formData.material_id)?.unit}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <NumericInput
                      label="Số lượng xuất *"
                      required
                      value={formData.quantity}
                      onChange={(val) => setFormData({ ...formData, quantity: val })}
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú / Mục đích xuất</label>
                      <textarea rows={4} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-600/20 resize-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button type="submit" disabled={submitting} className="px-8 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50">
                      {submitting ? 'Đang lưu...' : 'Lưu phiếu xuất'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Transfer = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [availableStock, setAvailableStock] = useState<number | null>(null);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    from_warehouse_id: '',
    to_warehouse_id: '',
    material_id: '',
    quantity: 0,
    notes: '',
    status: 'Chờ duyệt'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSlips();
    fetchWarehouses();
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (formData.from_warehouse_id && formData.material_id) {
      checkStock();
    } else {
      setAvailableStock(null);
    }
  }, [formData.from_warehouse_id, formData.material_id]);

  const checkStock = async () => {
    try {
      const fromWh = warehouses.find(w => w.name === formData.from_warehouse_id || w.id === formData.from_warehouse_id);
      const mat = materials.find(m => m.name === formData.material_id || m.id === formData.material_id);

      if (!fromWh?.id || !mat?.id) return;

      const [si, so, tr_out, tr_in] = await Promise.all([
        supabase.from('stock_in').select('quantity').eq('warehouse_id', fromWh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt'),
        supabase.from('stock_out').select('quantity').eq('warehouse_id', fromWh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt'),
        supabase.from('transfers').select('quantity').eq('from_warehouse_id', fromWh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt'),
        supabase.from('transfers').select('quantity').eq('to_warehouse_id', fromWh.id).eq('material_id', mat.id).eq('status', 'Đã duyệt')
      ]);

      const totalIn = (si.data || []).reduce((sum, item) => sum + item.quantity, 0) + (tr_in.data || []).reduce((sum, item) => sum + item.quantity, 0);
      const totalOut = (so.data || []).reduce((sum, item) => sum + item.quantity, 0) + (tr_out.data || []).reduce((sum, item) => sum + item.quantity, 0);

      setAvailableStock(totalIn - totalOut);
    } catch (err) {
      console.error('Error checking stock:', err);
    }
  };

  const fetchSlips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('transfers').select('*, from_wh:warehouses!from_warehouse_id(name), to_wh:warehouses!to_warehouse_id(name), materials(name, unit)').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching transfers:', error);
        const { data: fallbackData, error: fallbackError } = await supabase.from('transfers').select('*').order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        setSlips(fallbackData || []);
      } else {
        setSlips(data || []);
      }
    } catch (err: any) {
      alert('Lỗi tải phiếu luân chuyển: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').neq('status', 'Đã xóa').order('name');
    if (data) setMaterials(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (availableStock !== null && formData.quantity > availableStock) {
      alert(`Số lượng chuyển (${formData.quantity}) vượt quá tồn kho hiện tại (${availableStock})`);
      return;
    }
    setSubmitting(true);
    try {
      // Resolve from_warehouse_id
      let finalFromWhId = formData.from_warehouse_id;
      if (formData.from_warehouse_id && !isUUID(formData.from_warehouse_id)) {
        const whByName = warehouses.find(w => w.name.toLowerCase() === formData.from_warehouse_id.toLowerCase());
        if (whByName) {
          finalFromWhId = whByName.id;
        } else {
          const random = Math.floor(100 + Math.random() * 900);
          const code = `K${(warehouses.length + 1).toString().padStart(2, '0')}-${random}`;
          const { data: newWh, error: whErr } = await supabase.from('warehouses').insert([{ name: formData.from_warehouse_id, code }]).select();
          if (whErr) throw whErr;
          if (newWh) {
            finalFromWhId = newWh[0].id;
            fetchWarehouses();
          }
        }
      }

      // Resolve to_warehouse_id
      let finalToWhId = formData.to_warehouse_id;
      if (formData.to_warehouse_id && !isUUID(formData.to_warehouse_id)) {
        const whByName = warehouses.find(w => w.name.toLowerCase() === formData.to_warehouse_id.toLowerCase());
        if (whByName) {
          finalToWhId = whByName.id;
        } else {
          const random = Math.floor(100 + Math.random() * 900);
          const code = `K${(warehouses.length + 1).toString().padStart(2, '0')}-${random}`;
          const { data: newWh, error: whErr } = await supabase.from('warehouses').insert([{ name: formData.to_warehouse_id, code }]).select();
          if (whErr) throw whErr;
          if (newWh) {
            finalToWhId = newWh[0].id;
            fetchWarehouses();
          }
        }
      }

      // Resolve material_id
      let finalMaterialId = formData.material_id;
      if (formData.material_id && !isUUID(formData.material_id)) {
        const matByName = materials.find(m => m.name.toLowerCase() === formData.material_id.toLowerCase());
        if (matByName) {
          finalMaterialId = matByName.id;
        } else {
          throw new Error('Bạn phải chọn vật tư từ Danh mục, không được tự nhập mới!');
        }
      }

      const payload = {
        ...formData,
        from_warehouse_id: finalFromWhId,
        to_warehouse_id: finalToWhId,
        material_id: finalMaterialId,
        employee_id: user.id,
        status: 'Chờ duyệt',
        notes: isEditing ? `[SỬA] ${formData.notes}` : formData.notes
      };

      if (isEditing && selectedSlip) {
        const { error } = await supabase.from('transfers').update(payload).eq('id', selectedSlip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transfers').insert([payload]);
        if (error) throw error;

        // ✅ Cập nhật tồn kho
        const unit = materials.find((m: any) => m.id === finalMaterialId)?.unit || '';

        // Trừ kho nguồn
        const { data: fromInv } = await supabase.from('inventory').select('*').eq('material_id', finalMaterialId).eq('warehouse_id', finalFromWhId).maybeSingle();
        if (fromInv) {
          await supabase.from('inventory').update({ quantity: Number(fromInv.quantity) - Number(formData.quantity), updated_at: new Date().toISOString() }).eq('id', fromInv.id);
        } else {
          await supabase.from('inventory').insert([{ material_id: finalMaterialId, warehouse_id: finalFromWhId, quantity: -Number(formData.quantity), unit, updated_at: new Date().toISOString() }]);
        }

        // Cộng kho đích
        const { data: toInv } = await supabase.from('inventory').select('*').eq('material_id', finalMaterialId).eq('warehouse_id', finalToWhId).maybeSingle();
        if (toInv) {
          await supabase.from('inventory').update({ quantity: Number(toInv.quantity) + Number(formData.quantity), updated_at: new Date().toISOString() }).eq('id', toInv.id);
        } else {
          await supabase.from('inventory').insert([{ material_id: finalMaterialId, warehouse_id: finalToWhId, quantity: Number(formData.quantity), unit, updated_at: new Date().toISOString() }]);
        }
      }

      setShowModal(false);
      fetchSlips();
      setFormData(initialFormState);
      setIsEditing(false);
      setSelectedSlip(null);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (slip: any) => {
    setSelectedSlip(slip);
    setShowDetailModal(true);
  };

  const handleEdit = () => {
    setFormData({
      date: selectedSlip.date,
      from_warehouse_id: selectedSlip.from_warehouse_id,
      to_warehouse_id: selectedSlip.to_warehouse_id,
      material_id: selectedSlip.material_id,
      quantity: selectedSlip.quantity,
      notes: selectedSlip.notes?.replace('[SỬA] ', '') || '',
      status: 'Chờ duyệt'
    });
    setIsEditing(true);
    setShowDetailModal(false);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedSlip || !confirm('Bạn có chắc chắn muốn xóa phiếu này?')) return;
    try {
      const { error } = await supabase.from('transfers').update({ status: 'Đã xóa' }).eq('id', selectedSlip.id);
      if (error) throw error;
      setShowDetailModal(false);
      fetchSlips();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Luân chuyển kho" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowLeftRight className="text-orange-500" /> Luân chuyển kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Điều chuyển vật tư giữa các kho</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
        >
          <Plus size={18} /> Lập phiếu chuyển
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-orange-500 text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Từ kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Đến kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">SL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : slips.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Chưa có phiếu chuyển nào</td></tr>
            ) : (
              slips.map((item) => (
                <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <p>{item.from_wh?.name}</p>
                    <p className="text-[10px] text-gray-400">#{item.from_wh?.code}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <p>{item.to_wh?.name}</p>
                    <p className="text-[10px] text-gray-400">#{item.to_wh?.code}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                    <p>{item.materials?.name}</p>
                    <p className="text-[10px] text-gray-400">#{item.materials?.code}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-orange-600 text-center font-bold">{item.quantity}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Đã duyệt' ? 'bg-green-100 text-green-600' :
                        item.status === 'Từ chối' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                      {item.status || 'Chờ duyệt'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showDetailModal && selectedSlip && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-orange-500 p-6 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg">Chi tiết phiếu điều chuyển</h3>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ngày chuyển</p>
                    <p className="text-sm font-bold text-gray-800">{formatDate(selectedSlip.date)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedSlip.status === 'Đã duyệt' ? 'bg-green-100 text-green-600' :
                        selectedSlip.status === 'Từ chối' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                      {selectedSlip.status || 'Chờ duyệt'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Từ kho</p>
                    <p className="text-sm font-bold text-gray-800">{selectedSlip.from_wh?.name}</p>
                    <p className="text-[10px] text-gray-400">Mã: {selectedSlip.from_wh?.code || selectedSlip.from_warehouse_id?.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Đến kho</p>
                    <p className="text-sm font-bold text-gray-800">{selectedSlip.to_wh?.name}</p>
                    <p className="text-[10px] text-gray-400">Mã: {selectedSlip.to_wh?.code || selectedSlip.to_warehouse_id?.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Vật tư</p>
                    <p className="text-sm font-bold text-gray-800">{selectedSlip.materials?.name}</p>
                    <p className="text-[10px] text-gray-400">Mã: {selectedSlip.materials?.code || selectedSlip.material_id?.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Số lượng</p>
                    <p className="text-sm font-bold text-orange-600">{formatNumber(selectedSlip.quantity)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</p>
                  <p className="text-sm text-gray-600 italic">{selectedSlip.notes || 'Không có ghi chú'}</p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleEdit}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Edit size={18} /> Chỉnh sửa
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} /> Xóa phiếu
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-orange-500 p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowLeftRight size={24} /></div>
                  <h3 className="font-bold text-lg">Phiếu điều chuyển kho</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày chuyển *</label>
                      <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                    </div>

                    <CreatableSelect
                      label="Từ kho *"
                      value={formData.from_warehouse_id}
                      options={warehouses}
                      onChange={(val) => setFormData({ ...formData, from_warehouse_id: val })}
                      onCreate={(val) => setFormData({ ...formData, from_warehouse_id: val })}
                      placeholder="Chọn kho nguồn..."
                      required
                    />

                    <CreatableSelect
                      label="Đến kho *"
                      value={formData.to_warehouse_id}
                      options={warehouses}
                      onChange={(val) => setFormData({ ...formData, to_warehouse_id: val })}
                      onCreate={(val) => setFormData({ ...formData, to_warehouse_id: val })}
                      placeholder="Chọn kho đích..."
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <CreatableSelect
                      label="Vật tư điều chuyển *"
                      value={formData.material_id}
                      options={materials}
                      onChange={(val) => setFormData({ ...formData, material_id: val })}
                      onCreateNew={() => alert('Vui lòng chọn vật tư có trong Danh mục. Để thêm vật tư mới, hãy vào mục Danh mục vật tư.')}
                      placeholder="Chọn vật tư..."
                      required
                    />

                    <div className="space-y-1">
                      <NumericInput
                        label="Số lượng chuyển *"
                        required
                        value={formData.quantity}
                        onChange={(val) => setFormData({ ...formData, quantity: val })}
                        error={availableStock !== null && formData.quantity > availableStock}
                      />
                      {availableStock !== null && (
                        <div className={`text-[10px] font-bold mt-1 ${availableStock <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                          Tồn kho hiện tại: {formatNumber(availableStock)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                      <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                    <button type="submit" disabled={submitting} className="px-8 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50">
                      {submitting ? 'Đang lưu...' : 'Lưu phiếu chuyển'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InventoryReport = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa').order('name');
    if (data) setWarehouses(data);
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data: materials } = await supabase.from('materials').select('*').neq('status', 'Đã xóa').order('name');
      const { data: whs } = await supabase.from('warehouses').select('*').order('name');
      const { data: inventory } = await supabase.from('inventory').select('*');

      if (!materials || !whs || !inventory) return;

      const reportData = materials.map(mat => {
        const matInventory = inventory.filter(i => i.material_id === mat.id);
        const balance = matInventory.reduce((sum, i) => sum + (i.quantity || 0), 0);
        const breakdown = matInventory.map(i => ({
          whName: whs.find(w => w.id === i.warehouse_id)?.name || 'N/A',
          balance: i.quantity
        })).filter(b => b.balance !== 0);

        if (selectedWarehouse) {
          const whInv = matInventory.find(i => i.warehouse_id === selectedWarehouse);
          const whQty = whInv?.quantity || 0;
          return {
            ...mat,
            totalIn: 0,
            totalOut: 0,
            balance: whQty,
            breakdown: whQty !== 0 ? [{ whName: whs.find(w => w.id === selectedWarehouse)?.name, balance: whQty }] : []
          };
        }

        return {
          ...mat,
          totalIn: 0, // Note: totalIn/Out are not tracked in inventory table
          totalOut: 0,
          balance,
          breakdown
        };
      }).filter(item => item.balance !== 0);

      // Group by material name to handle duplicates if any
      const groupedReport: any[] = [];
      reportData.forEach(item => {
        const existing = groupedReport.find(g => g.name.toLowerCase().trim() === item.name.toLowerCase().trim() && g.unit === item.unit);
        if (existing) {
          existing.balance += item.balance;
          item.breakdown.forEach((b: any) => {
            const exWh = existing.breakdown.find((eb: any) => eb.whName === b.whName);
            if (exWh) exWh.balance += b.balance;
            else existing.breakdown.push(b);
          });
        } else {
          groupedReport.push({ ...item });
        }
      });

      setReport(groupedReport);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Kiểm tra tồn kho" onBack={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-primary" /> Kiểm tra tồn kho
          </h2>
          <p className="text-xs text-gray-500 mt-1">Xem chi tiết vật tư theo từng kho</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-full md:w-64">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tất cả các kho</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-bottom border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Vật tư / Phân bổ kho</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">ĐVT</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Tổng nhập</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Tổng xuất</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Tồn kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">Đang tải...</td></tr>
                ) : report.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">Không có dữ liệu</td></tr>
                ) : (
                  report.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors align-top">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.code && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">#{item.code}</span>}
                          <div className="text-sm font-bold text-gray-800">{item.name}</div>
                        </div>
                        <div className="mt-2 space-y-1">
                          {item.breakdown.map((b: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-[10px]">
                              <span className="text-gray-400">{b.whName}:</span>
                              <span className="font-bold text-primary">{formatNumber(b.balance)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-500">{item.unit}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-blue-600">+{formatNumber(item.totalIn)}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-orange-600">-{formatNumber(item.totalOut)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        <span className={`px-2 py-1 rounded-lg ${item.balance <= 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {formatNumber(item.balance)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeletedMaterials = ({ onBack }: { onBack: () => void }) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedMaterials();
  }, []);

  const fetchDeletedMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('materials').select('*, material_groups(name)').eq('status', 'Đã xóa');
      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error('Error fetching deleted materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Bạn có muốn khôi phục vật tư này?')) return;
    try {
      const { error } = await supabase.from('materials').update({ status: 'Đang sử dụng' }).eq('id', id);
      if (error) throw error;
      fetchDeletedMaterials();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Vật tư đã xóa" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-red-500" /> Danh sách vật tư đã xóa
          </h2>
          <p className="text-xs text-gray-500 mt-1">Vật tư trong thùng rác có thể được khôi phục</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mã vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Tên vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Nhóm</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">ĐVT</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : materials.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Thùng rác trống</td></tr>
            ) : (
              materials.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{item.code || item.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs text-gray-800 font-bold">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.material_groups?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      title="Khôi phục"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DeletedWarehouses = ({ onBack }: { onBack: () => void }) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedWarehouses();
  }, []);

  const fetchDeletedWarehouses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('warehouses').select('*, users!manager_id(full_name)').eq('status', 'Đã xóa');
      if (error) throw error;
      setWarehouses(data || []);
    } catch (err) {
      console.error('Error fetching deleted warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Bạn có muốn khôi phục kho này?')) return;
    try {
      const { error } = await supabase.from('warehouses').update({ status: 'Đang hoạt động' }).eq('id', id);
      if (error) throw error;
      fetchDeletedWarehouses();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Kho đã xóa" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Warehouse className="text-orange-500" /> Danh sách kho đã xóa
          </h2>
          <p className="text-xs text-gray-500 mt-1">Kho trong thùng rác có thể được khôi phục</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mã kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Tên kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Địa chỉ</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Quản lý</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : warehouses.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Thùng rác trống</td></tr>
            ) : (
              warehouses.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{item.code || item.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs text-gray-800 font-bold">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.address}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.users?.full_name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      title="Khôi phục"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DeletedSlips = ({ onBack }: { onBack: () => void }) => {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedSlips();
  }, []);

  const fetchDeletedSlips = async () => {
    setLoading(true);
    try {
      const [si, so, tr] = await Promise.all([
        supabase.from('stock_in').select('*, warehouses(name), materials(name)').eq('status', 'Đã xóa'),
        supabase.from('stock_out').select('*, warehouses(name), materials(name)').eq('status', 'Đã xóa'),
        supabase.from('transfers').select('*, from_wh:warehouses!from_warehouse_id(name), to_wh:warehouses!to_warehouse_id(name), materials(name)').eq('status', 'Đã xóa')
      ]);

      const allDeleted = [
        ...(si.data || []).map(s => ({ ...s, type: 'Nhập kho', table: 'stock_in' })),
        ...(so.data || []).map(s => ({ ...s, type: 'Xuất kho', table: 'stock_out' })),
        ...(tr.data || []).map(s => ({ ...s, type: 'Luân chuyển', table: 'transfers' }))
      ].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

      setSlips(allDeleted);
    } catch (err) {
      console.error('Error fetching deleted slips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string, table: string) => {
    if (!confirm('Bạn có muốn khôi phục phiếu này về trạng thái Chờ duyệt?')) return;
    try {
      const { error } = await supabase.from(table).update({ status: 'Chờ duyệt' }).eq('id', id);
      if (error) throw error;
      fetchDeletedSlips();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Phiếu đã xóa" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Archive className="text-blue-500" /> Phiếu nhập xuất đã xóa
          </h2>
          <p className="text-xs text-gray-500 mt-1">Danh sách các phiếu đã đưa vào thùng rác</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Loại</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Ngày</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Kho</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Vật tư</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">SL</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Đang tải...</td></tr>
            ) : slips.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Thùng rác trống</td></tr>
            ) : (
              slips.map((item) => (
                <tr key={`${item.table}-${item.id}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.type === 'Nhập kho' ? 'bg-blue-100 text-blue-600' :
                        item.type === 'Xuất kho' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {item.type === 'Luân chuyển' ? `${item.from_wh?.name} → ${item.to_wh?.name}` : item.warehouses?.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-800 font-medium">{item.materials?.name}</td>
                  <td className="px-4 py-3 text-xs text-center font-bold text-gray-700">{formatNumber(item.quantity)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore(item.id, item.table)}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      title="Khôi phục"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BottomNav = ({ currentPage, onNavigate, user, pendingCount }: { currentPage: string, onNavigate: (page: string) => void, user: Employee, pendingCount: number }) => {
  const navItems = (user.role === 'Admin' || user.role === 'Admin App')
    ? [
      { id: 'dashboard', label: 'Trang chủ', icon: Home },
      { id: 'pending-approvals', label: 'Phiếu duyệt', icon: ClipboardCheck, badge: pendingCount },
      { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
      { id: 'hr-records', label: 'Nhân sự', icon: UserCircle },
    ]
    : [
      { id: 'dashboard', label: 'Trang chủ', icon: Home },
      { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownCircle },
      { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle },
      { id: 'transfer', label: 'Luân chuyển', icon: ArrowLeftRight },
      { id: 'cost-report', label: 'Báo cáo chi phí', icon: FileText },
    ];

  return (
    <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/90 backdrop-blur-md border border-gray-100 flex items-center justify-around py-2 px-2 z-40 shadow-[0_8px_25px_rgba(0,0,0,0.1)] rounded-full">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex flex-col items-center gap-0.5 flex-1 transition-all relative ${currentPage === item.id ? 'text-primary scale-105' : 'text-gray-400'
            }`}
        >
          <item.icon size={20} className={currentPage === item.id ? 'text-primary' : 'text-gray-400'} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -top-1.5 right-1/4 bg-red-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 border-2 border-white animate-bounce">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// --- Main App ---

const WEATHER_OPTIONS = [
  { value: 'sunny', label: '☀️ Nắng nóng gay gắt' },
  { value: 'sudden-rain', label: '⛈️ Mưa rào đột ngột' },
  { value: 'cloudy', label: '☁️ Trời âm u, oi bức' },
  { value: 'long-rain', label: '🌧️ Mưa dầm kéo dài' },
  { value: 'strong-wind', label: '💨 Gió giật mạnh trong cơn dông' },
  { value: 'thunderstorm', label: '🌩️ Sấm chớp dữ dội' },
  { value: 'flood', label: '🌊 Ngập lụt cục bộ' },
  { value: 'cool', label: '🌬️ Trời se lạnh vào sáng sớm' },
  { value: 'smog', label: '🌫️ Sương mù quang hóa' },
  { value: 'pleasant', label: '🌤️ Trời trong xanh, nắng dịu' },
];

const Notes = ({ user, onBack }: { user: Employee, onBack: () => void }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    employee: '',
    warehouse: '',
    search: ''
  });

  const [formData, setFormData] = useState({
    content: '',
    date: new Date().toISOString().split('T')[0],
    weather: '',
    related_object: '',
    object_code: '',
    note_code: '',
    location: '',
    related_personnel: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: notesData } = await supabase.from('notes').select('*, users(full_name)').order('created_at', { ascending: false });
    if (notesData) setNotes(notesData);

    let empQuery = supabase.from('users').select('*').neq('status', 'Nghỉ việc');
    if (user.role !== 'Admin App') {
      empQuery = empQuery.neq('role', 'Admin App');
    }
    const { data: empData } = await empQuery.order('full_name');
    if (empData) setEmployees(empData);

    const { data: whData } = await supabase.from('warehouses').select('*').order('name');
    if (whData) setWarehouses(whData);
    setLoading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase.from('notes').insert([{
      ...formData,
      created_by: user.id
    }]);
    if (!error) {
      setShowQuickNote(false);
      setShowAddNew(false);
      setFormData({
        content: '',
        date: new Date().toISOString().split('T')[0],
        weather: '',
        related_object: '',
        object_code: '',
        note_code: '',
        location: '',
        related_personnel: []
      });
      fetchData();
    }
  };

  const filteredNotes = notes.filter(n => {
    if (filters.fromDate && n.date < filters.fromDate) return false;
    if (filters.toDate && n.date > filters.toDate) return false;
    if (filters.employee && n.created_by !== filters.employee) return false;
    if (filters.search && !n.content.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Nhật ký / Ghi chú" onBack={onBack} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickNote(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
          >
            <FileText size={18} /> Ghi chú nhanh
          </button>
          <button
            onClick={() => setShowAddNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Plus size={18} /> Thêm mới
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={e => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự</label>
            <select
              value={filters.employee}
              onChange={e => setFilters({ ...filters, employee: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
            >
              <option value="">-- Tất cả --</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
            <select
              value={filters.warehouse}
              onChange={e => setFilters({ ...filters, warehouse: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
            >
              <option value="">-- Tất cả kho --</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Gõ để tìm..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-primary/5">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
            <FileText size={18} /> Bảng ghi chú tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Đối tượng liên quan</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Mã đối tượng</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Mã ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Vị trí / Tọa độ</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredNotes.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Không có ghi chú nào</td></tr>
              ) : filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-700">{note.related_object || 'N/A'}</p>
                    <p className="text-[10px] text-gray-400">{note.content}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{note.object_code || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{note.note_code || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{note.location || '0.000000, 0.000000'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                      <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Note Modal */}
      <AnimatePresence>
        {showQuickNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQuickNote(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-amber-50">
                <h3 className="text-lg font-bold text-amber-700 flex items-center gap-2 uppercase tracking-wide">
                  <FileText size={20} /> Ghi chú nhanh
                </h3>
                <button onClick={() => setShowQuickNote(false)} className="p-2 hover:bg-amber-100 rounded-full transition-colors"><X size={20} className="text-amber-700" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung <span className="text-red-500">*</span></label>
                  <textarea
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[100px]"
                    placeholder="Nhập nội dung ghi chú..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Thời tiết</label>
                    <select
                      value={formData.weather}
                      onChange={e => setFormData({ ...formData, weather: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                    >
                      <option value="">-- Chọn --</option>
                      {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đối tượng liên quan</label>
                  <input
                    type="text"
                    placeholder="VD: Chuẩn bị vật tư..."
                    value={formData.related_object}
                    onChange={e => setFormData({ ...formData, related_object: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự liên quan</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto p-2 border border-gray-100 rounded-xl">
                    {employees.map(emp => (
                      <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.related_personnel.includes(emp.id)}
                          onChange={e => {
                            const newPersonnel = e.target.checked
                              ? [...formData.related_personnel, emp.id]
                              : formData.related_personnel.filter(id => id !== emp.id);
                            setFormData({ ...formData, related_personnel: newPersonnel });
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-gray-600 truncate">{emp.full_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Lưu ghi chú
                </button>
                <button onClick={() => setShowQuickNote(false)} className="px-6 py-3 bg-gray-400 text-white rounded-xl font-bold text-sm hover:bg-gray-500 transition-all">Hủy</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Modal */}
      <AnimatePresence>
        {showAddNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddNew(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden relative z-10">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-primary">
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">Thêm Mới</h3>
                <button onClick={() => setShowAddNew(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-white" /></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Đối tượng liên quan</label>
                    <input type="text" value={formData.related_object} onChange={e => setFormData({ ...formData, related_object: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã ghi chú</label>
                    <input type="text" value={formData.note_code} onChange={e => setFormData({ ...formData, note_code: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày tạo</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung</label>
                    <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[80px]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Thời tiết</label>
                    <select value={formData.weather} onChange={e => setFormData({ ...formData, weather: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                      <option value="">-- Chọn --</option>
                      {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã đối tượng</label>
                    <input type="text" value={formData.object_code} onChange={e => setFormData({ ...formData, object_code: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Vị trí / Tọa độ</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" placeholder="0.000000, 0.000000" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Người tạo</label>
                    <input type="text" value={user.full_name} disabled className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung</label>
                    <textarea className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[80px]" placeholder="Ghi chú thêm..." />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setShowAddNew(false)} className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition-all">Hủy bỏ</button>
                <button onClick={handleSave} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">Lưu dữ liệu</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Reminders = ({ user, onBack }: { user: Employee, onBack: () => void }) => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetReminder, setShowSetReminder] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    employee: '',
    search: ''
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    reminder_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    browser_notification: true,
    reminder_code: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: remData } = await supabase.from('reminders').select('*, users(full_name)').order('reminder_time', { ascending: false });
    if (remData) setReminders(remData);

    let empQuery = supabase.from('users').select('*').neq('status', 'Nghỉ việc');
    if (user.role !== 'Admin App') {
      empQuery = empQuery.neq('role', 'Admin App');
    }
    const { data: empData } = await empQuery.order('full_name');
    if (empData) setEmployees(empData);
    setLoading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase.from('reminders').insert([{
      ...formData,
      created_by: user.id,
      status: 'pending'
    }]);
    if (!error) {
      setShowSetReminder(false);
      setShowAddNew(false);
      setFormData({
        title: '',
        content: '',
        reminder_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        browser_notification: true,
        reminder_code: ''
      });
      fetchData();
    }
  };

  const filteredReminders = reminders.filter(r => {
    if (filters.fromDate && r.reminder_time < filters.fromDate) return false;
    if (filters.toDate && r.reminder_time > filters.toDate) return false;
    if (filters.employee && r.created_by !== filters.employee) return false;
    if (filters.search && !r.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Thiết lập Lịch nhắc" onBack={onBack} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSetReminder(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <Bell size={18} /> Đặt lịch nhắc
          </button>
          <button
            onClick={() => setShowAddNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Plus size={18} /> Thêm mới
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
            <input type="date" value={filters.fromDate} onChange={e => setFilters({ ...filters, fromDate: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
            <input type="date" value={filters.toDate} onChange={e => setFilters({ ...filters, toDate: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Nhân sự</label>
            <select value={filters.employee} onChange={e => setFilters({ ...filters, employee: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1">
              <option value="">-- Tất cả --</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Kho</label>
            <select className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1">
              <option value="">-- Tất cả kho --</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Tìm kiếm nhanh</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Gõ để tìm..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-primary/5">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
            <Bell size={18} /> Danh sách lịch nhắc tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Đã nhắc (Trạng thái)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Mã nhắc nhở</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Thời gian nhắc</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Người nhắc</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Nội dung</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Tiêu đề</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
              ) : filteredReminders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">Không có lịch nhắc nào</td></tr>
              ) : filteredReminders.map((rem) => (
                <tr key={rem.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${rem.status === 'reminded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {rem.status === 'reminded' ? 'Đã nhắc' : 'Chờ nhắc'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{rem.reminder_code || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(rem.reminder_time).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rem.users?.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{rem.content}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{rem.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                      <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set Reminder Modal */}
      <AnimatePresence>
        {showSetReminder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSetReminder(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
                  <Bell size={20} /> Đặt lịch nhắc
                </h3>
                <button onClick={() => setShowSetReminder(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tiêu đề <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="VD: Họp giao ban sáng..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung chi tiết</label>
                  <textarea
                    placeholder="Mô tả thêm..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Thời gian nhắc <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={formData.reminder_time}
                    onChange={e => setFormData({ ...formData, reminder_time: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <input
                    type="checkbox"
                    id="notify"
                    checked={formData.browser_notification}
                    onChange={e => setFormData({ ...formData, browser_notification: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="notify" className="text-sm text-gray-700 font-medium cursor-pointer">Nhắc qua thông báo trình duyệt</label>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Bell size={18} /> Đặt nhắc
                </button>
                <button onClick={() => setShowSetReminder(false)} className="px-6 py-3 bg-gray-400 text-white rounded-xl font-bold text-sm hover:bg-gray-500 transition-all">Hủy</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Modal */}
      <AnimatePresence>
        {showAddNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddNew(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden relative z-10">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-primary">
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">Thêm Mới</h3>
                <button onClick={() => setShowAddNew(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-white" /></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Đã nhắc (Trạng thái)</label>
                    <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Thời gian nhắc</label>
                    <input type="date" className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nội dung</label>
                    <textarea className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1 min-h-[80px]" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mã nhắc nhở</label>
                    <input type="text" value={formData.reminder_code} onChange={e => setFormData({ ...formData, reminder_code: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Người nhắc</label>
                    <input type="text" value={user.full_name} disabled className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tiêu đề</label>
                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none mt-1" />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setShowAddNew(false)} className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition-all">Hủy bỏ</button>
                <button onClick={handleSave} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">Lưu dữ liệu</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BACKUP_TABLES = [
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

const Backup = ({ onBack }: { onBack: () => void }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('backup_email') || '');
  const [frequency, setFrequency] = useState('Thủ công (không tự động)');
  const [time, setTime] = useState('06:00');
  const [selectedTables, setSelectedTables] = useState<string[]>(BACKUP_TABLES.map(t => t.id));
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');

  // SMTP Config
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

const BackupNow = ({ onBack }: { onBack: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFullBackup = async () => {
    setLoading(true);
    setStatus('Đang chuẩn bị dữ liệu...');

    try {
      const workbook = utils.book_new();

      for (const table of BACKUP_TABLES) {
        setStatus(`Đang tải bảng: ${table.label}...`);
        const { data, error } = await supabase.from(table.id).select('*');
        if (error) {
          console.error(`Error fetching ${table.id}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          const worksheet = utils.json_to_sheet(data);
          utils.book_append_sheet(workbook, worksheet, table.label.substring(0, 31));
        }
      }

      setStatus('Đang tạo file Excel...');
      const fileName = `CDX_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;

      const email = localStorage.getItem('backup_email');
      const smtpRaw = localStorage.getItem('smtp_config');
      const smtpConfig = smtpRaw ? JSON.parse(smtpRaw) : null;

      if (email && smtpConfig && smtpConfig.user && smtpConfig.pass) {
        setStatus(`Đang gửi email tới ${email}...`);
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

      writeFile(workbook, fileName);

      setStatus('Hoàn tất!');
      alert('Sao lưu toàn bộ dữ liệu thành công!' + (email ? ` Đã gửi tới email ${email}.` : ''));
    } catch (err: any) {
      console.error('Backup error:', err);
      alert('Đã xảy ra lỗi khi sao lưu dữ liệu: ' + err.message);
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
            className="flex-1 bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-hover transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-900/20 disabled:opacity-50"
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

const DatabaseSetup = ({ onBack }: { onBack: () => void }) => {
  const sqlSchema = `-- SQL Schema for CDX Warehouse Management
-- Updated: 2026-03-12

-- 1. Users table (Employees)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_card TEXT,
  dob DATE,
  join_date DATE DEFAULT CURRENT_DATE,
  tax_id TEXT,
  app_pass TEXT NOT NULL,
  department TEXT,
  position TEXT,
  has_salary BOOLEAN DEFAULT false,
  role TEXT NOT NULL DEFAULT 'User',
  data_view_permission TEXT,
  avatar_url TEXT,
  resign_date DATE,
  initial_budget NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Đang làm việc',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Material Groups table
CREATE TABLE IF NOT EXISTS material_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  group_id UUID REFERENCES material_groups(id),
  warehouse_id UUID, -- Optional: default warehouse
  specification TEXT,
  unit TEXT,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'Đang sử dụng',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  manager_id UUID REFERENCES users(id),
  coordinates TEXT,
  notes TEXT,
  capacity TEXT,
  status TEXT DEFAULT 'Đang hoạt động',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Stock In table
CREATE TABLE IF NOT EXISTS stock_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_code TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id),
  material_id UUID REFERENCES materials(id),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  unit TEXT,
  notes TEXT,
  employee_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'Chờ duyệt',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Stock Out table
CREATE TABLE IF NOT EXISTS stock_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_code TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id),
  material_id UUID REFERENCES materials(id),
  quantity NUMERIC NOT NULL,
  notes TEXT,
  employee_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'Chờ duyệt',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  from_warehouse_id UUID REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  material_id UUID REFERENCES materials(id),
  quantity NUMERIC NOT NULL,
  notes TEXT,
  employee_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'Chờ duyệt',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Costs table
CREATE TABLE IF NOT EXISTS costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_code TEXT UNIQUE,
  date DATE NOT NULL,
  employee_id UUID REFERENCES users(id),
  cost_type TEXT,
  content TEXT,
  warehouse_id UUID REFERENCES warehouses(id),
  material_id UUID REFERENCES materials(id),
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  notes TEXT,
  cost_category TEXT DEFAULT 'Chi phí',
  stock_status TEXT DEFAULT 'Chưa nhập',
  status TEXT DEFAULT 'Chờ duyệt',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- 10. Advances table
CREATE TABLE IF NOT EXISTS advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'Chờ duyệt',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  reminder_time TIMESTAMPTZ NOT NULL,
  browser_notification BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather TEXT,
  related_object TEXT,
  object_code TEXT,
  note_code TEXT,
  location TEXT,
  related_personnel JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Inventory table (Real-time balance)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES warehouses(id),
  material_id UUID REFERENCES materials(id),
  quantity NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(warehouse_id, material_id)
);

-- 14. Salary Settings table
CREATE TABLE IF NOT EXISTS salary_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES users(id) UNIQUE,
  base_salary NUMERIC DEFAULT 0,
  daily_rate NUMERIC DEFAULT 0,
  insurance_deduction NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Partners table (Customers & Suppliers)
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT, -- 'Khách hàng', 'Nhà cung cấp', 'Cả hai'
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Hoạt động',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Allowances table
CREATE TABLE IF NOT EXISTS allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'Phụ cấp', 'Thưởng', 'Khác'
  notes TEXT,
  status TEXT DEFAULT 'Chờ duyệt',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ==========================================

-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowances ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Users Table Policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id OR get_user_role() IN ('Admin', 'Admin App'));
CREATE POLICY "Admins can manage users" ON users FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 2. Material Groups Policies
CREATE POLICY "Everyone can view material groups" ON material_groups FOR SELECT USING (true);
CREATE POLICY "Admins can manage material groups" ON material_groups FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 3. Materials Policies
CREATE POLICY "Everyone can view materials" ON materials FOR SELECT USING (true);
CREATE POLICY "Admins can manage materials" ON materials FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 4. Warehouses Policies
CREATE POLICY "Everyone can view warehouses" ON warehouses FOR SELECT USING (true);
CREATE POLICY "Admins can manage warehouses" ON warehouses FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 5. Stock In Policies
CREATE POLICY "Users can view stock in" ON stock_in FOR SELECT USING (true);
CREATE POLICY "Users can create stock in" ON stock_in FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage stock in" ON stock_in FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 6. Stock Out Policies
CREATE POLICY "Users can view stock out" ON stock_out FOR SELECT USING (true);
CREATE POLICY "Users can create stock out" ON stock_out FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage stock out" ON stock_out FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 7. Transfers Policies
CREATE POLICY "Users can view transfers" ON transfers FOR SELECT USING (true);
CREATE POLICY "Users can create transfers" ON transfers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage transfers" ON transfers FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 8. Costs Policies
CREATE POLICY "Users can view costs" ON costs FOR SELECT USING (true);
CREATE POLICY "Users can create costs" ON costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage costs" ON costs FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 9. Attendance Policies
CREATE POLICY "Users can view attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Admins can manage attendance" ON attendance FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 10. Advances Policies
CREATE POLICY "Users can view their own advances" ON advances FOR SELECT USING (auth.uid() = employee_id OR get_user_role() IN ('Admin', 'Admin App'));
CREATE POLICY "Admins can manage advances" ON advances FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 11. Reminders Policies
CREATE POLICY "Users can manage their own reminders" ON reminders FOR ALL USING (true); -- Simplified for now

-- 12. Notes Policies
CREATE POLICY "Users can view notes" ON notes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own notes" ON notes FOR ALL USING (auth.uid() = created_by OR get_user_role() IN ('Admin', 'Admin App'));

-- 13. Inventory Policies
CREATE POLICY "Everyone can view inventory" ON inventory FOR SELECT USING (true);
CREATE POLICY "System can manage inventory" ON inventory FOR ALL USING (true); -- Usually managed via triggers or app logic

-- 14. Salary Settings Policies
CREATE POLICY "Users can view their own salary settings" ON salary_settings FOR SELECT USING (auth.uid() = employee_id OR get_user_role() IN ('Admin', 'Admin App'));
CREATE POLICY "Admins can manage salary settings" ON salary_settings FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 15. Partners Policies
CREATE POLICY "Everyone can view partners" ON partners FOR SELECT USING (true);
CREATE POLICY "Admins can manage partners" ON partners FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));

-- 16. Allowances Policies
CREATE POLICY "Users can view their own allowances" ON allowances FOR SELECT USING (auth.uid() = employee_id OR get_user_role() IN ('Admin', 'Admin App'));
CREATE POLICY "Admins can manage allowances" ON allowances FOR ALL USING (get_user_role() IN ('Admin', 'Admin App'));
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    alert('Đã sao chép SQL vào bộ nhớ tạm!');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Cấu hình Database" onBack={onBack} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">SQL Schema cho Supabase</h3>
            <p className="text-xs text-gray-500 mt-1">Sử dụng mã SQL này trong Supabase SQL Editor để khởi tạo các bảng.</p>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
          >
            <ClipboardCheck size={18} /> Sao chép SQL
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
            <pre className="text-green-400 text-xs font-mono leading-relaxed">
              {sqlSchema}
            </pre>
          </div>

          <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
            <div className="flex gap-4">
              <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 h-fit">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-amber-900">Lưu ý quan trọng về RLS</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Mặc định Supabase bật <b>Row Level Security (RLS)</b>. Nếu bạn không thêm các Policy để cho phép <b>INSERT/SELECT/UPDATE</b>, ứng dụng sẽ không thể nhập dữ liệu.
                </p>
                <p className="text-xs text-amber-800 leading-relaxed font-bold">
                  Để thử nghiệm nhanh, bạn có thể tắt RLS cho từng bảng trong Supabase Dashboard (không khuyến khích cho sản xuất).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [reminders, setReminders] = useState<any[]>([]);

  // Browser Notification Logic
  useEffect(() => {
    if (user && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkReminders = setInterval(async () => {
      if (!user) return;
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('reminders')
        .select('*')
        .eq('status', 'pending')
        .lte('reminder_time', now);

      if (data && data.length > 0) {
        data.forEach(async (rem) => {
          if (rem.browser_notification && Notification.permission === "granted") {
            new Notification(rem.title, { body: rem.content });
          }
          await supabase.from('reminders').update({ status: 'reminded' }).eq('id', rem.id);
        });
        // Refresh if on reminders page
        if (currentPage === 'reminders') {
          setRefreshKey(prev => prev + 1);
        }
      }
    }, 30000);

    return () => clearInterval(checkReminders);
  }, [user, currentPage]);
  const [pageParams, setPageParams] = useState<any>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const [si, so, tr] = await Promise.all([
        supabase.from('stock_in').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
        supabase.from('stock_out').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
        supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt')
      ]);
      setPendingCount((si.count || 0) + (so.count || 0) + (tr.count || 0));
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [user, fetchPendingCount]);

  const navigateTo = (page: string, params: any = null) => {
    if (page !== currentPage || params !== pageParams) {
      setNavigationHistory(prev => [...prev, currentPage]);
      setCurrentPage(page);
      setPageParams(params);
    }
  };

  const goBack = () => {
    if (navigationHistory.length > 0) {
      const prevPage = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentPage(prevPage);
    } else {
      setCurrentPage('dashboard');
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const menuGroups = [
    {
      title: 'QUẢN LÝ TÀI CHÍNH',
      items: [
        { id: 'costs', label: 'Chi phí', icon: Wallet },
        { id: 'cost-report', label: 'Báo cáo chi phí', icon: FileText },
        { id: 'pending-approvals', label: 'Phiếu duyệt', icon: ClipboardCheck, badge: pendingCount },
        { id: 'cost-filter', label: 'Lọc chi phí', icon: Filter },
      ]
    },
    {
      title: 'QUẢN LÝ KHO',
      items: [
        { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownCircle },
        { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle },
        { id: 'transfer', label: 'Luân chuyển kho', icon: ArrowLeftRight },
        { id: 'inventory-report', label: 'Kiểm tra tồn kho', icon: BarChart3 },
        { id: 'warehouses', label: 'Danh sách kho', icon: Warehouse },
        { id: 'material-groups', label: 'Nhóm vật tư', icon: Layers },
        { id: 'materials', label: 'Danh mục vật tư', icon: Package },
        { id: 'database-setup', label: 'Cấu hình Database', icon: Settings2 },
      ]
    },
    {
      title: 'TIỀN LƯƠNG',
      items: [
        { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
        { id: 'advances', label: 'Tạm ứng & phụ cấp', icon: Banknote },
        { id: 'payroll', label: 'Tổng hợp lương/tháng', icon: Wallet },
        { id: 'salary-settings', label: 'Cài đặt lương', icon: Settings2 },
      ]
    },
    {
      title: 'ĐỐI TÁC',
      items: [
        { id: 'partners', label: 'Khách hàng & nhà cung cấp', icon: Handshake },
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { id: 'hr-records', label: 'Quản lý nhân sự', icon: UserCircle },
        { id: 'notes', label: 'Nhật ký / Ghi chú', icon: FileText },
        { id: 'notifications', label: 'Thông báo', icon: BellRing },
        { id: 'reminders', label: 'Thiết lập Lịch nhắc', icon: Bell },
        { id: 'trash', label: 'Thùng rác', icon: Trash2 },
      ]
    },
    {
      title: 'CÔNG CỤ',
      items: [
        { id: 'backup-settings', label: 'Backup', icon: Settings },
        { id: 'backup-now', label: 'Sao lưu ngay', icon: Download },
      ]
    }
  ];

  const filteredMenuGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (user.role === 'User') {
        const allowed = ['stock-in', 'stock-out', 'transfer', 'attendance', 'cost-report'];
        return allowed.includes(item.id);
      }
      if (user.role !== 'Admin App') {
        const adminOnly = ['database-setup', 'backup-now', 'backup-settings', 'salary-settings'];
        return !adminOnly.includes(item.id);
      }
      return true;
    }).map(item => item.id === 'pending-approvals' ? { ...item, badge: pendingCount } : item)
  })).filter(group => group.items.length > 0);

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} onNavigate={navigateTo} />;
      case 'hr-records': return <HRRecords user={user} onBack={goBack} />;
      case 'attendance': return <Attendance user={user} onBack={goBack} />;
      case 'costs': return <Costs user={user} onBack={goBack} />;
      case 'warehouses': return <Warehouses user={user} onBack={goBack} />;
      case 'materials': return <Materials user={user} onBack={goBack} onNavigate={navigateTo} />;
      case 'stock-in': return <StockIn user={user} onBack={goBack} initialStatus={pageParams?.status} />;
      case 'pending-approvals': return <PendingApprovals user={user} onBack={goBack} onNavigate={navigateTo} onRefreshCount={fetchPendingCount} />;
      case 'stock-out': return <StockOut user={user} onBack={goBack} />;
      case 'transfer': return <Transfer user={user} onBack={goBack} />;
      case 'cost-report': return <CostReport user={user} onBack={goBack} />;
      case 'cost-filter': return <CostFilter user={user} onBack={goBack} />;
      case 'advances': return <Advances user={user} onBack={goBack} />;
      case 'payroll': return <MonthlySalary user={user} onBack={goBack} />;
      case 'salary-settings': return <SalarySettings user={user} onBack={goBack} />;
      case 'notes': return <Notes user={user} onBack={goBack} />;
      case 'notifications': return <Reminders user={user} onBack={goBack} />;
      case 'reminders': return <Reminders user={user} onBack={goBack} />;
      case 'partners': return <Placeholder title="Khách hàng & nhà cung cấp" onBack={goBack} />;
      case 'inventory-report': return <InventoryReport user={user} onBack={goBack} />;
      case 'trash': return <Trash onNavigate={navigateTo} onBack={goBack} />;
      case 'deleted-materials': return <DeletedMaterials onBack={goBack} />;
      case 'deleted-warehouses': return <DeletedWarehouses onBack={goBack} />;
      case 'deleted-slips': return <DeletedSlips onBack={goBack} />;
      case 'material-groups': return <MaterialGroups user={user} onBack={goBack} />;
      case 'backup-settings':
        if (user.role !== 'Admin App') return <Dashboard user={user} onNavigate={navigateTo} />;
        return <Backup onBack={goBack} />;
      case 'backup-now':
        if (user.role !== 'Admin App') return <Dashboard user={user} onNavigate={navigateTo} />;
        return <BackupNow onBack={goBack} />;
      case 'database-setup':
        if (user.role !== 'Admin App') return <Dashboard user={user} onNavigate={navigateTo} />;
        return <DatabaseSetup onBack={goBack} />;
      default: return (
        <div className="p-4 md:p-6 space-y-6">
          <PageBreadcrumb title={currentPage} onBack={goBack} />
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-4 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="p-6 bg-gray-100 rounded-full"><Package size={48} /></div>
            <p className="text-lg font-medium italic">Tính năng "{currentPage}" đang được phát triển...</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-primary text-white h-14 flex items-center justify-between px-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 hover:bg-white/10 p-1.5 rounded-xl transition-all active:scale-95"
          >
            <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center p-1 shadow-sm">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="font-bold text-sm tracking-wide hidden sm:block">QUẢN LÝ KHO CDX</h1>
          </button>

          <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" />

          <button
            onClick={() => navigateTo('dashboard')}
            className="hover:bg-white/10 p-2 rounded-xl transition-colors flex items-center gap-2 group"
            title="Về trang chủ"
          >
            <Home size={20} className="group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={() => {
              fetchPendingCount();
              setRefreshKey(prev => prev + 1);
            }}
            className="hover:bg-white/10 p-2 rounded-xl transition-colors flex items-center gap-2 group"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative">
          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 bg-white/10 px-2 sm:px-3 py-1 rounded-full border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <UserIcon size={14} />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] sm:text-xs font-semibold truncate max-w-[80px] sm:max-w-none">{user.full_name}</span>
              <span className="text-[8px] opacity-70 hidden xs:block">{user.role}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </div>

          <AnimatePresence>
            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 text-gray-800"
                >
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tài khoản</p>
                    <p className="text-sm font-bold text-gray-800">{user.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{user.code || user.id.slice(0, 8)}</span>
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">{user.role}</span>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        navigateTo('hr-records');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                    >
                      <UserCircle size={18} className="text-gray-400" />
                      <span>Hồ sơ cá nhân</span>
                    </button>
                    <div className="h-px bg-gray-100 my-2 mx-2" />
                    <button
                      onClick={() => setUser(null)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="font-bold">Đăng xuất</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Overlay for Mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed top-14 inset-x-0 bottom-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0 z-40 fixed lg:relative top-14 lg:top-0 h-[calc(100vh-3.5rem)] w-[280px] shadow-2xl lg:shadow-none custom-scrollbar"
            >
              <div className="p-4 space-y-6 pb-44 lg:pb-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase">Menu</h2>
                </div>

                <div className="space-y-6">
                  <SidebarItem
                    icon={LayoutDashboard}
                    label="Trang chủ"
                    active={currentPage === 'dashboard'}
                    onClick={() => {
                      navigateTo('dashboard');
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                  />

                  {filteredMenuGroups.map((group, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-300 px-4 mb-2 tracking-wider">{group.title}</p>
                      {group.items.map((item) => (
                        <SidebarItem
                          key={item.id}
                          icon={item.icon}
                          label={item.label}
                          active={currentPage === item.id}
                          badge={item.badge}
                          onClick={() => {
                            navigateTo(item.id);
                            if (window.innerWidth < 1024) setIsSidebarOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main key={refreshKey} className="flex-1 overflow-y-auto relative bg-[#F8F9FA] pb-44 lg:pb-0">
          {renderContent()}

          <footer className="p-4 text-center text-[10px] text-gray-400 border-t border-gray-100 mt-auto">
            HỆ THỐNG QUẢN LÝ CÔNG TY CON ĐƯỜNG XANH © 2026
          </footer>
        </main>
      </div>
      <BottomNav currentPage={currentPage} onNavigate={navigateTo} user={user} pendingCount={pendingCount} />
    </div>
  );
}
