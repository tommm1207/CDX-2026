import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'outline'
    | 'ghost'
    | 'white'
    | 'blue'
    | 'orange'
    | 'indigo';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  iconSize?: number;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconSize = 18,
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 uppercase tracking-wider';

  const variants = {
    primary: 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover',
    secondary: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
    success: 'bg-green-600 text-white shadow-lg shadow-green-600/20 hover:bg-green-700',
    danger: 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600',
    warning: 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600',
    outline:
      'bg-white border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 hover:border-gray-300',
    ghost: 'bg-transparent text-gray-500 hover:bg-gray-100',
    white: 'bg-white text-primary shadow-lg shadow-black/5 hover:bg-gray-50',
    blue: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600',
    orange: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600',
    indigo: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700',
  };

  const sizes = {
    xs: 'px-2 py-1 text-[9px] rounded-lg',
    sm: 'px-3 py-1.5 text-[10px] rounded-xl',
    md: 'px-5 py-2.5 text-xs rounded-2xl',
    lg: 'px-8 py-3.5 text-sm rounded-3xl',
    icon: 'p-2 rounded-xl',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon size={iconSize} />
      )}
      {children}
    </button>
  );
};
