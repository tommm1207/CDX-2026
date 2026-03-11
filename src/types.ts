export type UserRole = 'Admin App' | 'Admin' | 'User';

export interface Employee {
  id: string; // Khóa chính (UUID)
  code: string; // Mã nhân viên (ID hiển thị, ví dụ: cdx001)
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
  avatar_url?: string;
  resign_date?: string;
  initial_budget?: number;
  status: 'Đang làm việc' | 'Hoạt động' | 'Nghỉ việc';
}

export interface Material {
  id: string;
  code: string; // Mã vật tư (ví dụ: MAT001)
  name: string;
  group_id?: string;
  specification?: string;
  unit?: string;
  description?: string;
  image_url?: string;
  status?: string;
}

export interface Warehouse {
  id: string;
  code: string; // Mã kho (ví dụ: WH001)
  name: string;
  location?: string;
  manager_id?: string;
  status?: string;
}

export interface MaterialGroup {
  id: string;
  code: string; // Mã nhóm (ví dụ: GRP001)
  name: string;
  description?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: 'present' | 'half-day' | 'absent';
  hours_worked: number;
  overtime_hours: number;
}
