-- CDX Warehouse Management — Database Performance Indexes
-- Dùng DO $$ để bỏ qua lỗi nếu cột không tồn tại trong DB thực tế.
-- An toàn: chạy nhiều lần không lỗi.

DO $$
BEGIN

  -- Stock In (chắc chắn có warehouse_id, material_id, status, date)
  CREATE INDEX IF NOT EXISTS idx_stock_in_warehouse_id ON stock_in(warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_stock_in_material_id ON stock_in(material_id);
  CREATE INDEX IF NOT EXISTS idx_stock_in_status ON stock_in(status);
  CREATE INDEX IF NOT EXISTS idx_stock_in_date ON stock_in(date);

  -- Stock Out
  CREATE INDEX IF NOT EXISTS idx_stock_out_warehouse_id ON stock_out(warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_stock_out_material_id ON stock_out(material_id);
  CREATE INDEX IF NOT EXISTS idx_stock_out_status ON stock_out(status);
  CREATE INDEX IF NOT EXISTS idx_stock_out_date ON stock_out(date);

  -- Transfers
  CREATE INDEX IF NOT EXISTS idx_transfers_from_wh ON transfers(from_warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_to_wh ON transfers(to_warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_material_id ON transfers(material_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
  CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date);

  -- Costs
  CREATE INDEX IF NOT EXISTS idx_costs_warehouse_id ON costs(warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_costs_employee_id ON costs(employee_id);
  CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(date);
  CREATE INDEX IF NOT EXISTS idx_costs_status ON costs(status);
  CREATE INDEX IF NOT EXISTS idx_costs_transaction_type ON costs(transaction_type);

  -- Attendance
  CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

  -- Production Orders
  CREATE INDEX IF NOT EXISTS idx_production_orders_warehouse_id ON production_orders(warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
  CREATE INDEX IF NOT EXISTS idx_production_orders_created_at ON production_orders(created_at);

  -- Materials
  CREATE INDEX IF NOT EXISTS idx_materials_group_id ON materials(group_id);

  -- BOM Items
  CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON bom_items(bom_id);
  CREATE INDEX IF NOT EXISTS idx_bom_items_material_id ON bom_items(material_item_id);

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Một số index bị lỗi (cột không tồn tại), bỏ qua: %', SQLERRM;
END $$;
