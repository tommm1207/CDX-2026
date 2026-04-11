import { Package } from 'lucide-react';
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb';
import { LoginPage } from '@/components/auth/LoginPage';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { HRRecords } from '@/components/hr/HRRecords';
import { Attendance } from '@/components/hr/Attendance';
import { Advances } from '@/components/hr/Advances';
import { MonthlySalary } from '@/components/hr/MonthlySalary';
import { SalarySettings } from '@/components/hr/SalarySettings';
import { Costs } from '@/components/finance/Costs';
import { CostReport } from '@/components/finance/CostReport';
import { CostFilter } from '@/components/finance/CostFilter';
import { PendingApprovals } from '@/components/finance/PendingApprovals';
import { StockIn } from '@/components/inventory/StockIn';
import { StockOut } from '@/components/inventory/StockOut';
import { Transfer } from '@/components/inventory/Transfer';
import { InventoryReport } from '@/components/inventory/InventoryReport';
import { Warehouses } from '@/components/warehouses/Warehouses';
import { MaterialGroups } from '@/components/materials/MaterialGroups';
import { MaterialCatalog } from '@/components/materials/MaterialCatalog';
import { PlaceholderPage } from '@/components/materials/PlaceholderPage';
import { BOMConfig } from '@/components/production/BOMConfig';
import { ProductionOrders } from '@/components/production/ProductionOrders';
import { ProductionOrderDetail } from '@/components/production/ProductionOrderDetail';
import { Trash } from '@/components/trash/Trash';
import { DeletedWarehouses } from '@/components/trash/DeletedWarehouses';
import { DeletedMaterials } from '@/components/trash/DeletedMaterials';
import { DeletedSlips } from '@/components/trash/DeletedSlips';
import { DeletedEmployees } from '@/components/trash/DeletedEmployees';
import { DeletedCosts } from '@/components/trash/DeletedCosts';
import { DeletedProductionOrders } from '@/components/trash/DeletedProductionOrders';
import { Notes } from '@/components/notes/Notes';
import { Reminders } from '@/components/reminders/Reminders';
import { Backup } from '@/components/settings/Backup';
import { BackupNow } from '@/components/settings/BackupNow';
import { Notifications } from '@/components/notifications/Notifications';
import { DatabaseSetup } from '@/components/settings/DatabaseSetup';
import { Employee } from '@/types';

interface AppRouterProps {
  currentPage: string;
  pageParams: any;
  user: Employee;
  pendingCount: number;
  navigateTo: (page: string, params?: any) => void;
  goBack: () => void;
  addToast: (message: string, type?: any) => void;
  fetchPendingCount: () => void;
  setHideBottomNav: (hide: boolean) => void;
}

export const AppRouter = ({
  currentPage,
  pageParams,
  user,
  pendingCount,
  navigateTo,
  goBack,
  addToast,
  fetchPendingCount,
  setHideBottomNav
}: AppRouterProps) => {
  switch (currentPage) {
    case 'dashboard': return <Dashboard user={user} onNavigate={navigateTo} addToast={addToast} pendingApprovals={pendingCount} />;
    case 'hr-records': return <HRRecords user={user} onBack={goBack} addToast={addToast} />;
    case 'attendance': return <Attendance user={user} onBack={goBack} addToast={addToast} />;
    case 'costs': return <Costs user={user} onBack={goBack} addToast={addToast} initialAction={pageParams?.action} />;
    case 'warehouses': return <Warehouses user={user} onBack={goBack} addToast={addToast} />;
    case 'materials': return <MaterialCatalog user={user} onBack={goBack} onNavigate={navigateTo} addToast={addToast} />;
    case 'stock-in': return <StockIn user={user} onBack={goBack} addToast={addToast} initialStatus={pageParams?.status} initialAction={pageParams?.action} setHideBottomNav={setHideBottomNav} />;
    case 'pending-approvals': return <PendingApprovals user={user} onBack={goBack} onNavigate={navigateTo} onRefreshCount={fetchPendingCount} addToast={addToast} initialCount={pendingCount} />;
    case 'stock-out': return <StockOut user={user} onBack={goBack} addToast={addToast} initialAction={pageParams?.action} setHideBottomNav={setHideBottomNav} />;
    case 'transfer': return <Transfer user={user} onBack={goBack} addToast={addToast} initialAction={pageParams?.action} setHideBottomNav={setHideBottomNav} />;
    case 'cost-report': return <CostReport user={user} onBack={goBack} addToast={addToast} />;
    case 'cost-filter': return <CostFilter user={user} onBack={goBack} addToast={addToast} />;
    case 'advances': return <Advances user={user} onBack={goBack} addToast={addToast} initialAction={pageParams?.action} />;
    case 'payroll': return <MonthlySalary user={user} onBack={goBack} addToast={addToast} />;
    case 'salary-settings':
      if (!['Admin', 'Admin App'].includes(user.role)) return <Dashboard user={user} onNavigate={navigateTo} addToast={addToast} pendingApprovals={pendingCount} />;
      return <SalarySettings user={user} onBack={goBack} addToast={addToast} />;
    case 'notes': return <Notes user={user} onBack={goBack} addToast={addToast} initialAction={pageParams?.action} />;
    case 'notifications': return <Notifications user={user} onBack={goBack} onNavigate={navigateTo} addToast={addToast} />;
    case 'reminders': return <Reminders user={user} onBack={goBack} addToast={addToast} initialAction={pageParams?.action} setHideBottomNav={setHideBottomNav} />;
    case 'partners': return <PlaceholderPage title="Khách hàng & nhà cung cấp" onBack={goBack} />;
    case 'inventory-report': return <InventoryReport user={user} onBack={goBack} addToast={addToast} />;
    
    // Production
    case 'production-list': return <ProductionOrders user={user} onBack={goBack} addToast={addToast} onOpenDetail={(id) => navigateTo('production-detail', { id })} setHideBottomNav={setHideBottomNav} />;
    case 'production-detail': return <ProductionOrderDetail user={user} orderId={pageParams?.id} onBack={goBack} addToast={addToast} />;
    case 'production-bom': return <BOMConfig user={user} onBack={goBack} addToast={addToast} />;

    case 'trash': return <Trash onNavigate={navigateTo} onBack={goBack} />;
    case 'deleted-warehouses': return <DeletedWarehouses onBack={goBack} addToast={addToast} />;
    case 'deleted-materials': return <DeletedMaterials onBack={goBack} addToast={addToast} />;
    case 'deleted-slips': return <DeletedSlips onBack={goBack} addToast={addToast} />;
    case 'deleted-employees': return <DeletedEmployees onBack={goBack} addToast={addToast} />;
    case 'deleted-costs': return <DeletedCosts onBack={goBack} addToast={addToast} />;
    case 'deleted-production-orders': return <DeletedProductionOrders onBack={goBack} addToast={addToast} />;
    case 'material-groups': return <MaterialGroups user={user} onBack={goBack} addToast={addToast} />;
    case 'backup-settings':
      if (user.role !== 'Admin' && user.role !== 'Admin App') return <Dashboard user={user} onNavigate={navigateTo} addToast={addToast} pendingApprovals={pendingCount} />;
      return <Backup user={user} onBack={goBack} addToast={addToast} />;
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
