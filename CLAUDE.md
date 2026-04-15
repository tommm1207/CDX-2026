# CDX Team — Project Guide for Claude

## What is this?

**CDX ERP** — A Vietnamese construction company management system built with React + TypeScript + Supabase. Manages inventory, HR, payroll, production, and finance for a construction firm (Con Đường Xanh).

Deployed at: `cdx-team.vercel.app`

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Animations | Framer Motion (`motion/react`) |
| Icons | Lucide React |
| Excel export | SheetJS (`xlsx`) |
| State | Local React state (no Redux/Zustand) |

---

## Folder Structure

```
src/
├── components/
│   ├── auth/          → LoginPage
│   ├── dashboard/     → Dashboard (home screen)
│   ├── finance/       → Costs, CostReport, CostFilter, PendingApprovals
│   ├── hr/            → HRRecords, Attendance, AttendanceTable, Advances, MonthlySalary, SalarySettings
│   ├── inventory/     → StockIn, StockOut, Transfer, InventoryReport
│   ├── layout/        → BottomNav, SidebarItem
│   ├── materials/     → MaterialCatalog, MaterialGroups
│   ├── notes/         → Notes
│   ├── notifications/ → Notifications
│   ├── production/    → BomManager, MaterialSplitMerge, SanXuatCoc, ConstructionDiary, ProductionOrders
│   ├── reminders/     → Reminders
│   ├── settings/      → Backup, BackupNow, DatabaseSetup
│   ├── shared/        → Reusable UI components (Button, ConfirmModal, NumericInput, etc.)
│   ├── trash/         → Soft-delete recovery screens (one per domain)
│   └── warehouses/    → Warehouses
├── constants/
│   ├── menu.tsx       → Navigation menu config (all routes + icons)
│   └── options.ts     → Dropdown options (cost types, status values, etc.)
├── hooks/
│   ├── useInventoryData.ts  → Fetches materials + warehouses combo
│   └── useTableCapture.ts   → html2canvas wrapper for saving table as image
├── layouts/
│   └── MainLayout.tsx → App shell: sidebar (desktop) + bottom nav (mobile), toast, search
├── lib/
│   ├── supabase.ts    → Supabase client init
│   └── webPush.ts     → Web push notification registration
├── routes/
│   └── AppRouter.tsx  → Switch-case router (no React Router — custom navigation)
├── types/
│   └── index.ts       → All shared TypeScript types (Employee, etc.)
└── utils/
    ├── inventory.ts       → Core inventory math: tồn kho, nhập, xuất, chuyển kho, validation
    ├── format.ts          → Currency, number, date formatters + numberToWords
    ├── helpers.ts         → isUUID, slugify, generateCode, getAllowedWarehouses
    ├── codeGenerator.ts   → Smart sequential code generation
    ├── excelExport.ts     → Excel workbooks with CDX branding
    ├── excelHelper.ts     → Excel column mappings for each domain
    ├── reportExport.ts    → Capture DOM element → PNG export
    ├── logoCompositor.ts  → Inject company logo into captured images
    ├── logoBase64.ts      → ⚠️ 613 KB base64 logo string (bundle bloat — candidate for /public)
    ├── dataIntegrity.ts   → Check if records are referenced before delete
    ├── dataFixer.ts       → One-off data migration utilities
    ├── imageUpload.ts     → Compress + upload images to ImgBB
    ├── lunar.ts           → Solar → Lunar calendar conversion (for Vietnamese holidays)
    └── reminderUtils.ts   → Serialize/deserialize reminder content JSON
```

Each folder (except `layouts/`, `lib/`, `routes/`) has an `index.ts` barrel export.

---

## Navigation / Routing

**No React Router.** Custom navigation via `MainLayout.tsx`:
- `currentPage` string state (e.g. `'stock-in'`, `'bom-lenh-sx'`)
- `navigateTo(page, params?)` function passed down as props
- `AppRouter.tsx` is a big switch-case that renders the right component

Menu items are defined in `src/constants/menu.tsx` with `{ id, label, icon }`.

---

## Key Database Tables

