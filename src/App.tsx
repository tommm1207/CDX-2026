import { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { REMINDER_CHECK_INTERVAL } from '@/constants/options';
import { getMenuGroups } from '@/constants/menu';

// Shared Components
import { ToastContainer, ToastMessage, ToastType } from '@/components/shared/Toast';

// Layout & Router
import { MainLayout } from '@/layouts/MainLayout';
import { AppRouter } from '@/routes/AppRouter';

// Auth
import { LoginPage } from '@/components/auth/LoginPage';

export default function App() {
  const [user, setUser] = useState<Employee | null>(null);
  
  // Check for missing configuration
  const isConfigMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState<any>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
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

  const fetchPendingCount = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  // Real-time pending count updates
  useEffect(() => {
    if (!user) return;
    fetchPendingCount();

    const channel = supabase
      .channel('pending-count-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_in' }, fetchPendingCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_out' }, fetchPendingCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, fetchPendingCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'costs' }, fetchPendingCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPendingCount]);

  // Reminders / Notifications
  useEffect(() => {
    if (!user) return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

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
        if (currentPage === 'reminders') setRefreshKey(prev => prev + 1);
      }
    }, REMINDER_CHECK_INTERVAL);

    return () => clearInterval(checkReminders);
  }, [user, currentPage]);

  const navigateTo = useCallback((page: string, params: any = null) => {
    if (page !== currentPage || params !== pageParams) {
      setNavigationHistory(prev => [...prev, currentPage]);
      setCurrentPage(page);
      setPageParams(params);
    }
  }, [currentPage, pageParams]);

  const goBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const prevPage = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentPage(prevPage);
    } else {
      setCurrentPage('dashboard');
    }
  }, [navigationHistory]);

  const filteredMenuGroups = useMemo(() => {
    if (!user) return [];
    return getMenuGroups(pendingCount).map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (user.role === 'User') {
          return ['stock-in', 'stock-out', 'transfer', 'attendance', 'cost-report', 'production-list', 'production-detail'].includes(item.id);
        }
        if (user.role === 'Admin') return item.id !== 'database-setup';
        return true; // Admin App sees everything
      }).map(item => item.id === 'pending-approvals' ? { ...item, badge: pendingCount } : item)
    })).filter(group => group.items.length > 0);
  }, [user, pendingCount]);

  if (isConfigMissing) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-6 text-center z-[999]">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <Settings2 size={32} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Thiếu cấu hình hệ thống</h1>
        <p className="text-sm text-gray-500 max-w-sm mb-6">Vui lòng thiết lập <strong>VITE_SUPABASE_URL</strong> và <strong>VITE_SUPABASE_ANON_KEY</strong> trong Vercel.</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20">Thử lại</button>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <>
      <MainLayout
        user={user}
        pendingCount={pendingCount}
        currentPage={currentPage}
        refreshKey={refreshKey}
        filteredMenuGroups={filteredMenuGroups}
        onNavigate={navigateTo}
        onLogout={() => setUser(null)}
        onRefresh={() => { fetchPendingCount(); setRefreshKey(prev => prev + 1); }}
      >
        <AppRouter 
          currentPage={currentPage}
          pageParams={pageParams}
          user={user}
          pendingCount={pendingCount}
          navigateTo={navigateTo}
          goBack={goBack}
          addToast={addToast}
          fetchPendingCount={fetchPendingCount}
        />
      </MainLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
