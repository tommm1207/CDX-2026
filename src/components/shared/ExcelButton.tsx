import { Button } from './Button';

interface ExcelButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
}

export const ExcelButton = ({
  onClick,
  loading = false,
  label = 'Xuất Excel',
  className = ''
}: ExcelButtonProps) => (
  <Button
    onClick={onClick}
    isLoading={loading}
    variant="white"
    className={`!border-2 !border-[#b5f5c9] !text-[#188B46] hover:!bg-[#ebfbf0] shadow-md ${className}`}
  >
    <div className="flex items-center gap-2">
      {/* Custom Excel SVG inside a rounded square */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 group-hover:rotate-12 transition-transform">
        <rect width="24" height="24" rx="6" fill="#188B46" />
        <path
          d="M7.5 6L11 12l-3.5 6h3.5l1.5-3.5 1.5 3.5h3.5L14 12l3.5-6h-3.5L12.5 9.5 11 6z"
          fill="white"
        />
      </svg>
      <span className="font-black text-xs uppercase tracking-wider">
        {loading ? 'Đang xuất...' : label}
      </span>
    </div>
  </Button>
);
