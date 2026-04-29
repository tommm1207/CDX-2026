import { Button } from '../ui/Button';

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
    size={size === 'icon' ? 'icon' : size}
    className={`!border-primary/30 !text-primary hover:!bg-primary/5 shadow-sm p-2 sm:px-4 active:scale-95 transition-all ${className}`}
  >
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <svg
        width={size === 'icon' ? '20' : '18'}
        height={size === 'icon' ? '20' : '18'}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0 group-hover:rotate-12 transition-transform"
      >
        <rect width="24" height="24" rx="6" fill="#205315" />
        <path
          d="M7.5 6L11 12l-3.5 6h3.5l1.5-3.5 1.5 3.5h3.5L14 12l3.5-6h-3.5L12.5 9.5 11 6z"
          fill="white"
        />
      </svg>
      {size !== 'icon' && (
        <span className="hidden md:inline font-bold text-[10px] uppercase tracking-wider">
          {loading ? '...' : label}
        </span>
      )}
    </div>
  </Button>
);
