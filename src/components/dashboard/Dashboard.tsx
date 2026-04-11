import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  ArrowRight,
  FileText,
  CalendarCheck,
  ArrowLeftRight,
  Plus,
  Package,
  Layers,
  ClipboardCheck,
  BarChart3,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { parseReminderContent } from '@/utils/reminderUtils';
import { ToastType } from '../shared/Toast';

interface DashboardProps {
  user: Employee;
  onNavigate: (page: string, params?: any) => void;
  addToast?: (message: string, type?: ToastType) => void;
  pendingApprovals?: number;
}

export const Dashboard = ({ user, onNavigate, addToast, pendingApprovals = 0 }: DashboardProps) => {
  const [reminderCount, setReminderCount] = useState(0);

  useEffect(() => {
    const fetchReminderCount = async () => {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('reminders')
          .select('*')
          .neq('status', 'Đã xóa')
          .gte('created_at', twentyFourHoursAgo);

        if (data) {
          const clearedRaw = localStorage.getItem('cleared_reminders') || '[]';
          const clearedMap = new Set(JSON.parse(clearedRaw));

          let count = 0;
          for (const rem of data) {
            if (clearedMap.has(rem.id)) continue;
            if (new Date(rem.reminder_time).getTime() > Date.now()) continue;
            const payload = parseReminderContent(rem.content);
            if (payload.assignees.length > 0 && !payload.assignees.includes(user.id)) continue;
            count++;
          }
          setReminderCount(count);
        }
      } catch (err) {}
    };

    fetchReminderCount();
    const interval = setInterval(fetchReminderCount, 15000);
    return () => clearInterval(interval);
  }, [user.id]);

  const isAdmin = user.role === 'Admin' || user.role === 'Admin App';

  const menuActions = [
    {
      id: 'stock-in',
      label: 'Nhập kho',
      icon: ArrowDownCircle,
      color: 'bg-blue-500',
      description: 'Tạo phiếu nhập vật tư mới',
    },
    {
      id: 'stock-out',
      label: 'Xuất kho',
      icon: ArrowUpCircle,
      color: 'bg-red-600',
      description: 'Tạo phiếu xuất kho vật tư',
    },
    {
      id: 'transfer',
      label: 'Luân chuyển kho',
      icon: ArrowLeftRight,
      color: 'bg-orange-500',
      description: 'Chuyển vật tư giữa các kho',
    },
    {
      id: 'production-list',
      label: 'Lệnh sản xuất',
      icon: Layers,
      color: 'bg-indigo-600',
      description: 'Điều phối sản xuất và vật tư',
      adminOnly: true,
    },
    {
      id: 'cost-report',
      label: 'Báo cáo chi phí',
      icon: FileText,
      color: 'bg-primary',
      description: 'Ghi chép chi tiêu dự án',
    },
    {
      id: 'inventory-report',
      label: 'Tồn kho',
      icon: BarChart3,
      color: 'bg-teal-600',
      description: 'Kiểm tra số lượng tồn kho',
    },
    {
      id: 'material-catalog',
      label: 'Danh mục vật tư',
      icon: Package,
      color: 'bg-cyan-600',
      description: 'Quản lý danh sách vật tư',
      adminOnly: true,
    },
    {
      id: 'attendance',
      label: 'Chấm công',
      icon: CalendarCheck,
      color: 'bg-violet-600',
      description: 'Theo dõi chuyên cần hàng ngày',
    },
    {
      id: 'monthly-salary',
      label: 'Bảng lương',
      icon: Wallet,
      color: 'bg-emerald-600',
      description: 'Tổng hợp lương tháng',
      adminOnly: true,
    },
    {
      id: 'pending-approvals',
      label: 'Phê duyệt',
      icon: ClipboardCheck,
      color: 'bg-amber-600',
      description: 'Duyệt phiếu chờ xử lý',
      adminOnly: true,
    },
  ];

  const visibleActions = menuActions.filter((a) => !a.adminOnly || isAdmin);

  const totalNotifs = reminderCount + (isAdmin ? pendingApprovals : 0);

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Chào {user.full_name.split(' ').pop()}! 👋
          </h1>
          <p className="text-gray-500 font-medium text-sm">
            Chúc bạn một ngày làm việc hiệu quả tại CDX.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20 h-[46px]">
            <div className="text-left">
              <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest leading-none mb-1">
                Vai trò
              </p>
              <p className="text-sm font-black text-white leading-none uppercase">{user.role}</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('notifications')}
            className="group relative flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 w-[46px] h-[46px] rounded-xl transition-all shadow-sm border border-gray-100 mr-2 md:mr-0"
          >
            <Bell
              size={22}
              className={
                totalNotifs > 0
                  ? 'text-amber-500 group-hover:scale-110 transition-transform'
                  : 'text-gray-400'
              }
            />
            {totalNotifs > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-slow-fade">
                {totalNotifs}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Actions — Icon Grid */}
      <div className="grid grid-cols-4 md:grid-cols-5 gap-2 md:gap-6">
        {visibleActions.map((action) => (
          <motion.div
            key={action.id}
            whileHover={{ y: -3, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate(action.id)}
            className="group bg-white md:p-6 rounded-xl md:rounded-[2rem] shadow-sm border border-gray-100 cursor-pointer hover:shadow-xl hover:shadow-gray-200/50 transition-all flex flex-col items-center justify-center py-2.5 px-1 md:items-start md:gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 bg-gray-50 rounded-bl-full translate-x-4 -translate-y-4 group-hover:bg-primary/5 transition-colors hidden md:block" />
            <div
              className={`w-8 h-8 md:w-12 md:h-12 flex-shrink-0 ${action.color} rounded-lg md:rounded-2xl flex items-center justify-center text-white shadow-sm md:shadow-lg relative z-10 group-hover:rotate-12 transition-transform`}
            >
              <action.icon size={16} className="md:hidden" />
              <action.icon size={24} className="hidden md:block" />
            </div>
            <p className="text-[10px] md:hidden font-semibold text-gray-600 text-center leading-tight mt-1.5 w-full px-0.5">
              {action.label}
            </p>
            <div className="hidden md:block relative z-10">
              <h3 className="text-base font-bold text-gray-800 group-hover:text-primary transition-colors">
                {action.label}
              </h3>
              <p className="text-[10px] text-gray-400 font-medium leading-tight mt-1">
                {action.description}
              </p>
            </div>
            <ArrowRight
              className="hidden md:block absolute bottom-6 right-6 text-gray-200 group-hover:text-primary group-hover:translate-x-1 transition-all"
              size={20}
            />
          </motion.div>
        ))}
      </div>

      {/* System Status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
          <p className="text-xs font-bold text-gray-700">Hệ thống hoạt động ổn định</p>
          <span className="ml-auto text-[10px] text-gray-400">Cloud Server</span>
        </div>
      </div>

      <RadialMenu onNavigate={onNavigate} />
    </div>
  );
};

const RadialMenu = ({ onNavigate }: { onNavigate: (page: string, params?: any) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const items = [
    {
      id: 'stock-in',
      label: 'Nhập kho',
      icon: ArrowDownCircle,
      color: 'bg-blue-600',
      action: () => onNavigate('stock-in', { action: 'add' }),
    },
    {
      id: 'stock-out',
      label: 'Xuất kho',
      icon: ArrowUpCircle,
      color: 'bg-red-600',
      action: () => onNavigate('stock-out', { action: 'add' }),
    },
    {
      id: 'transfer',
      label: 'Luân chuyển',
      icon: ArrowLeftRight,
      color: 'bg-orange-500',
      action: () => onNavigate('transfer', { action: 'add' }),
    },
    {
      id: 'production-list',
      label: 'Sản xuất',
      icon: Layers,
      color: 'bg-indigo-600',
      action: () => onNavigate('production-list'),
    },
    {
      id: 'costs',
      label: 'Chi phí',
      icon: Wallet,
      color: 'bg-emerald-600',
      action: () => onNavigate('costs', { action: 'add' }),
    },
    {
      id: 'notes',
      label: 'Ghi chú',
      icon: FileText,
      color: 'bg-amber-500',
      action: () => onNavigate('notes', { action: 'add' }),
    },
    {
      id: 'reminders',
      label: 'Lời nhắc',
      icon: Bell,
      color: 'bg-primary',
      action: () => onNavigate('reminders', { action: 'add' }),
    },
  ];

  return (
    <>
      {/* Overlay backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-[90px] right-10 z-[90]">
        <AnimatePresence>
          {isOpen && (
            <>
              {items.map((item, index) => {
                // Perfect 90-degree quadrant (180° to 270°)
                const startAngle = Math.PI * 1.0;
                const endAngle = Math.PI * 1.5;
                const angle = startAngle + (endAngle - startAngle) * (index / (items.length - 1));

                // Rotated labels (Tia mặt trời) with bounded rotation
                const rotationDegrees = (angle - Math.PI) * (180 / Math.PI);

                const iconRadius = 240; // Icons on the outer arc
                const labelRadius = 145; // Labels on the inner arc

                const ix = Math.round(iconRadius * Math.cos(angle));
                const iy = Math.round(iconRadius * Math.sin(angle));

                const lx = Math.round(labelRadius * Math.cos(angle));
                const ly = Math.round(labelRadius * Math.sin(angle));

                return (
                  <div key={item.id}>
                    {/* Inner Label - Clickable & Rotated */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1, x: lx, y: ly }}
                      exit={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 25,
                        delay: index * 0.05,
                      }}
                      className="absolute inset-x-0 bottom-0 flex items-center justify-center"
                    >
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          item.action();
                        }}
                        className="bg-white/95 backdrop-blur-md text-gray-800 font-bold text-[9px] uppercase tracking-wide px-2.5 py-1 rounded-lg shadow-sm border border-white/50 whitespace-nowrap hover:scale-105 hover:bg-white active:scale-95 transition-all pointer-events-auto"
                        style={{ transform: `rotate(${rotationDegrees}deg)` }}
                      >
                        {item.label}
                      </button>
                    </motion.div>

                    {/* Outer Icon Button */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1, x: ix, y: iy }}
                      exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: index * 0.05,
                      }}
                      className="absolute inset-x-0 bottom-0 flex items-center justify-center pointer-events-none"
                    >
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          item.action();
                        }}
                        className={`flex items-center justify-center w-12 h-12 rounded-full shadow-2xl ${item.color} text-white hover:scale-110 hover:brightness-110 active:scale-95 transition-all outline-none pointer-events-auto shrink-0`}
                      >
                        <item.icon size={20} />
                      </button>
                    </motion.div>
                  </div>
                );
              })}
            </>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all relative z-10 
            ${isOpen ? 'bg-red-500 text-white rotate-45' : 'bg-primary text-white hover:bg-primary-hover hover:scale-105 active:scale-95'}`}
        >
          <Plus size={28} className="transition-transform duration-300" />
        </button>
      </div>
    </>
  );
};
