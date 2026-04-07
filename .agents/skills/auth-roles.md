# Phân quyền — CDX Team

## Bảng Role

| Role | Mô tả | Ai dùng |
|------|-------|---------|
| `Admin App` | Toàn quyền kể cả cấu hình Database | Kỹ thuật viên CDX |
| `Admin` | Quản lý đầy đủ, không cấu hình hệ thống | Quản lý công ty |
| `User` | Chỉ nhập liệu cơ bản | Nhân viên kho, công nhân |

## Quyền theo Tính năng

| Tính năng | Admin App | Admin | User |
|-----------|:---------:|:-----:|:----:|
| Dashboard | ✅ | ✅ | ❌ |
| Nhập/Xuất/Chuyển kho | ✅ | ✅ | ✅ (chỉ tạo) |
| Chấm công | ✅ | ✅ | ✅ (xem của mình) |
| Chi phí | ✅ | ✅ | ❌ |
| Báo cáo chi phí | ✅ | ✅ | ❌ |
| Phiếu duyệt | ✅ | ✅ (duyệt được) | ❌ |
| Quản lý nhân sự | ✅ | ✅ | ❌ |
| Cài đặt lương | ✅ | ✅ | ❌ |
| Tổng hợp lương | ✅ | ✅ | ❌ |
| Lệnh sản xuất | ✅ | ✅ | ✅ (xem) |
| Định mức BOM | ✅ | ✅ | ❌ |
| Nhóm/Danh mục vật tư | ✅ | ✅ | ❌ |
| Thùng rác / Restore | ✅ | ✅ | ❌ |
| Backup | ✅ | ✅ | ❌ |
| Cấu hình Database | ✅ | ❌ | ❌ |
| Ghi chú / Lịch nhắc | ✅ | ✅ | ✅ |

## Kiểm tra Role trong Code

```tsx
// App.tsx — filteredMenuGroups
if (user.role === 'User') {
  const allowed = ['stock-in', 'stock-out', 'transfer', 'attendance', 'cost-report', 'production-list'];
  return allowed.includes(item.id);
}
if (user.role === 'Admin') return item.id !== 'database-setup';
if (user.role === 'Admin App') return true;

// renderContent — bảo vệ trang nhạy cảm
case 'salary-settings':
  if (!['Admin', 'Admin App'].includes(user.role))
    return <Dashboard ... />;
  return <SalarySettings ... />;
```

## data_view_permission

Trường `data_view_permission` trên bảng `users` dùng để giới hạn User chỉ xem dữ liệu của kho cụ thể.

```ts
// src/utils/helpers.js
export function getAllowedWarehouses(permission?: string): string[] | null {
  if (!permission) return null; // null = xem tất cả
  return permission.split(',').map(id => id.trim());
}
```

Format: chuỗi `"wh-id-1,wh-id-2"` hoặc `null` (không giới hạn).
