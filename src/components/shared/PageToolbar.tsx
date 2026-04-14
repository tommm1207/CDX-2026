import React, { useCallback, useRef } from 'react';
import { Camera, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';
import { SortButton, SortOption } from './SortButton';
import { ExcelButton } from './ExcelButton';
import { useTableCapture, CaptureOptions } from './useTableCapture';

interface PageToolbarProps {
  /** Ref pointing to the DOM element (table wrapper) to capture as image */
  tableRef?: React.RefObject<HTMLElement | null>;
  /** Options for the image capture (title, subtitle, etc.) */
  captureOptions?: CaptureOptions;
  /** Called when image is captured; receives dataURL. If not provided, uses built-in preview. */
  onImageCaptured?: (dataUrl: string) => void;
  /** Called when Export Excel button is clicked */
  onExportExcel?: () => void;
  /** Sort options for the sort button */
  sortOptions?: { value: SortOption | string; label: string }[];
  /** Current sort value */
  currentSort?: SortOption | string;
  /** Called when sort changes */
  onSortChange?: (sort: string) => void;
  /** Whether filter panel is open */
  showFilter?: boolean;
  /** Called when filter button is toggled */
  onFilterToggle?: () => void;
  /** Custom content inside the filter panel (rendered below the panel header) */
  filterPanelContent?: React.ReactNode;
  /** Extra buttons rendered to the LEFT of the 4 standard buttons (e.g., Chấm công) */
  extraButtons?: React.ReactNode;
  /** Hide filter panel if no filterPanelContent provided */
  hideFilterButton?: boolean;
}

/**
 * Reusable 4-button toolbar: [Save Image] [Export Excel] [Sort] [Filter]
 * Encapsulates the image capture loading state internally.
 */
export const PageToolbar: React.FC<PageToolbarProps> = ({
  tableRef,
  captureOptions,
  onImageCaptured,
  onExportExcel,
  sortOptions,
  currentSort,
  onSortChange,
  showFilter,
  onFilterToggle,
  filterPanelContent,
  extraButtons,
  hideFilterButton = false,
}) => {
  const { captureElement, isCapturing } = useTableCapture();

  const handleCapture = useCallback(async () => {
    if (!tableRef?.current || !captureOptions) return;
    const dataUrl = await captureElement(tableRef.current, captureOptions);
    if (dataUrl && onImageCaptured) {
      onImageCaptured(dataUrl);
    }
  }, [tableRef, captureOptions, captureElement, onImageCaptured]);

  return (
    <div className="flex items-center gap-1.5 flex-nowrap min-w-0 justify-end ml-auto flex-shrink-0">
      {/* Extra buttons (e.g., Chấm công) */}
      {extraButtons}

      {/* Save Image */}
      {tableRef && captureOptions && (
        <Button
          size="icon"
          variant="outline"
          onClick={handleCapture}
          isLoading={isCapturing}
          title="Lưu ảnh"
        >
          {!isCapturing && <Camera size={16} />}
        </Button>
      )}

      {/* Export Excel */}
      {onExportExcel && <ExcelButton onClick={onExportExcel} size="icon" />}

      {/* Sort */}
      {sortOptions && sortOptions.length > 0 && onSortChange && (
        <SortButton
          currentSort={currentSort as SortOption}
          onSortChange={(val) => onSortChange(val)}
          options={sortOptions as { value: SortOption; label: string }[]}
        />
      )}

      {/* Filter */}
      {!hideFilterButton && onFilterToggle && (
        <Button
          size="icon"
          variant={showFilter ? 'primary' : 'outline'}
          onClick={onFilterToggle}
          title="Bộ lọc"
        >
          <Search size={16} />
        </Button>
      )}
    </div>
  );
};

// ─── Filter Panel ───────────────────────────────────────────────────────────

interface FilterPanelProps {
  show: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}

/** Animated filter panel container — renders children between header & reset button */
export const FilterPanel: React.FC<FilterPanelProps> = ({ show, onReset, children }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        style={{ overflow: show ? 'visible' : 'hidden' }}
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bộ lọc</p>
            {onReset && (
              <button
                onClick={onReset}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Đặt lại
              </button>
            )}
          </div>
          {children}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Reusable filter inputs ──────────────────────────────────────────────────

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}
export const FilterSearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
}) => (
  <div className="relative">
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-8 pr-8 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X size={14} />
      </button>
    )}
  </div>
);

interface HideZeroToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}
export const HideZeroToggle: React.FC<HideZeroToggleProps> = ({
  value,
  onChange,
  label = 'Ẩn dòng giá trị = 0',
}) => (
  <div className="flex items-center justify-between">
    <label className="text-xs font-bold text-gray-600">{label}</label>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-all duration-300 shadow-inner ${value ? 'bg-primary' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ml-1 ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  </div>
);

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}) => (
  <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
      <input
        type="date"
        value={startDate}
        max={endDate || undefined}
        onChange={(e) => {
          const val = e.target.value;
          onStartChange(val);
          if (val && endDate && val > endDate) {
            onEndChange(val);
          }
        }}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
      <input
        type="date"
        value={endDate}
        min={startDate || undefined}
        onChange={(e) => {
          const val = e.target.value;
          onEndChange(val);
          if (val && startDate && val < startDate) {
            onStartChange(val);
          }
        }}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  </div>
);
