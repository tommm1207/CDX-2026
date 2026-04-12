import { Button } from './Button';

interface ExcelButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
}

export const ExcelButton = ({
  onClick,
  loading = false,
  label = 'Xuất Excel',
  className = '',
  size = 'md',
}: ExcelButtonProps) => (
  <Button
    onClick={onClick}
    isLoading={loading}
    variant="white"
    size={size}
    className={`!border-primary/30 !text-primary hover:!bg-primary/5 shadow-md px-3 sm:px-5 ${className}`}
  >
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      {/* Brighter integrated Excel SVG */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0 group-hover:rotate-12 transition-transform"
      >
        <rect width="24" height="24" rx="6" fill="#2D5A27" />
        <path
          d="M7.5 6L11 12l-3.5 6h3.5l1.5-3.5 1.5 3.5h3.5L14 12l3.5-6h-3.5L12.5 9.5 11 6z"
          fill="white"
        />
      </svg>
      <span className="hidden sm:inline font-black text-[10px] uppercase tracking-wider">
        {loading ? 'Đang xuất...' : label}
      </span>
    </div>
  </Button>
);
