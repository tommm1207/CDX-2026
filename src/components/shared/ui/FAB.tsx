import { LucideIcon, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface FABProps {
  onClick: () => void;
  label?: string;
  visible?: boolean;
  color?: string; // Tailwind class background like 'bg-primary' or 'bg-amber-500'
  icon?: LucideIcon;
  showLabel?: boolean;
}

export const FAB = ({
  onClick,
  label = 'Thêm mới',
  visible = true,
  color = 'bg-primary',
  icon: Icon = Plus,
  showLabel = false,
}: FABProps) => {
  if (!visible) return null;

  // Determine shadow and hover colors based on the main color
  const shadowColor = color.includes('primary')
    ? 'shadow-primary/30'
    : color.includes('amber')
      ? 'shadow-amber-500/30'
      : color.includes('red')
        ? 'shadow-red-500/30'
        : color.includes('blue')
          ? 'shadow-blue-500/30'
          : color.includes('indigo')
            ? 'shadow-indigo-600/30'
            : 'shadow-gray-400/30';

  const hoverColor = color.includes('primary') ? 'hover:bg-primary-dark' : 'hover:brightness-110';

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`fixed bottom-24 right-6 z-50 ${showLabel ? 'h-14 px-6 rounded-3xl' : 'w-14 h-14 rounded-full'} 
                 ${color} flex items-center justify-center gap-3 shadow-xl ${shadowColor}
                 ${hoverColor} transition-all active:scale-95`}
    >
      <Icon size={28} className="text-white" strokeWidth={3} />
      {showLabel && (
        <span className="text-white font-black text-sm uppercase tracking-wider">{label}</span>
      )}
    </motion.button>
  );
};
