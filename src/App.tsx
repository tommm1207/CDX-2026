import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Package,
  Settings,
  LogOut,
  Warehouse,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  BarChart3,
  CalendarCheck,
  Wallet,
  Banknote,
  UserCircle,
  Settings2,
  Layers,
  Handshake,
  RefreshCw,
  Home,
  User as UserIcon,
  ChevronDown,
  FileText,
  Filter,
  Trash2,
  Download,
  ClipboardCheck,
  Bell,
  BellRing,
  ClipboardList,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabaseClient';
import { Employee } from './types';
import { REMINDER_CHECK_INTERVAL, PENDING_COUNT_INTERVAL } from './constants/options';

// Shared Components
import { PageBreadcrumb } from './components/shared/PageBreadcrumb';

// Layout Components
import { SidebarItem } from './components/layout/SidebarItem';
import { BottomNav } from './components/layout/BottomNav';
import { ToastContainer, ToastMessage, ToastType } from './components/shared/Toast';

// Auth Components
import { LoginPage } from './components/auth/LoginPage';

// Dashboard
import { Dashboard } from './components/dashboard/Dashboard';

// HR Components
import { HRRecords } from './components/hr/HRRecords';
import { Attendance } from './components/hr/Attendance';
import { Advances } from './components/hr/Advances';
import { MonthlySalary } from './components/hr/MonthlySalary';
import { SalarySettings } from './components/hr/SalarySettings';

// Finance Components
import { Costs } from './components/finance/Costs';
import { CostReport } from './components/finance/CostReport';
import { CostFilter } from './components/finance/CostFilter';
import { PendingApprovals } from './components/finance/PendingApprovals';

// Inventory Components
import { StockIn } from './components/inventory/StockIn';
import { StockOut } from './components/inventory/StockOut';
import { Transfer } from './components/inventory/Transfer';
import { InventoryReport } from './components/inventory/InventoryReport';

// Warehouse & Materials
import { Warehouses } from './components/warehouses/Warehouses';
import { MaterialGroups } from './components/materials/MaterialGroups';
import { MaterialCatalog } from './components/materials/MaterialCatalog';
import { PlaceholderPage } from './components/materials/PlaceholderPage';

// Production Components
import { BOMConfig } from './components/production/BOMConfig';
import { ProductionOrders } from './components/production/ProductionOrders';
import { ProductionOrderDetail } from './components/production/ProductionOrderDetail';

// Trash Components
import { Trash } from './components/trash/Trash';
import { DeletedWarehouses } from './components/trash/DeletedWarehouses';
import { DeletedSlips } from './components/trash/DeletedSlips';
import { DeletedEmployees } from './components/trash/DeletedEmployees';
import { DeletedCosts } from './components/trash/DeletedCosts';

// Utilities & System
import { Notes } from './components/notes/Notes';
import { Reminders } from './components/reminders/Reminders';
import { Backup } from './components/settings/Backup';
import { BackupNow } from './components/settings/BackupNow';

import { Notifications } from './components/notifications/Notifications';
import { UserManual } from './components/shared/UserManual';
import { DatabaseSetup } from './components/settings/DatabaseSetup';
import { GlobalSearch } from './components/shared/GlobalSearch';

const LOGO_URL = "/logo.png";

