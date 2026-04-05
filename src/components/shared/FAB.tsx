import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface FABProps {
  onClick: () => void;
  label?: string;
  visible?: boolean;
}

export const FAB = ({ onClick, label = 'Thêm mới', visible = true }: FABProps) => {
  if (!visible) return null;
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-primary rounded-full
                 flex items-center justify-center shadow-xl shadow-primary/30
                 hover:bg-primary-hover transition-colors active:scale-95"
    >
      <Plus size={28} className="text-white" strokeWidth={2.5} />
    </motion.button>
  );
};
