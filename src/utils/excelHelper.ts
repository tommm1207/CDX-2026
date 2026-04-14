/**
 * Hằng số ánh xạ các tên cột kỹ thuật sang Tiếng Việt hiển thị trong Excel
 */
export const COLUMN_MAP: Record<string, string> = {
  // Common columns
  id: '__EXCLUDE__',
  code: 'ID / Mã hiệu',
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
  employee_id: 'Nhân viên / Đối tượng',
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

  // Finance / Costs
  amount: 'Số tiền (VNĐ)',
  cost_code: 'Mã chi phí',
  cost_type: 'Loại chi phí',
  category: 'Danh mục',
  address: 'Địa chỉ',

  // Attendance
  hours_worked: 'Số giờ làm việc',
  overtime_hours: 'Số giờ tăng ca',

  // BOM / Production Additions
  quantity_per_unit: 'Định lượng/SP',
  product_item_id: 'Sản phẩm đầu ra',
  material_item_id: 'Vật tư tiêu hao',

  // Construction Diary
  diary_code: 'Mã Nhật ký',
  weather: 'Thời tiết',
  temperature: 'Nhiệt độ',
  labor_info: 'Nhân sự & Tổ đội',
  equipment_info: 'Máy móc & Thiết bị',
  work_progress: 'Diễn biến thi công',
  quality_issues: 'Chất lượng & An toàn',
  supervision_comments: 'Ý kiến Giám sát',

  // Reminders / Notes
  priority: 'Mức độ ưu tiên',
  content: 'Nội dung chi tiết',
  is_completed: 'Đã hoàn thành',
  related_object: 'Đối tượng liên quan',
  location: 'Địa điểm / Vị trí',
  title: 'Tiêu đề',
  reminder_time: 'Thời gian nhắc',
  browser_notification: 'Thông báo trình duyệt',

  // Salary Settings (Hợp đồng)
  base_salary: 'Lương cơ bản',
  daily_rate: 'Lương theo ngày',
  insurance_deduction: 'Khấu trừ BHXH',
  monthly_ot_coeff: 'Hệ số tăng ca',
  valid_from: 'Ngày hiệu lực',
  valid_to: 'Hết hạn',
};

// Tra cứu bối cảnh thời tiết (Đồng bộ với Notes.tsx)
const WEATHER_MAP: Record<string, string> = {
  sunny: '☀️ Nắng nóng gay gắt',
  'sudden-rain': '⛈️ Mưa rào đột ngột',
  cloudy: '☁️ Trời âm u, oi bức',
  'long-rain': '🌧️ Mưa dầm kéo dài',
  'strong-wind': '💨 Gió giật mạnh trong cơn dông',
  thunderstorm: '🌩️ Sấm chớp dữ dội',
  flood: '🌊 Ngập lụt cục bộ',
  cool: '🌬️ Trời se lạnh vào sáng sớm',
  smog: '🌫️ Sương mù quang hóa',
  pleasant: '🌤️ Trời trong xanh, nắng dịu',
};

/**
 * Hàm chuyển đổi mảng dữ liệu với các key kỹ thuật sang key tiếng Việt
 * Kết hợp tra cứu ID để hiển thị Tên (Nhân viên, Kho, Vật tư, BOM)
 */
export const formatDataForExcel = (data: any[], lookupData: any = {}, tableId?: string) => {
  if (!data || data.length === 0) return [];

  // Các bảng không cần cột "Trạng thái" (Vì không có quy trình duyệt)
  const hideStatusTables = ['advances', 'allowances'];
  const shouldHideStatus = tableId && hideStatusTables.includes(tableId);

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
  const bomMap = lookupData.boms
    ? Object.fromEntries(lookupData.boms.map((b: any) => [b.id, b.name]))
    : {};

  return data.map((item) => {
    const newItem: any = {};
    Object.keys(item).forEach((key) => {
      // 1. Bảo mật: Tuyệt đối không xuất mật khẩu hoặc trường nhạy cảm
      if (key.toLowerCase().includes('pass')) return;

      // 2. Tuyệt đối không để mã ID kỹ thuật (UUID) làm rác bảng tính
      if (key === 'id') return;

      // 3. Loại bỏ cột trạng thái cho các bảng tài chính không cần duyệt (Theo ý người dùng)
      if (key === 'status' && shouldHideStatus) return;

      let value = item[key];

      // 4. Xử lý dữ liệu dạng JSON (Ghi chú, Nhật ký, Nhắc việc) để lấy text thô
      if (typeof value === 'string' && value.startsWith('{')) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object') {
            // Ưu tiên lấy trường 'text' nếu là cấu trúc Quill/Reminder
            value = parsed.text || parsed.content || value;
          }
        } catch (e) {
          // Nếu không phải JSON chuẩn thì giữ nguyên
        }
      }

      // 5. Tự động chuyển đổi ID tham chiếu sang Tên người dùng hay dùng
      if (
        (key === 'employee_id' || key === 'created_by' || key === 'approved_by') &&
        userMap[value]
      )
        value = userMap[value];
      if (
        (key === 'warehouse_id' ||
          key === 'from_warehouse_id' ||
          key === 'to_warehouse_id' ||
          key === 'output_warehouse_id') &&
        whMap[value]
      )
        value = whMap[value];
      if (
        (key === 'material_id' || key === 'product_item_id' || key === 'material_item_id') &&
        matMap[value]
      )
        value = matMap[value];
      if (key === 'group_id' && groupMap[value]) value = groupMap[value];
      if (key === 'bom_id' && bomMap[value]) value = bomMap[value];

      // 3. Xử lý các "Mã" Slug kỹ thuật (Weather, Categories)
      if (key === 'weather' && typeof value === 'string' && WEATHER_MAP[value.toLowerCase()]) {
        value = WEATHER_MAP[value.toLowerCase()];
      }

      // Format Boolean sang Tiếng Việt chuyên nghiệp
      if (typeof value === 'boolean') {
        value = value ? 'Có / Hoàn tất' : 'Không / Chưa';
      }

      const label = COLUMN_MAP[key] || key;
      newItem[label] = value;
    });
    return newItem;
  });
};