export default function App() {
  const [user, setUser] = useState<Employee | null>(null);
  
  // Check for missing configuration
  const isConfigMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (isConfigMissing) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-6 text-center z-[999]">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <Settings2 size={32} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Thiếu cấu hình hệ thống</h1>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          Vui lòng thiết lập <strong>VITE_SUPABASE_URL</strong> và <strong>VITE_SUPABASE_ANON_KEY</strong> trong Vercel Environment Variables.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState<any>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Global Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Browser Notification Logic
  useEffect(() => {
    if (user && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (!user) return;

    const checkReminders = setInterval(async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('reminders')
        .select('*')
        .eq('status', 'pending')
        .lte('reminder_time', now);

      if (data && data.length > 0) {
        data.forEach(async (rem) => {
          if (rem.browser_notification && Notification.permission === "granted") {
            new Notification(rem.title, { body: rem.content });
          }
          await supabase.from('reminders').update({ status: 'reminded' }).eq('id', rem.id);
        });
        if (currentPage === 'reminders') {
          setRefreshKey(prev => prev + 1);
        }
      }
    }, REMINDER_CHECK_INTERVAL);

    return () => clearInterval(checkReminders);
  }, [user, currentPage]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const [si, so, tr, co] = await Promise.all([
        supabase.from('stock_in').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
        supabase.from('stock_out').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
        supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt'),
        supabase.from('costs').select('*', { count: 'exact', head: true }).eq('status', 'Chờ duyệt')
      ]);
      setPendingCount((si.count || 0) + (so.count || 0) + (tr.count || 0) + (co.count || 0));
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, PENDING_COUNT_INTERVAL);
    
    return () => clearInterval(interval);
  }, [user, fetchPendingCount]);

  const navigateTo = (page: string, params: any = null) => {
    if (page !== currentPage || params !== pageParams) {
      setNavigationHistory(prev => [...prev, currentPage]);
      setCurrentPage(page);
      setPageParams(params);
    }
  };

  const goBack = () => {
    if (navigationHistory.length > 0) {
      const prevPage = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentPage(prevPage);
    } else {
      setCurrentPage('dashboard');
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const menuGroups = [
    {
      title: 'QUẢN LÝ TÀI CHÍNH',
      items: [
        { id: 'costs', label: 'Chi phí', icon: Wallet },
        { id: 'cost-report', label: 'Báo cáo chi phí', icon: FileText },
        { id: 'pending-approvals', label: 'Phiếu duyệt', icon: ClipboardCheck, badge: pendingCount },
        { id: 'cost-filter', label: 'Lọc chi phí', icon: Filter },
      ]
    },
    {
      title: 'QUẢN LÝ KHO',
      items: [
        { id: 'stock-in', label: 'Nhập kho', icon: ArrowDownCircle },
        { id: 'stock-out', label: 'Xuất kho', icon: ArrowUpCircle },
        { id: 'transfer', label: 'Luân chuyển kho', icon: ArrowLeftRight },
        { id: 'inventory-report', label: 'Kiểm tra tồn kho', icon: BarChart3 },
        { id: 'warehouses', label: 'Danh sách kho', icon: Warehouse },
        { id: 'material-groups', label: 'Nhóm vật tư', icon: Layers },
        { id: 'materials', label: 'Danh mục vật tư', icon: Package },
        { id: 'trash', label: 'Thùng rác', icon: Trash2 },
      ]
    },
    {
      title: 'SẢN XUẤT',
      items: [
        { id: 'production-list', label: 'Lệnh sản xuất', icon: ClipboardList },
        { id: 'production-bom', label: 'Định mức sản xuất', icon: Settings },
      ]
    },
    {
      title: 'TIỀN LƯƠNG',
      items: [
        { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
        { id: 'advances', label: 'Tạm ứng & phụ cấp', icon: Banknote },
        { id: 'payroll', label: 'Tổng hợp lương/tháng', icon: Wallet },
        { id: 'salary-settings', label: 'Cài đặt lương', icon: Settings2 },
      ]
    },
    {
      title: 'ĐỐI TÁC',
      items: [
        { id: 'partners', label: 'Khách hàng & nhà cung cấp', icon: Handshake },
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { id: 'hr-records', label: 'Quản lý nhân sự', icon: UserCircle },
        { id: 'notes', label: 'Nhật ký / Ghi chú', icon: FileText },
        { id: 'notifications', label: 'Thông báo', icon: BellRing },
        { id: 'reminders', label: 'Thiết lập Lịch nhắc', icon: Bell },
        { id: 'database-setup', label: 'Cấu hình Database', icon: Settings2 },
        { id: 'trash', label: 'Thùng rác', icon: Trash2 },
      ]
    },
    {
      title: 'CÔNG CỤ SAO LƯU',
      items: [
        { id: 'backup-settings', label: 'Cấu hình Backup', icon: Settings },
        { id: 'backup-now', label: 'Sao lưu ngay', icon: Download },
      ]
    }
  ];

  const filteredMenuGroups = menuGroups.map(group => ({
    ...group,
      items: group.items.filter(item => {
        if (user.role === 'User') {
          const allowed = ['stock-in', 'stock-out', 'transfer', 'attendance', 'cost-report', 'production-list', 'production-detail'];
          return allowed.includes(item.id);
        }
        // Allow Admin role to see all tools except database-setup
        if (user.role === 'Admin') {
          return item.id !== 'database-setup';
        }
        // Allow Admin App to see everything
        if (user.role === 'Admin App') {
          return true;
        }
        return false;
      }).map(item => item.id === 'pending-approvals' ? { ...item, badge: pendingCount } : item)
  })).filter(group => group.items.length > 0);

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} onNavigate={navigateTo} addToast={addToast} pendingApprovals={pendingCount} />;
      case 'hr-records': return <HRRecords user={user} onBack={goBack} addToast={addToast} />;
      case 'attendance': return <Attendance user={user} onBack={goBack} addToast={addToast} />;
      case 'costs': return <Costs user={user} onBack={goBack} addToast={addToast} />;
      case 'warehouses': return <Warehouses user={user} onBack={goBack} addToast={addToast} />;
      case 'materials': return <MaterialCatalog user={user} onBack={goBack} onNavigate={navigateTo} addToast={addToast} />;
      case 'stock-in': return <StockIn user={user} onBack={goBack} addToast={addToast} initialStatus={pageParams?.status} />;
      case 'pending-approvals': return <PendingApprovals user={user} onBack={goBack} onNavigate={navigateTo} onRefreshCount={fetchPendingCount} addToast={addToast} />;
      case 'stock-out': return <StockOut user={user} onBack={goBack} addToast={addToast} />;
      case 'transfer': return <Transfer user={user} onBack={goBack} addToast={addToast} />;
      case 'cost-report': return <CostReport user={user} onBack={goBack} addToast={addToast} />;
      case 'cost-filter': return <CostFilter user={user} onBack={goBack} addToast={addToast} />;
      case 'advances': return <Advances user={user} onBack={goBack} addToast={addToast} />;
      case 'payroll': return <MonthlySalary user={user} onBack={goBack} addToast={addToast} />;
      case 'salary-settings':
        if (user.role !== 'Admin' && user.role !== 'Admin App') return <Dashboard user={user} onNavigate={navigateTo} addToast={addToast} pendingApprovals={pendingCount} />;
        return <SalarySettings user={user} onBack={goBack} addToast={addToast} />;
      case 'notes': return <Notes user={user} onBack={goBack} addToast={addToast} />;
      case 'notifications': return <Notifications user={user} onBack={goBack} onNavigate={navigateTo} addToast={addToast} />;
      case 'reminders': return <Reminders user={user} onBack={goBack} addToast={addToast} />;
      case 'partners': return <PlaceholderPage title="Khách hàng & nhà cung cấp" onBack={goBack} />;
      case 'inventory-report': return <InventoryReport user={user} onBack={goBack} addToast={addToast} />;
      
      // Production
      case 'production-list': return <ProductionOrders user={user} onBack={goBack} addToast={addToast} onOpenDetail={(id) => navigateTo('production-detail', { id })} />;
      case 'production-detail': return <ProductionOrderDetail user={user} orderId={pageParams?.id} onBack={goBack} addToast={addToast} />;
      case 'production-bom': return <BOMConfig user={user} onBack={goBack} addToast={addToast} />;

      case 'trash': return <Trash onNavigate={navigateTo} onBack={goBack} />;
      case 'user-manual': return <UserManual user={user} onBack={goBack} />;
      case 'deleted-warehouses': return <DeletedWarehouses onBack={goBack} addToast={addToast} />;
      case 'deleted-slips': return <DeletedSlips onBack={goBack} addToast={addToast} />;
      case 'deleted-employees': return <DeletedEmployees onBack={goBack} addToast={addToast} />;
      case 'deleted-costs': return <DeletedCosts onBack={goBack} addToast={addToast} />;
      case 'material-groups': return <MaterialGroups user={user} onBack={goBack} addToast={addToast} />;
      case 'backup-settings':
        if (user.role !== 'Admin' && user.role !== 'Admin App') return <Dashboard user={user} onNavigate={navigateTo} addToast={addToast} pendingApprovals={pendingCount} />;
        return <Backup onBack={goBack} addToast={addToast} />;
      case 'backup-now':
        if (user.role !== 'Admin' && user.role !== 'Admin App') return <Dashboard user={user} onNavigate={navigateTo} addToast={addToast} pendingApprovals={pendingCount} />;
        return <BackupNow onBack={goBack} addToast={addToast} />;
      case 'database-setup':
        if (user.role !== 'Admin App') return <Dashboard user={user} onNavigate={navigateTo} addToast={addToast} pendingApprovals={pendingCount} />;
        return <DatabaseSetup onBack={goBack} />;
      default: return (
        <div className="p-4 md:p-6 space-y-6">
          <PageBreadcrumb title={currentPage} onBack={goBack} />
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-4 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="p-6 bg-gray-100 rounded-full"><Package size={48} /></div>
            <p className="text-lg font-medium italic">Tính năng "{currentPage}" đang được phát triển...</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      <header className="bg-primary text-white h-14 flex items-center justify-between px-4 sticky top-0 z-[100] shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 hover:bg-white/10 p-1.5 rounded-xl transition-all active:scale-95"
          >
            <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center p-1 shadow-sm">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="font-bold text-sm tracking-wide hidden sm:block">QUẢN LÝ KHO CDX</h1>
          </button>

          <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" />

          <button
            onClick={() => navigateTo('dashboard')}
            className="hover:bg-white/10 p-2 rounded-xl transition-colors flex items-center gap-2 group"
            title="Về trang chủ"
          >
            <Home size={20} className="group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={() => {
              fetchPendingCount();
              setRefreshKey(prev => prev + 1);
            }}
            className="hover:bg-white/10 p-2 rounded-xl transition-colors flex items-center gap-2 group"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
          
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hover:bg-white/10 p-2 rounded-xl transition-colors flex items-center gap-2 group"
            title="Tìm kiếm toàn cục"
          >
            <Search size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative">
          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 bg-white/10 px-2 sm:px-3 py-1 rounded-full border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <UserIcon size={14} />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] sm:text-xs font-semibold truncate max-w-[80px] sm:max-w-none">{user.full_name}</span>
              <span className="text-[8px] opacity-70 hidden xs:block">{user.role}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </div>

          <AnimatePresence>
            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[70] text-gray-800"
                >
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tài khoản</p>
                    <p className="text-sm font-bold text-gray-800">{user.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{user.code || user.id.slice(0, 8)}</span>
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">{user.role}</span>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        navigateTo('hr-records');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                    >
                      <UserCircle size={18} className="text-gray-400" />
                      <span>Hồ sơ cá nhân</span>
                    </button>
                    <div className="h-px bg-gray-100 my-2 mx-2" />
                    <button
                      onClick={() => setUser(null)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="font-bold">Đăng xuất</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed top-14 inset-x-0 bottom-0 bg-black/20 backdrop-blur-sm z-[60] lg:hidden"
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0 z-[60] lg:z-30 fixed lg:relative top-14 lg:top-0 h-[calc(100vh-3.5rem)] w-[280px] shadow-2xl lg:shadow-none custom-scrollbar"
            >
              <div className="p-4 space-y-6 pb-44 lg:pb-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase">Menu</h2>
                </div>

                <div className="space-y-6">
                  <SidebarItem
                    icon={LayoutDashboard}
                    label="Trang chủ"
                    active={currentPage === 'dashboard'}
                    onClick={() => {
                      navigateTo('dashboard');
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                  />

                  {filteredMenuGroups.map((group, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-300 px-4 mb-2 tracking-wider">{group.title}</p>
                      {group.items.map((item) => (
                        <SidebarItem
                          key={item.id}
                          icon={item.icon}
                          label={item.label}
                          active={currentPage === item.id}
                          badge={item.badge}
                          onClick={() => {
                            navigateTo(item.id);
                            if (window.innerWidth < 1024) setIsSidebarOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main key={refreshKey} className="flex-1 overflow-y-auto relative bg-[#F8F9FA] pb-44 lg:pb-0">
          {renderContent()}

          <footer className="p-4 text-center text-[10px] text-gray-400 border-t border-gray-100 mt-auto">
            HỆ THỐNG QUẢN LÝ CÔNG TY CON ĐƯỜNG XANH © 2026
          </footer>
        </main>
      </div>
      <BottomNav currentPage={currentPage} onNavigate={navigateTo} user={user} pendingCount={pendingCount} />
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onNavigate={navigateTo} />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
