import { useState, useRef, useMemo, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CustomCombobox = ({
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

  const displayValue = useMemo(() => {
    const selected = options.find(opt => opt.id === value || opt.name === value);
    if (selected) {
      return selected.code ? `[${selected.code}] ${selected.name}` : selected.name;
    }
    return searchTerm || value;
  }, [value, options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
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
