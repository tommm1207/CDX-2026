/**
 * Hằng số ánh xạ các tên cột kỹ thuật sang Tiếng Việt hiển thị trong Excel
 */
export const COLUMN_MAP: Record<string, string> = {
  // Common columns
  id: 'ID',
  code: 'Mã hiệu',
  name: 'Tên / Nội dung',
  created_at: 'Ngày tạo',
  updated_at: 'Ngày cập nhật',
  notes: 'Ghi chú',
  status: 'Trạng thái',
  date: 'Ngày',
  quantity: 'Số lượng',
  unit: 'Đơn vị tính',
  unit_price: 'Đơn giá',
  total_amount: 'Thành tiền',
  employee_id: 'Mã Nhân viên',
  warehouse_id: 'Mã Kho',
  material_id: 'Mã Vật tư',
  description: 'Mô tả chi tiết',
  type: 'Phân loại',

  // Employee / User related
  full_name: 'Họ và tên',
  email: 'Email liên hệ',
  phone: 'Số điện thoại',
  id_card: 'Số CMND/CCCD',
  dob: 'Ngày sinh',
  join_date: 'Ngày nhận việc',
  tax_id: 'Mã số thuế',
  department: 'Phòng ban / Bộ phận',
  position: 'Chức vụ',
  resign_date: 'Ngày nghỉ việc',
  role: 'Quyền hạn (Vai trò)',
  app_pass: 'Mật khẩu ứng dụng',

  // Inventory related
  import_code: 'Mã Nhập kho',
  export_code: 'Mã Xuất kho',
  transfer_code: 'Mã Chuyển kho',
  from_warehouse_id: 'Từ Kho',
  to_warehouse_id: 'Đến Kho',
  specification: 'Quy cách hồ sơ / Kỹ thuật',
  group_id: 'Nhóm vật tư',

  // Production related
  order_code: 'Mã Lệnh sản xuất',
  bom_id: 'Mã Định mức (BOM)',
  output_warehouse_id: 'Kho thành phẩm',
  planned_date: 'Ngày dự kiến hoàn thành',
  created_by: 'Người tạo lệnh',
  approved_by: 'Người duyệt lệnh',

  // Finance / Advances
  amount: 'Số tiền (VNĐ)',
  cost_code: 'Mã chi phí',
  cost_type: 'Loại chi phí',
  category: 'Danh mục',
  address: 'Địa chỉ',

  // Attendance
  hours_worked: 'Số giờ làm việc',
  overtime_hours: 'Số giờ tăng ca',

  // Others
  content: 'Nội dung chi tiết',
  title: 'Tiêu đề',
  is_done: 'Đã hoàn thành?',
};

/**
 * Hàm chuyển đổi mảng dữ liệu với các key kỹ thuật sang key tiếng Việt
 */
export const formatDataForExcel = (data: any[]) => {
  if (!data || data.length === 0) return [];

  return data.map(item => {
    const newItem: any = {};
    Object.keys(item).forEach(key => {
      const label = COLUMN_MAP[key] || key; // Nếu không có trong map thì giữ nguyên key cũ
      newItem[label] = item[key];
    });
    return newItem;
  });
};
