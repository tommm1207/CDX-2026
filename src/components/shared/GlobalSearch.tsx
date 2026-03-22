import { useState, useEffect, useRef } from 'react';
import { Search, X, UserCircle, Package, ArrowDownCircle, Wallet, Command, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string, params?: any) => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'employee' | 'material' | 'stock_in' | 'cost';
  data: any;
}

export const GlobalSearch = ({ isOpen, onClose, onNavigate }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ [key: string]: SearchResult[] }>({
    employee: [],
    material: [],
    stock_in: [],
    cost: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults({ employee: [], material: [], stock_in: [], cost: [] });
    }
  }, [isOpen]);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch results
  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      performSearch(debouncedQuery);
    } else {
      setResults({ employee: [], material: [], stock_in: [], cost: [] });
    }
  }, [debouncedQuery]);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      const q = `%${searchTerm}%`;

      const [users, materials, stock_in, costs] = await Promise.all([
        supabase.from('users').select('id, full_name, code, role').or(`full_name.ilike.${q},code.ilike.${q}`).limit(5),
        supabase.from('materials').select('id, name, code, specification').or(`name.ilike.${q},code.ilike.${q}`).limit(5),
        supabase.from('stock_in').select('id, import_code, notes, date').or(`import_code.ilike.${q},notes.ilike.${q}`).limit(5),
        supabase.from('costs').select('id, cost_code, content, cost_type').or(`content.ilike.${q},cost_code.ilike.${q}`).limit(5)
      ]);

      setResults({
        employee: (users.data || []).map(u => ({ id: u.id, title: u.full_name, subtitle: u.code + ' - ' + u.role, type: 'employee', data: u })),
        material: (materials.data || []).map(m => ({ id: m.id, title: m.name, subtitle: m.code + (m.specification ? ` - ${m.specification}` : ''), type: 'material', data: m })),
        stock_in: (stock_in.data || []).map(s => ({ id: s.id, title: s.import_code || 'Phiếu nhập mới', subtitle: s.notes || s.date, type: 'stock_in', data: s })),
        cost: (costs.data || []).map(c => ({ id: c.id, title: c.content || c.cost_code, subtitle: c.cost_type, type: 'cost', data: c })),
      });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (item: SearchResult) => {
    onClose();
    switch (item.type) {
      case 'employee':
        onNavigate('hr-records', { highlight: item.id });
        break;
      case 'material':
        onNavigate('materials', { highlight: item.id });
        break;
      case 'stock_in':
        onNavigate('stock-in', { highlight: item.id });
        break;
      case 'cost':
        onNavigate('costs', { highlight: item.id });
        break;
    }
  };

  const hasResults = Object.values(results).some((arr: any) => arr.length > 0);

  const getGroupTitle = (type: string) => {
    switch(type) {
      case 'employee': return { text: 'Nhân viên', icon: <UserCircle size={14} className="text-blue-500" />, color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'material': return { text: 'Vật tư', icon: <Package size={14} className="text-amber-500" />, color: 'text-amber-600', bg: 'bg-amber-50' };
      case 'stock_in': return { text: 'Phiếu nhập', icon: <ArrowDownCircle size={14} className="text-green-500" />, color: 'text-green-600', bg: 'bg-green-50' };
      case 'cost': return { text: 'Chi phí', icon: <Wallet size={14} className="text-purple-500" />, color: 'text-purple-600', bg: 'bg-purple-50' };
      default: return { text: 'Khác', icon: <FileText size={14} />, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center pt-20 px-4">
          {/* Overlay background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative border border-gray-100/50"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <Search className={`w-6 h-6 ${loading ? 'text-primary animate-pulse' : 'text-gray-400'}`} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Tìm kiếm nhân viên, vật tư, phiếu, chi phí... (nhập ít nhất 3 ký tự)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-gray-800 text-lg outline-none placeholder-gray-300"
              />
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                 <X size={20} />
              </button>
            </div>

            {/* Results Body */}
            <div className="max-h-[60vh] overflow-y-auto w-full custom-scrollbar p-2">
              {query.length > 0 && query.length < 3 && (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-3">
                  <Command size={32} className="opacity-20" />
                  <p>Nhập thêm {3 - query.length} ký tự nữa để bắt đầu tìm kiếm</p>
                </div>
              )}

              {query.length >= 3 && !loading && !hasResults && (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-3">
                  <Search size={32} className="opacity-20" />
                  <p>Không tìm thấy kết quả phù hợp với "{query}"</p>
                </div>
              )}

              {query.length >= 3 && loading && !hasResults && (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p>Đang tải dữ liệu tìm kiếm...</p>
                </div>
              )}

              {hasResults && (
                <div className="space-y-4 p-2">
                  {['employee', 'material', 'stock_in', 'cost'].map((groupKey) => {
                    const groupResults = results[groupKey] as SearchResult[];
                    if (!groupResults || groupResults.length === 0) return null;
                    const groupStyle = getGroupTitle(groupKey);

                    return (
                      <div key={groupKey} className="space-y-2">
                        <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider">
                          <span className={`p-1 rounded-md ${groupStyle.bg}`}>{groupStyle.icon}</span>
                          <span className={groupStyle.color}>{groupStyle.text}</span>
                        </div>
                        <div className="space-y-1">
                          {groupResults.map(item => (
                            <button
                              key={item.id}
                              onClick={() => handleResultClick(item)}
                              className="w-full text-left p-3 hover:bg-gray-50/80 rounded-2xl transition-colors group flex items-start gap-3 border border-transparent hover:border-gray-100"
                            >
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-800 truncate group-hover:text-primary transition-colors">
                                  {item.title}
                                </h4>
                                {item.subtitle && (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="bg-gray-50/50 p-3 text-center text-[10px] text-gray-400 border-t border-gray-100">
              Nhấn <kbd className="px-1.5 py-0.5 rounded-md bg-white border border-gray-200 shadow-sm mx-1">ESC</kbd> để đóng trình tìm kiếm
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
