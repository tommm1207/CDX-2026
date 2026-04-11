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
  employee_id: 'Nhân viên',
  warehouse_id: 'Kho hàng',
  material_id: 'Vật tư',
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
 * Kết hợp tra cứu ID để hiển thị Tên (Nhân viên, Kho, Vật tư)
 */
export const formatDataForExcel = (data: any[], lookupData: any = {}) => {
  if (!data || data.length === 0) return [];

  // Tạo lookup map nếu có truyền vào
  const userMap = lookupData.users
    ? Object.fromEntries(lookupData.users.map((u: any) => [u.id, u.full_name]))
    : {};
  const whMap = lookupData.warehouses
    ? Object.fromEntries(lookupData.warehouses.map((w: any) => [w.id, w.name]))
    : {};
  const matMap = lookupData.materials
    ? Object.fromEntries(lookupData.materials.map((m: any) => [m.id, m.name]))
    : {};
  const groupMap = lookupData.groups
    ? Object.fromEntries(lookupData.groups.map((g: any) => [g.id, g.name]))
    : {};

  return data.map((item) => {
    const newItem: any = {};
    Object.keys(item).forEach((key) => {
      let value = item[key];

      // Tự động chuyển đổi ID sang Tên nếu có trong lookup
      if (key === 'employee_id' && userMap[value]) value = userMap[value];
      if (
        (key === 'warehouse_id' || key === 'from_warehouse_id' || key === 'to_warehouse_id') &&
        whMap[value]
      )
        value = whMap[value];
      if (key === 'material_id' && matMap[value]) value = matMap[value];
      if (key === 'group_id' && groupMap[value]) value = groupMap[value];

      const label = COLUMN_MAP[key] || key;
      newItem[label] = value;
    });
    return newItem;
  });
};
