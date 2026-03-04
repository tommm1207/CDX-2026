-- SQL Schema for Cost Management and Dependencies

-- 1. Material Groups (Nhóm vật tư)
CREATE TABLE IF NOT EXISTS material_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Warehouses (Danh sách Kho)
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    manager_id TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Materials (Danh mục Vật tư)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES material_groups(id),
    name TEXT NOT NULL,
    unit TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Costs (Quản lý chi phí)
CREATE TABLE IF NOT EXISTS costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cost_code TEXT NOT NULL, -- Format: [EmployeeID]-[DDMMYY]
    date DATE NOT NULL,
    employee_id TEXT REFERENCES users(id) NOT NULL,
    cost_type TEXT NOT NULL, -- Vật tư, Xăng dầu, Ăn uống, Vận chuyển, Khác
    content TEXT,
    material_id UUID REFERENCES materials(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    unit_price NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE material_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all access to material_groups" ON material_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to warehouses" ON warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to materials" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to costs" ON costs FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample data for linking if tables are empty
-- (Optional, but helps user see the links immediately)
INSERT INTO material_groups (name) VALUES ('Vật tư xây dựng'), ('Công cụ dụng cụ'), ('Máy móc thiết bị') ON CONFLICT DO NOTHING;
INSERT INTO warehouses (name, location) VALUES ('Kho Tổng CDX', 'Hà Nội'), ('Bãi đúc Gò Công', 'Tiền Giang') ON CONFLICT DO NOTHING;