| Table | Purpose |
|-------|---------|
| `materials` | Material catalog (`status: 'Đã xóa'` = soft deleted) |
| `material_groups` | Material categories |
| `warehouses` | Warehouse list |
| `stock_in` | Inbound slips (import_code prefix identifies source) |
| `stock_out` | Outbound slips (export_code prefix identifies source) |
| `transfers` | Warehouse-to-warehouse transfers |
| `employees` | Employee records |
| `attendance` | Daily attendance entries |
| `advances` | Employee advances/loans |
| `costs` | Cost/expense entries |
| `san_pham_bom` | Bill of Materials (BOM / Định mức) headers |
| `san_pham_bom_chi_tiet` | BOM line items (material + dinh_muc quantity) |
| `xasa_gop_phieu` | Split/Merge slips (Xả/Gộp) |
| `xasa_gop_chi_tiet` | Split/Merge line items |

---

## Slip Code Prefixes (import_code / export_code)

These prefixes identify where a stock slip was generated from:

| Prefix | Format | Source |
|--------|--------|--------|
| `XA{YYYYMMDD}-{rand}` | e.g. `XA20260415-1234` | Xả (split) operation |
| `GOP{YYYYMMDD}-{rand}` | e.g. `GOP20260415-5678` | Gộp (merge) operation |
| `SX-{YYYYMMDD}-{n}` | e.g. `SX-20260415-1` | Sản xuất Cọc (pile production) |
| `START-{code}` | e.g. `START-VT001` | Opening stock (khai báo đầu kỳ) |

**Rule:** Slips with XA/GOP/SX prefixes **cannot be approved from StockIn/StockOut screens** — must be approved from their source screen (Xả/Gộp or Lệnh sản xuất cọc).

---

## Inventory Logic

```
tồn kho (available) = Σ stock_in[Đã duyệt] + Σ transfer_in[Đã duyệt]
                    - Σ stock_out[Đã duyệt + Chờ duyệt]   ← pending out is RESERVED
                    - Σ transfer_out[Đã duyệt]
```

Key file: `src/utils/inventory.ts` — all tồn kho calculations live here.

---

## Status Values (Vietnamese)

| Value | Meaning |
|-------|---------|
| `Chờ duyệt` | Pending approval |
| `Đã duyệt` | Approved |
| `Từ chối` | Rejected |
| `Đã xóa` | Soft deleted |
| `Đang sử dụng` | Active (materials) |

---

## User Roles

| Role | Vietnamese | Access |
|------|-----------|--------|
| `Admin` | Quản trị | Full access |
| `Develop` | Developer | Full access + DatabaseSetup |
| `Manager` | Quản lý | Most features, no admin settings |
| `Staff` | Nhân viên | Limited (own attendance, costs) |

Check: `const isAdmin = ['admin', 'develop'].includes(user.role?.toLowerCase())`

---

## Soft Delete Pattern

Records are never hard-deleted in production. Instead: `status = 'Đã xóa'`.  
Recovery screens live in `src/components/trash/` — one file per domain.

---

## Common Shared Components

| Component | Purpose |
|-----------|---------|
| `ConfirmModal` | Reusable yes/no confirmation dialog (type: danger/warning/info) |
| `PageBreadcrumb` | Page title + back button |
| `NumericInput` | Number input with formatting |
| `CreatableSelect` | Searchable dropdown that can create new options |
| `FAB` | Floating action button (green +) |
| `Toast` | Toast notification system |
| `QuickAddMaterialModal` | Add a new material inline from any form |

---

## Known Large Files (candidates for future refactoring)

| File | Lines | Notes |
|------|-------|-------|
| `MaterialSplitMerge.tsx` | ~1900 | Handles both Xả and Gộp flows |
| `StockOut.tsx` | ~1420 | Full CRUD + approval + history |
| `Transfer.tsx` | ~1410 | Similar to StockOut |
| `MonthlySalary.tsx` | ~1210 | Salary calculation + export |
| `ConstructionDiary.tsx` | ~1194 | Diary with image attachments |

These work correctly — refactoring is deferred.

---

## Environment

- **Platform:** Windows 11, bash shell
- **Dev server:** `npm run dev` (Vite, port 3000)
- **Branches:** `develop` (active), `main` (production mirror)
- **Deployment:** Vercel (auto-deploy from main)
