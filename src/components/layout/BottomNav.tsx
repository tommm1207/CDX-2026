import {
  Home,
  ClipboardCheck,
  CalendarCheck,
  UserCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  FileText,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Employee } from '@/types';

export const BottomNav = ({
  currentPage,
  onNavigate,
  user,
  pendingCount,
  isHidden = false,
}: {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: Employee;
  pendingCount: number;
  isHidden?: boolean;
}) => {
  const navItems =
    user.role === 'Admin' || user.role === 'Develop'
      ? [
          { id: 'dashboard', label: 'Trang chủ', icon: Home },
          {
            id: 'pending-approvals',
            label: 'Phiếu duyệt',
            icon: ClipboardCheck,
            badge: pendingCount,
          },
          { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
          { id: 'hr-records', label: 'Nhân sự', icon: UserCircle },
        ]
      : [
          { id: 'dashboard', label: 'Trang chủ', icon: Home },
          { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownCircle },
          { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle },
          { id: 'transfer', label: 'Luân chuyển', icon: ArrowLeftRight },
          { id: 'cost-report', label: 'Báo cáo chi phí', icon: FileText },
        ];

  return (
    <motion.div
      initial={{ y: 0, opacity: 1 }}
      animate={{
        y: isHidden ? 120 : 0,
        opacity: isHidden ? 0 : 1,
        pointerEvents: isHidden ? 'none' : 'auto',
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/90 backdrop-blur-md border border-gray-100 flex items-center justify-around py-2 px-2 z-[60] shadow-[0_8px_25px_rgba(0,0,0,0.1)] rounded-full"
    >
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex flex-col items-center gap-0.5 flex-1 transition-all relative ${
            currentPage === item.id ? 'text-primary scale-105' : 'text-gray-400'
          }`}
        >
          <item.icon
            size={20}
            className={currentPage === item.id ? 'text-primary' : 'text-gray-400'}
          />
          <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -top-1.5 right-1/4 bg-red-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 border-2 border-white animate-bounce">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </button>
      ))}
    </motion.div>
  );
};
