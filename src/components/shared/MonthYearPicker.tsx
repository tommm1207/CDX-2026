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
  return (
    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col items-start">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Tháng</span>
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold text-gray-700 outline-none cursor-pointer hover:bg-white hover:border-gray-200 transition-colors appearance-none"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              Tháng {m}
            </option>
          ))}
        </select>
      </div>

      <div className="h-8 w-px bg-gray-100 mx-1" />

      <div className="flex flex-col items-start">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">Năm</span>
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold text-gray-700 outline-none cursor-pointer hover:bg-white hover:border-gray-200 transition-colors appearance-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y === currentYear ? `${y} ★` : `Năm ${y}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
