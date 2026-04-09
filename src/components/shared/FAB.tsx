import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface FABProps {
  onClick: () => void;
  label?: string;
  visible?: boolean;
  color?: string; // Tailwind class background like 'bg-primary' or 'bg-amber-500'
}

export const FAB = ({ onClick, label = 'Thêm mới', visible = true, color = 'bg-primary' }: FABProps) => {
  if (!visible) return null;

  // Determine shadow and hover colors based on the main color
  const shadowColor = color.includes('primary') ? 'shadow-primary/30' : 
                     color.includes('amber') ? 'shadow-amber-500/30' :
                     color.includes('red') ? 'shadow-red-500/30' :
                     color.includes('blue') ? 'shadow-blue-500/30' :
                     'shadow-gray-400/30';

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
      className={`fixed bottom-20 right-4 z-50 w-14 h-14 ${color} rounded-full
                 flex items-center justify-center shadow-xl ${shadowColor}
                 ${hoverColor} transition-all active:scale-95`}
    >
      <Plus size={28} className="text-white" strokeWidth={3} />
    </motion.button>
  );
};
