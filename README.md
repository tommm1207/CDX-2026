# CDX — Hệ Thống Quản Lý Kho & Nhân Sự

<div align="center">
  <p><strong>PWA quản lý kho vật tư, nhân sự, sản xuất và tài chính cho công ty xây dựng Con Đường Xanh.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
    <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" />
  </p>
</div>

---

## Tính năng

| Module | Chức năng |
|--------|-----------|
| **Kho vật tư** | Nhập kho, xuất kho, chuyển kho, báo cáo tồn kho |
| **Sản xuất** | Định mức sản xuất (BOM), Xả/Gộp vật tư, Lệnh sản xuất cọc, Nhật ký thi công |
| **Nhân sự** | Hồ sơ nhân viên, chấm công, tạm ứng, bảng lương |
| **Tài chính** | Chi phí, báo cáo, phê duyệt |
| **Hệ thống** | Phân quyền theo role, thùng rác (soft delete), backup, thông báo |

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Icons**: Lucide React
- **Excel**: SheetJS (`xlsx`)

---

## Cài đặt

```bash
git clone https://github.com/tommm1207/CDX-Team.git
cd CDX-Team
npm install
```

Tạo file `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev    # dev server tại http://localhost:3000
npm run build  # production build → dist/
```

---

## Cấu trúc thư mục

```
src/
├── components/     # UI theo domain (inventory, hr, production, ...)
│   └── shared/     # Reusable components (Button, ConfirmModal, ...)
├── hooks/          # Custom React hooks
├── layouts/        # App shell (sidebar + bottom nav)
├── routes/         # AppRouter — switch-case routing (không dùng React Router)
├── constants/      # menu.tsx, options.ts
├── types/          # TypeScript types
├── utils/          # Business logic (inventory, format, excel, ...)
└── lib/            # Supabase client, web push
```

Mỗi thư mục có `index.ts` barrel export.

---

<div align="center">
  <p>Phát triển bởi <b>CDX TEAM — Nguyễn Khôi Nguyên (Tom)</b></p>
  <p><i>"Cộng tác để vươn xa"</i></p>
</div>
