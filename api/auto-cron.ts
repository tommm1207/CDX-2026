import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';

const COLUMN_MAP: Record<string, string> = {
  id: 'ID', code: 'Mã hiệu', name: 'Tên / Nội dung', created_at: 'Ngày tạo', updated_at: 'Ngày cập nhật',
  notes: 'Ghi chú', status: 'Trạng thái', date: 'Ngày', quantity: 'Số lượng', unit: 'Đơn vị tính',
  unit_price: 'Đơn giá', total_amount: 'Thành tiền', employee_id: 'Mã Nhân viên',
  warehouse_id: 'Kho hàng', material_id: 'Vật tư', description: 'Mô tả chi tiết', type: 'Phân loại',
  full_name: 'Họ và tên', email: 'Email liên hệ', phone: 'Số điện thoại', id_card: 'Số CMND/CCCD',
  dob: 'Ngày sinh', join_date: 'Ngày nhận việc', tax_id: 'Mã số thuế', department: 'Phòng ban / Bộ phận',
  position: 'Chức vụ', resign_date: 'Ngày nghỉ việc', role: 'Quyền hạn (Vai trò)',
  import_code: 'Mã Nhập kho', export_code: 'Mã Xuất kho', transfer_code: 'Mã Chuyển kho',
  specification: 'Quy cách hồ sơ / Kỹ thuật', group_id: 'Nhóm vật tư', order_code: 'Mã Lệnh sản xuất',
  bom_id: 'Mã Định mức (BOM)', output_warehouse_id: 'Kho thành phẩm', planned_date: 'Ngày dự kiến hoàn thành',
  amount: 'Số tiền (VNĐ)', cost_code: 'Mã chi phí', cost_type: 'Loại chi phí', category: 'Danh mục',
  hours_worked: 'Số giờ làm việc', overtime_hours: 'Số giờ tăng ca', content: 'Nội dung chi tiết'
};

const BACKUP_TABLES = [
  { id: 'users', label: 'Bảng Nhân sự' },
  { id: 'attendance', label: 'Bảng Chấm công' },
  { id: 'advances', label: 'Tạm ứng - Phụ cấp' },
  { id: 'stock_in', label: 'Báo cáo Nhập kho' },
  { id: 'stock_out', label: 'Báo cáo Xuất kho' },
  { id: 'transfers', label: 'Báo cáo Chuyển kho' },
  { id: 'warehouses', label: 'Danh sách Kho' },
  { id: 'materials', label: 'Danh mục Vật tư' },
  { id: 'material_groups', label: 'Nhóm vật tư' },
  { id: 'costs', label: 'Báo cáo Chi phí' },
  { id: 'notes', label: 'Nhật ký - Ghi chú' },
  { id: 'reminders', label: 'Lịch nhắc' },
  { id: 'partners', label: 'Khách hàng & NCC' },
];

