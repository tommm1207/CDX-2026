import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Calendar, Check } from 'lucide-react';

interface MonthYearPickerProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).reverse();

export const MonthYearPicker = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: MonthYearPickerProps) => {
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthRef.current && !monthRef.current.contains(event.target as Node)) {
        setIsMonthOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
        setIsYearOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 relative">
      {/* Month Picker */}
      <div className="relative" ref={monthRef}>
        <div
          className="flex flex-col items-start px-3 py-1 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-white hover:border-gray-200 transition-all min-w-[100px]"
          onClick={() => setIsMonthOpen(!isMonthOpen)}
        >
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
            Tháng
          </span>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-black text-gray-700">Tháng {selectedMonth}</span>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        <AnimatePresence>
          {isMonthOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[200] w-[140px] grid grid-cols-2 gap-1 overflow-hidden"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    onMonthChange(m);
                    setIsMonthOpen(false);
                  }}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${selectedMonth === m ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-primary/10 hover:text-primary'}`}
                >
                  T{m}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-8 w-px bg-gray-100 mx-1" />

      {/* Year Picker */}
      <div className="relative" ref={yearRef}>
        <div
          className="flex flex-col items-start px-3 py-1 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-white hover:border-gray-200 transition-all min-w-[100px]"
          onClick={() => setIsYearOpen(!isYearOpen)}
        >
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Năm</span>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-black text-gray-700">
              {selectedYear}
              {selectedYear === currentYear ? ' ★' : ''}
            </span>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform ${isYearOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        <AnimatePresence>
          {isYearOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[200] w-[140px] max-h-[300px] overflow-y-auto custom-scrollbar"
            >
              <div className="space-y-0.5">
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => {
                      onYearChange(y);
                      setIsYearOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${selectedYear === y ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-primary/5 hover:text-primary'}`}
                  >
                    <span>{y === currentYear ? `${y} (Nay)` : `Năm ${y}`}</span>
                    {selectedYear === y && <Check size={12} strokeWidth={4} />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
