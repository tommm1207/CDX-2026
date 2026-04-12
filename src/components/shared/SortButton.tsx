import React, { useState } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';

export type SortOption = 'date' | 'newest' | 'price' | 'code';

interface SortButtonProps {
  currentSort: SortOption;
  onSortChange: (option: SortOption) => void;
  options?: { value: SortOption; label: string }[];
}

export const SortButton = ({ currentSort, onSortChange, options }: SortButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const defaultOptions: { value: SortOption; label: string }[] = [
    { value: 'date', label: 'Ngày' },
    { value: 'newest', label: 'Mới nhất' },
    { value: 'price', label: 'Giá tiền' },
    { value: 'code', label: 'Mã hiệu' },
  ];

  const actualOptions = options || defaultOptions;

  return (
    <div className="relative">
      <Button
        variant={isOpen ? 'primary' : 'outline'}
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        icon={Filter}
        className="relative"
      />

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[110]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[111] overflow-hidden"
            >
              <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Sắp xếp theo
              </p>
              <div className="space-y-1">
                {actualOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onSortChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      currentSort === opt.value
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                    {currentSort === opt.value && <Check size={14} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