const formatDataForExcel = (data: any[], lookupData: any = {}) => {
  if (!data || data.length === 0) return [];
  const userMap = lookupData.users ? Object.fromEntries(lookupData.users.map((u: any) => [u.id, u.full_name])) : {};
  const whMap = lookupData.warehouses ? Object.fromEntries(lookupData.warehouses.map((w: any) => [w.id, w.name])) : {};
  const matMap = lookupData.materials ? Object.fromEntries(lookupData.materials.map((m: any) => [m.id, m.name])) : {};
  const groupMap = lookupData.groups ? Object.fromEntries(lookupData.groups.map((g: any) => [g.id, g.name])) : {};

  return data.map(item => {
    const newItem: any = {};
    Object.keys(item).forEach(key => {
      let value = item[key];
      if (key === 'employee_id' && userMap[value]) value = userMap[value];
      if ((key === 'warehouse_id' || key === 'from_warehouse_id' || key === 'to_warehouse_id') && whMap[value]) value = whMap[value];
      if (key === 'material_id' && matMap[value]) value = matMap[value];
      if (key === 'group_id' && groupMap[value]) value = groupMap[value];
      
      const label = COLUMN_MAP[key] || key;
      newItem[label] = value;
    });
    return newItem;
  });
};

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Authentication via Vercel Cron header or custom API Key from Github Actions
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const validSecret = process.env.CRON_SECRET || process.env.API_SECRET_KEY || 'cdx-secret-2026';
  
  if (authHeader !== `Bearer ${validSecret}` && apiKey !== validSecret) {
    console.warn("Unauthenticated cron request execution attempted");
    return res.status(401).end('Unauthorized');
  }

  try {
    const { data: configData } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'backup_settings')
      .single();

    if (!configData || !configData.value) {
      return res.status(200).json({ status: 'No config found' });
    }

    const config = configData.value;
    if (!config.enabled || !config.schedule || !config.email) {
      return res.status(200).json({ status: 'Backup disabled or incomplete configuration' });
    }

    // Determine target schedule time vs current time. 
    // Format: "MM HH * * *" (minute, hour).
    const parts = config.schedule.split(' ');
    if (parts.length >= 2) {
      const targetMin = parseInt(parts[0], 10);
      const targetHour = parseInt(parts[1], 10);
      
      const now = new Date();
      // Server runs in UTC by default on Vercel. We need to convert it to GMT+7 (Vietnam time)
      const vnTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
      const currentHour = vnTime.getHours();
      
      // We rely on GitHub actions to ping hourly/each 30 mins
      // Here we restore the check to backup accurately near the set hour
      if (currentHour !== targetHour) {
         return res.status(200).json({ status: 'Not the target hour yet', targetHour, currentHour });
      }
      
      // Also check if frequency limits.
      // Day of week: 0 for weekly. Date: 1 for monthly.
      const targetDayOfWeek = parts[4];
      const targetDate = parts[2];
      
      if (targetDayOfWeek !== '*') {
         if (vnTime.getDay().toString() !== targetDayOfWeek) return res.status(200).json({ status: 'Not the target day of week' });
      }
      
      if (targetDate !== '*') {
         if (vnTime.getDate().toString() !== targetDate) return res.status(200).json({ status: 'Not the target date' });
      }
      
      // Proceed to backup
      const smtpHost = process.env.SMTP_HOST || config.smtpConfig?.host;
      const smtpPort = process.env.SMTP_PORT || config.smtpConfig?.port;
      const smtpUser = process.env.SMTP_USER || config.smtpConfig?.user;
      const smtpPass = process.env.SMTP_PASS || config.smtpConfig?.pass;
      const smtpSecure = process.env.SMTP_SECURE === 'true' || config.smtpConfig?.secure === true;
      
      if (!smtpUser || !smtpPass) {
        return res.status(500).json({ error: 'Missing SMTP credentials' });
      }
      
      // Start generating Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CDX Auto System';
      
      const summarySheet = workbook.addWorksheet('TỔNG QUAN', { views: [{ showGridLines: false }] });
      summarySheet.getCell('A1').value = 'HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX 2026';
      summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF008060' } };
      summarySheet.getCell('A3').value = 'BÁO CÁO SAO LƯU DỮ LIỆU TỰ ĐỘNG';
      summarySheet.getCell('A3').font = { size: 14, bold: true };
      summarySheet.getCell('A5').value = 'Ngày thực hiện:';
      summarySheet.getCell('B5').value = vnTime.toLocaleString('vi-VN');
      summarySheet.getColumn(1).width = 25;
      summarySheet.getColumn(2).width = 50;
      
      const [{ data: users }, { data: warehouses }, { data: materials }, { data: groups }] = await Promise.all([
        supabase.from('users').select('id, full_name'),
        supabase.from('warehouses').select('id, name'),
        supabase.from('materials').select('id, name'),
        supabase.from('material_groups').select('id, name')
      ]);
      const lookupData = { users, warehouses, materials, groups };
      
      const labels: string[] = [];
      const stats: Record<string, number> = {};
      
      for (const table of BACKUP_TABLES) {
        labels.push(table.label);
        const { data, error } = await supabase.from(table.id).select("*");
        if (error) continue;
        
        const rowCount = data?.length || 0;
        stats[table.label] = rowCount;
        
        if (data && rowCount > 0) {
          const sheet = workbook.addWorksheet(table.label.substring(0, 31).replace(/\//g, '-'));
          const formattedData = formatDataForExcel(data, lookupData);
          if(formattedData.length > 0) {
            const columns = Object.keys(formattedData[0]);
            
            const headerRow = sheet.addRow(columns);
            headerRow.height = 25;
            headerRow.eachCell((cell) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D5A27' } };
              cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
            
            formattedData.forEach((item) => {
               sheet.addRow(Object.values(item));
            });
          }
        }
      }
      
      const fileName = `CDX_Auto_Backup_${vnTime.toISOString().split('T')[0]}.xlsx`;
      const buffer = await (workbook.xlsx as any).writeBuffer();
      const fileData = Buffer.from(buffer).toString('base64');
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPass },
      });
      
      await transporter.sendMail({
        from: `"Hệ thống Auto CDX" <${smtpUser}>`,
        to: config.email,
        subject: `[TỰ ĐỘNG] Sao lưu dữ liệu CDX - ${vnTime.toLocaleDateString('vi-VN')}`,
        html: `<p>Tệp sao lưu tự động đính kèm.</p>`,
        attachments: [{ filename: fileName, content: fileData, encoding: 'base64' }]
      });
      
      return res.status(200).json({ status: 'Success', executedAt: vnTime.toISOString() });
    }

    return res.status(200).json({ status: 'Invalid schedule format' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
