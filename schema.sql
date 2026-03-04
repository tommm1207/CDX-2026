-- 1. Bảng Nhân sự (Users)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Mã nhân viên
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

-- 2. Bảng Kho bãi (Warehouses)
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    manager_id TEXT REFERENCES public.users(id),
    coordinates TEXT,
    capacity TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Nhóm vật tư (Material Groups)
CREATE TABLE IF NOT EXISTS public.material_groups (
    id TEXT PRIMARY KEY, -- NVT01, NVT02...
    name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng Danh mục Vật tư (Materials)
CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_id TEXT REFERENCES public.material_groups(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    specification TEXT,
    unit TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bật RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- 6. Chính sách truy cập (Allow all)
CREATE POLICY "Allow all access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to warehouses" ON public.warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to material_groups" ON public.material_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);
