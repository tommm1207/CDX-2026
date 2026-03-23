-- CDX WAREHOUSE MANAGEMENT SYSTEM - FULL DATABASE SCHEMA
-- Generated: 2026-03-23
-- Target: Supabase (PostgreSQL)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. TABLES

-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    app_pass TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'User',
    status TEXT DEFAULT 'Đang làm việc',
    has_salary BOOLEAN DEFAULT true,
    data_view_permission TEXT,
    initial_budget NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'Hoạt động',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materials & Groups
CREATE TABLE IF NOT EXISTS material_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES material_groups(id),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    unit TEXT,
    specification TEXT,
    status TEXT DEFAULT 'Hoạt động',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Operations
CREATE TABLE IF NOT EXISTS stock_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_code TEXT UNIQUE,
    date DATE NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id) NOT NULL,
    material_id UUID REFERENCES materials(id) NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    unit_price NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    employee_id UUID REFERENCES users(id) NOT NULL,
    status TEXT DEFAULT 'Chờ duyệt',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_out (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    export_code TEXT UNIQUE,
    date DATE NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id) NOT NULL,
    material_id UUID REFERENCES materials(id) NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    unit_price NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    employee_id UUID REFERENCES users(id) NOT NULL,
    status TEXT DEFAULT 'Chờ duyệt',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_code TEXT UNIQUE,
    date DATE NOT NULL,
    from_warehouse_id UUID REFERENCES warehouses(id) NOT NULL,
    to_warehouse_id UUID REFERENCES warehouses(id) NOT NULL,
    material_id UUID REFERENCES materials(id) NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT,
    employee_id UUID REFERENCES users(id) NOT NULL,
    status TEXT DEFAULT 'Chờ duyệt',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance
CREATE TABLE IF NOT EXISTS costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cost_code TEXT UNIQUE,
    date DATE NOT NULL,
    transaction_type TEXT NOT NULL, -- 'Thu' hoặc 'Chi'
    cost_type TEXT, -- 'Doanh thu', 'Chi phí vật tư', etc.
    content TEXT NOT NULL,
    material_id UUID REFERENCES materials(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity NUMERIC,
    unit TEXT,
    unit_price NUMERIC,
    total_amount NUMERIC NOT NULL,
    employee_id UUID REFERENCES users(id) NOT NULL,
    status TEXT DEFAULT 'Đã duyệt',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HR & Payroll
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES users(id) NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'P', -- P: Present, A: Absent, etc.
    hours_worked NUMERIC DEFAULT 8,
    overtime_hours NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS salary_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES users(id) UNIQUE NOT NULL,
    base_salary NUMERIC DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    insurance_deduction NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES users(id) NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allowances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES users(id) NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production
CREATE TABLE IF NOT EXISTS bom_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    product_item_id UUID REFERENCES materials(id) NOT NULL,
    is_two_stage BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Hoạt động',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id UUID REFERENCES bom_configs(id) ON DELETE CASCADE,
    material_item_id UUID REFERENCES materials(id) NOT NULL,
    quantity_per_unit NUMERIC NOT NULL,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code TEXT UNIQUE NOT NULL,
    planned_date DATE NOT NULL,
    bom_id UUID REFERENCES bom_configs(id) NOT NULL,
    quantity NUMERIC NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id) NOT NULL, -- Kho nguyên liệu
    output_warehouse_id UUID REFERENCES warehouses(id) NOT NULL, -- Kho thành phẩm
    status TEXT DEFAULT 'Mới',
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT,
    reminder_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title TEXT,
    content TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRIGGERS FOR UPDATED_AT
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_update_updated_at ON %I', t);
        EXECUTE format('CREATE TRIGGER tr_update_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t);
    END LOOP;
END;
$$;

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_stock_in_material ON stock_in(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_warehouse ON stock_in(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_status ON stock_in(status);
CREATE INDEX IF NOT EXISTS idx_stock_out_material ON stock_out(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_warehouse ON stock_out(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_status ON stock_out(status);
CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_materials_group ON materials(group_id);
