# CLAUDE.md — CDX Project Guide

## App Summary
Vietnamese construction company ERP (Con Đường Xanh). Manages inventory, HR/payroll, production, and finance. React + TypeScript + Supabase. Deployed: `cdx-team.vercel.app`.

## Tech
React 18, TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL), Framer Motion (`motion/react`), Lucide React, SheetJS.

## Routing (IMPORTANT)
**No React Router.** Custom string-based navigation in `MainLayout.tsx`:
- `currentPage` = route string (e.g. `'stock-in'`)
- `navigateTo(page, params?)` passed as props
- `AppRouter.tsx` = big switch-case
- Menu items defined in `src/constants/menu.tsx` as `{ id, label, icon }`

## Folder Structure
```
src/
├── components/{domain}/  # Each has index.ts barrel export
│   ├── auth, dashboard, finance, hr, inventory
│   ├── layout, materials, notes, notifications
│   ├── production, reminders, settings, trash, warehouses
│   └── shared/           # Reusable UI (Button, ConfirmModal, FAB, etc.)
├── hooks/                # useInventoryData, useTableCapture
├── layouts/MainLayout.tsx
├── routes/AppRouter.tsx
├── constants/menu.tsx, options.ts
├── types/index.ts
├── utils/                # Has index.ts. Key: inventory.ts, format.ts, helpers.ts
└── lib/supabase.ts
```

## Key Business Rules

### Slip Code Prefixes (import_code / export_code)
| Prefix | Source | Note |
|--------|--------|------|
| `XA{YYYYMMDD}-{rand}` | Xả (split) | No dash after XA |
| `GOP{YYYYMMDD}-{rand}` | Gộp (merge) | No dash after GOP |
| `SX-{YYYYMMDD}-{n}` | Sản xuất Cọc | Has dash |
| `START-{code}` | Khai báo đầu kỳ | |

**Rule:** XA/GOP/SX slips → block approve/reject in StockIn/StockOut. Must go through source screen.
**Check:** `.startsWith('XA')`, `.startsWith('GOP')`, `.startsWith('SX-')`

### Inventory Math
```
tồn kho = Σ stock_in[Đã duyệt] + Σ transfer_in[Đã duyệt]
        - Σ stock_out[Đã duyệt + Chờ duyệt]  ← pending out RESERVED
        - Σ transfer_out[Đã duyệt]
```
All logic in `src/utils/inventory.ts`.

### Status Values
`Chờ duyệt` | `Đã duyệt` | `Từ chối` | `Đã xóa` (soft delete) | `Đang sử dụng` (materials)

### Soft Delete
Never hard-delete. Set `status = 'Đã xóa'`. Recovery in `src/components/trash/`.

### Roles
`Admin`, `Develop` = full access. Check: `['admin','develop'].includes(user.role?.toLowerCase())`

## Key DB Tables
`materials`, `material_groups`, `warehouses`, `stock_in`, `stock_out`, `transfers`, `employees`, `attendance`, `advances`, `costs`, `san_pham_bom` (BOM headers), `san_pham_bom_chi_tiet` (BOM items), `xasa_gop_phieu`, `xasa_gop_chi_tiet`

## Common Shared Components
`ConfirmModal` (props: show, title, message, confirmText, cancelText, onConfirm, onCancel, type: danger|warning|info)  
`PageBreadcrumb` (props: title, onBack)  
`FAB` (props: onClick, label)  
`NumericInput` (props: label, value, onChange)  
`CreatableSelect` (props: value, options, onChange, onCreate, placeholder, allowCreate)  
`QuickAddMaterialModal` (props: show, onClose, onSuccess, addToast, groups, warehouses, color, initialName)

## User Preferences (feedback from past sessions)
- Terse responses, no trailing summaries
- Mobile-first: modal must fit in 1 screen without scroll (use `max-h-[90dvh]`)
- No `window.confirm()` → always use `ConfirmModal`
- Vietnamese UI text throughout
- Don't push to GitHub unless explicitly asked
- Prefer `py-px leading-none` over `py-0.5` when keeping row height tight
- Slip badges: in "Trạng thái" column, left=source badge, right=status badge, `w-44` column

## Large Files (working, don't refactor without reason)
`MaterialSplitMerge.tsx` ~1900 lines, `StockOut.tsx` ~1420, `Transfer.tsx` ~1410, `MonthlySalary.tsx` ~1210

## Known Issue
`utils/logoBase64.ts` is 613 KB base64 string — should eventually move to `/public`. Not urgent.
