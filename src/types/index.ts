export type UserRole = 'Admin App' | 'Admin' | 'User';

export interface Employee {
  id: string; // Khóa chính (TEXT, e.g., 'admin', 'cdx001')
  code: string; // Mã nhân viên hiển thị (giống id trong schema v2)
  full_name: string;
  email?: string;
  phone?: string;
  id_card?: string;
  dob?: string;
  join_date?: string;
  tax_id?: string;
  app_pass: string; // Mật khẩu ứng dụng
  department?: string;
  position?: string;
  has_salary?: boolean;
  role: UserRole; // Phân quyền
  data_view_permission?: string;
  resign_date?: string;
  initial_budget?: number;
  status: 'Đang làm việc' | 'Hoạt động' | 'Nghỉ việc';
  created_at?: string;
}

export interface Material {
  id: string;
  code: string; // Mã vật tư (ví dụ: MAT001)
  name: string;
  group_id?: string;
  warehouse_id?: string;
  specification?: string;
  unit?: string;
  description?: string;
  image_url?: string;
  status?: string;
  created_at?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  manager_id?: string;
  coordinates?: string;
  capacity?: string;
  notes?: string;
  status?: string;
  created_at?: string;
}

export interface MaterialGroup {
  id: string;
  code?: string;
  name: string;
  notes?: string;
  status?: string;
  created_at?: string;
}

export interface Cost {
  id: string;
  cost_code: string;
  date: string;
  employee_id: string;
  cost_type: string;
  content?: string;
  material_id?: string;
  warehouse_id?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_amount?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockIn {
  id: string;
  import_code?: string;
  date: string;
  warehouse_id?: string;
  material_id?: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  total_amount?: number;
  employee_id?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockOut {
  id: string;
  export_code?: string;
  date: string;
  warehouse_id?: string;
  material_id?: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  total_amount?: number;
  employee_id?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Transfer {
  id: string;
  transfer_code?: string;
  date: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  material_id?: string;
  quantity: number;
  unit?: string;
  employee_id?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: 'present' | 'half-day' | 'absent';
  hours_worked: number;
  overtime_hours: number;
  created_at?: string;
}

export interface Advance {
  id: string;
  employee_id: string;
  date: string;
  amount: number;
  type: string; // 'Tạm ứng' | 'Phụ cấp'
  notes?: string;
  status?: string;
  created_at?: string;
}

export interface SalarySetting {
  id: string;
  employee_id: string;
  base_salary: number;
  daily_rate: number;
  insurance_deduction: number;
  created_at?: string;
}

export interface Note {
  id: string;
  employee_id?: string;
  date: string;
  content: string;
  type?: string;
  created_at?: string;
}

export interface Reminder {
  id: string;
  employee_id?: string;
  date: string;
  content: string;
  status?: string;
  created_at?: string;
}

export interface BOMConfig {
  id: string;
  product_item_id: string;
  name: string;
  is_two_stage?: boolean;
  notes?: string;
  created_at?: string;
}

export interface BOMItem {
  id: string;
  bom_id: string;
  material_item_id: string;
  quantity_per_unit: number;
  unit: string;
}

export interface ProductionOrder {
  id: string;
  order_code: string;
  bom_id: string;
  warehouse_id: string;
  output_warehouse_id: string;
  quantity: number;
  status: 'Mới' | 'Đã duyệt' | 'Hoàn thành' | 'Hủy';
  planned_date?: string;
  created_by?: string;
  approved_by?: string;
  notes?: string;
  created_at?: string;
}
