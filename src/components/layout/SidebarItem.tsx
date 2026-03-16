import { motion } from 'motion/react';
import React from 'react';
import { LucideIcon } from 'lucide-react';

export const SidebarItem: React.FC<{ icon: any, label: string, active: boolean, onClick: () => void, badge?: number | string }> = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group relative ${active
        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
        : 'text-gray-500 hover:bg-gray-50'
      }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-white shadow-sm'}`}>
        <Icon size={18} className={active ? 'text-white' : 'text-gray-500 group-hover:text-primary'} />
      </div>
      <span className={`text-sm font-bold tracking-tight ${active ? 'text-white' : 'text-gray-600'}`}>{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${active ? 'bg-white text-primary' : 'bg-red-600 text-white'}`}>
        {badge}
      </span>
    )}
    {active && (
      <motion.div
        layoutId="active-indicator"
        className="absolute left-0 w-1.5 h-8 bg-white rounded-r-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
    )}
  </button>
);
