import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export const PageBreadcrumb = ({ title, onBack }: { title: string; onBack?: () => void }) => {
  if (!onBack) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 mb-6"
    >
      <button
        onClick={onBack}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all group shadow-sm active:scale-95"
        title="Quay lại"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
      </button>
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
          <span>Hệ thống</span>
          <ChevronRight size={10} />
        </div>
        <h2 className="text-lg font-bold text-gray-800 leading-none">{title}</h2>
      </div>
    </motion.div>
  );
};
