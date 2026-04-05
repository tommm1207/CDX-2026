interface ExcelButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
}

export const ExcelButton = ({
  onClick,
  loading = false,
  label = 'Excel',
  className = ''
}: ExcelButtonProps) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[#b5f5c9]
                bg-white text-[#188B46] font-black text-sm hover:bg-[#ebfbf0]
                transition-colors disabled:opacity-50 shrink-0 shadow-sm ${className}`}
  >
    {/* Custom Excel SVG inside a rounded square */}
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="24" height="24" rx="6" fill="#2E7E45" />
      <path
        d="M7.5 6L11 12l-3.5 6h3.5l1.5-3.5 1.5 3.5h3.5L14 12l3.5-6h-3.5L12.5 9.5 11 6z"
        fill="white"
      />
    </svg>
    <span className="mb-[1px] tracking-wide">{loading ? 'Đang xuất...' : label}</span>
  </button>
);
