# CDX Team — Tổng quan Dự án

## Stack Công nghệ

| Thành phần | Công nghệ | Ghi chú |
|-----------|-----------|---------|
| Frontend | React 18 + TypeScript + Vite | SPA, PWA |
| Styling | Tailwind CSS | Không dùng component lib |
| Animation | Motion/React (Framer Motion) | Dùng cho modal, transitions |
| Backend | Supabase (PostgreSQL) | Auth không dùng — tự quản lý session |
| Deployment | Vercel | Auto-deploy từ nhánh `main` |
| Server phụ | Express (`server.ts`) | Chạy local cho backup, không cần trên Vercel |

## Cấu trúc Thư mục

```
CDX-Team/
├── .agents/               ← Tài liệu cho AI agents (thư mục này)
│   ├── CONTEXT.md         ← File này
│   ├── skills/            ← Hướng dẫn pattern cụ thể
│   └── workflows/         ← Quy trình làm việc
├── .github/workflows/     ← GitHub Actions CI
├── api/                   ← Serverless functions (Vercel)
├── database/              ← SQL schema và migrations
├── docs/                  ← Tài liệu người dùng
├── public/                ← Static assets
└── src/
    ├── App.tsx            ← Root component, routing, layout
    ├── types.ts           ← Tất cả TypeScript interfaces
    ├── supabaseClient.ts  ← Khởi tạo Supabase client
    ├── components/        ← Phân theo module nghiệp vụ
    │   ├── auth/          ← Đăng nhập
    │   ├── dashboard/     ← Trang chủ tổng hợp
    │   ├── finance/       ← Chi phí, báo cáo, phiếu duyệt
    │   ├── hr/            ← Nhân sự, chấm công, lương
    │   ├── inventory/     ← Nhập/xuất/chuyển kho
    │   ├── layout/        ← Header, Sidebar, BottomNav
    │   ├── materials/     ← Danh mục và nhóm vật tư
    │   ├── notes/         ← Ghi chú nội bộ
    │   ├── notifications/ ← Thông báo
    │   ├── production/    ← Lệnh sản xuất, định mức BOM
    │   ├── reminders/     ← Lịch nhắc
    │   ├── settings/      ← Backup, cấu hình hệ thống
    │   ├── shared/        ← Components tái sử dụng
    │   ├── trash/         ← Thùng rác (restore)
    │   └── warehouses/    ← Quản lý kho
    ├── constants/         ← Hằng số dùng chung
    ├── hooks/             ← Custom React hooks
    └── utils/             ← Hàm tiện ích thuần túy
```

## Phân quyền Người dùng

| Role | Xem | Tạo/Sửa | Duyệt | Cài đặt | Cấu hình DB |
|------|-----|---------|-------|---------|------------|
| `Admin App` | Tất cả | Tất cả | ✅ | ✅ | ✅ |
| `Admin` | Tất cả | Tất cả | ✅ | ✅ | ❌ |
| `User` | Giới hạn | Giới hạn | ❌ | ❌ | ❌ |

Chi tiết xem: `.agents/skills/auth-roles.md`

## Database Tables Chính

| Bảng | Nội dung |
|------|---------|
| `users` | Nhân viên, phân quyền, mật khẩu app |
| `materials` | Danh mục vật tư (`group_id` FK → `material_groups`) |
| `material_groups` | Nhóm vật tư |
| `warehouses` | Kho hàng |
| `stock_in` | Phiếu nhập kho |
| `stock_out` | Phiếu xuất kho |
| `transfers` | Phiếu luân chuyển |
| `costs` | Chi phí |
| `attendance` | Chấm công |
| `advances` | Tạm ứng & phụ cấp |
| `salary_settings` | Cài đặt lương theo nhân viên |
| `production_orders` | Lệnh sản xuất |
| `bom_configs` | Định mức sản xuất |
| `bom_items` | Chi tiết vật tư trong BOM |
| `notes` | Ghi chú |
| `reminders` | Lịch nhắc |
| `backup_config` | Cấu hình sao lưu tự động |

## Quy ước Quan trọng

### Soft Delete
Xóa mềm: set `status = 'Đã xóa'`, không xóa cứng. Truy vấn phải luôn lọc:
```ts
.neq('status', 'Đã xóa')
// hoặc
.or('status.is.null,status.neq.Đã xóa')
```

### Authentication
Không dùng Supabase Auth. Người dùng đăng nhập bằng `id` + `app_pass` so sánh với bảng `users`. State lưu trong React (`useState`).

### Trạng thái Phiếu
`Chờ duyệt` → `Đã duyệt` | `Từ chối` | `Đã xóa`

### Mã Code Tự Động
- Nhân viên: `cdx001`, `cdx002`...
- Vật tư: `VAT001-001`, `VAT002-001`...
- Nhóm vật tư: `VAT001`, `VAT002`...
- Chi phí: Sinh từ ngày + employee_id
