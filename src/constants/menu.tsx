import {
  Package,
  Settings,
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
  FileText,
  Filter,
  Trash2,
  Download,
  ClipboardCheck,
  Bell,
  BellRing,
  ClipboardList,
} from 'lucide-react';

export const getMenuGroups = (pendingCount: number) => [
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
      { id: 'notes', label: 'Nhật ký & Ghi chú', icon: FileText },
      { id: 'reminders', label: 'Thiết lập Lịch nhắc', icon: Bell },
      { id: 'database-setup', label: 'Cấu hình Database', icon: Settings2 },
      { id: 'trash', label: 'Thùng rác', icon: Trash2 },
    ]
  },
  {
    title: 'CÔNG CỤ SAO LƯU',
    items: [
      { id: 'backup-settings', label: 'Backup', icon: Settings },
      { id: 'backup-now', label: 'Sao lưu nhanh', icon: Download },
    ]
  }
];
