export type UserRole = 'Admin App' | 'Admin' | 'User';

export interface Employee {
  id: string; // Mã nhân viên (ID)
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

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: 'present' | 'half-day' | 'absent';
  hours_worked: number;
  overtime_hours: number;
}
