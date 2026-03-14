-- SQL Schema v2 for Comprehensive App Audit and Fix
-- This schema includes all tables used in the application.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users (Nhân sự)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Mã nhân viên (e.g., NV01)
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    id_card TEXT,
    dob DATE,
    join_date DATE DEFAULT CURRENT_DATE,
    tax_id TEXT,
    app_pass TEXT NOT NULL,
    department TEXT,
    position TEXT,
    has_salary BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'User',
    data_view_permission TEXT,
    avatar_url TEXT,
    resign_date DATE,
    initial_budget NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Đang làm việc',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Material Groups (Nhóm vật tư)
CREATE TABLE IF NOT EXISTS public.material_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Warehouses (Kho bãi)
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    manager_id TEXT REFERENCES public.users(id),
    coordinates TEXT,
    capacity TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Đang sử dụng',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Materials (Danh mục Vật tư)
CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    group_id UUID REFERENCES public.material_groups(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    specification TEXT,
    unit TEXT,
    description TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'Đang sử dụng',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Costs (Quản lý chi phí)
CREATE TABLE IF NOT EXISTS public.costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_code TEXT NOT NULL, -- Format: [EmployeeID]-[DDMMYY]
    date DATE NOT NULL,
    employee_id TEXT REFERENCES public.users(id) NOT NULL,
    cost_type TEXT NOT NULL, -- Vật tư, Xăng dầu, Ăn uống, Vận chuyển, Khác
    content TEXT,
    material_id TEXT REFERENCES public.materials(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    unit_price NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Stock In (Nhập kho)
CREATE TABLE IF NOT EXISTS public.stock_in (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_code TEXT,
    date DATE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id),
    material_id TEXT REFERENCES public.materials(id),
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    unit_price NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    employee_id TEXT REFERENCES public.users(id),
    status TEXT DEFAULT 'Chờ duyệt',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Stock Out (Xuất kho)
CREATE TABLE IF NOT EXISTS public.stock_out (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_code TEXT,
    date DATE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id),
    material_id TEXT REFERENCES public.materials(id),
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    unit_price NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    employee_id TEXT REFERENCES public.users(id),
    status TEXT DEFAULT 'Chờ duyệt',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Transfers (Điều chuyển kho)
CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_code TEXT,
    date DATE NOT NULL,
    from_warehouse_id UUID REFERENCES public.warehouses(id),
    to_warehouse_id UUID REFERENCES public.warehouses(id),
    material_id TEXT REFERENCES public.materials(id),
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    employee_id TEXT REFERENCES public.users(id),
    status TEXT DEFAULT 'Chờ duyệt',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Inventory (Tồn kho hiện tại — cập nhật mỗi khi nhập/xuất/chuyển kho)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id TEXT REFERENCES public.materials(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(material_id, warehouse_id)
);

-- 9. Attendance (Chấm công)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT REFERENCES public.users(id) NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'present', -- present, half-day, absent
    hours_worked NUMERIC DEFAULT 8,
    overtime_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Advances & Allowances (Tạm ứng & Phụ cấp)
CREATE TABLE IF NOT EXISTS public.advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT REFERENCES public.users(id) NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC DEFAULT 0,
    type TEXT NOT NULL, -- Tạm ứng, Phụ cấp
    notes TEXT,
    status TEXT DEFAULT 'Chờ duyệt',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Allowances (Phụ cấp riêng - nếu cần)
CREATE TABLE IF NOT EXISTS public.allowances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT REFERENCES public.users(id) NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC DEFAULT 0,
    type TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Chờ duyệt',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Salary Settings (Cài đặt lương)
CREATE TABLE IF NOT EXISTS public.salary_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT REFERENCES public.users(id) UNIQUE NOT NULL,
    base_salary NUMERIC DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    insurance_deduction NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Notes (Nhật ký / Ghi chú)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT REFERENCES public.users(id),
    date DATE NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Reminders (Thiết lập Lịch nhắc)
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT REFERENCES public.users(id),
    date DATE NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow all for simplicity in this app)
CREATE POLICY "Allow all access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to material_groups" ON public.material_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to warehouses" ON public.warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to costs" ON public.costs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to stock_in" ON public.stock_in FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to stock_out" ON public.stock_out FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to transfers" ON public.transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to advances" ON public.advances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to allowances" ON public.allowances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to salary_settings" ON public.salary_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to notes" ON public.notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to reminders" ON public.reminders FOR ALL USING (true) WITH CHECK (true);
