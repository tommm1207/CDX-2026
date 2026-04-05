import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cron, { ScheduledTask } from "node-cron";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as xlsx from "xlsx";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Ánh xạ tên cột Anh-Việt cho Excel (Đồng bộ với Frontend)
 */
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "backup-config.json");
let currentCronJob: ScheduledTask | null = null;

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
// Dùng service_role key để bypass RLS khi backup (chỉ dùng server-side)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function runAutoBackup() {
  console.log("----------------------------------------------------------------");
  console.log(`[DEMO] >>> AUTOMATIC BACKUP TRIGGERED AT: ${new Date().toLocaleString('vi-VN')}`);
  console.log("----------------------------------------------------------------");
  console.log(`[BACKUP] Starting scheduled backup...`);
  
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log("[BACKUP] No configuration found. Skipping.");
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  
  const smtpConfig = {
    host: process.env.SMTP_HOST || config.smtpConfig?.host || '',
    port: process.env.SMTP_PORT || config.smtpConfig?.port || '',
    user: process.env.SMTP_USER || config.smtpConfig?.user || '',
    pass: process.env.SMTP_PASS || config.smtpConfig?.pass || '',
    secure: process.env.SMTP_SECURE === 'true' || config.smtpConfig?.secure || false
  };

  if (!config.enabled || !config.email || !smtpConfig.user || !smtpConfig.pass) {
    console.log("[BACKUP] Backup disabled or incomplete configuration. Skipping.");
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CDX Auto System';
    
    // 1. Tạo trang bìa TỔNG QUAN
    const summarySheet = workbook.addWorksheet('TỔNG QUAN', { views: [{ showGridLines: false }] });
    summarySheet.getCell('A1').value = 'HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX 2026';
    summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF008060' } };
    summarySheet.getCell('A3').value = 'BÁO CÁO SAO LƯU DỰ LIỆU TỰ ĐỘNG (HÀNG NGÀY)';
    summarySheet.getCell('A3').font = { size: 14, bold: true };
    summarySheet.getCell('A5').value = 'Ngày thực hiện:';
    summarySheet.getCell('B5').value = new Date().toLocaleString('vi-VN');
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 50;

    // 2. Chuẩn bị dữ liệu tra cứu (Lookup Data)
    console.log("[BACKUP] Fetching lookup data...");
    const [{ data: users }, { data: warehouses }, { data: materials }, { data: groups }] = await Promise.all([
      supabase.from('users').select('id, full_name'),
      supabase.from('warehouses').select('id, name'),
      supabase.from('materials').select('id, name'),
      supabase.from('material_groups').select('id, name')
    ]);
    const lookupData = { users, warehouses, materials, groups };

    // 3. Thêm dữ liệu các bảng
    const labels: string[] = [];
    const stats: Record<string, number> = {};

    for (const table of BACKUP_TABLES) {
      labels.push(table.label);
      console.log(`[BACKUP] Fetching ${table.label}...`);
      const { data, error } = await supabase.from(table.id).select("*");
      if (error) {
        console.error(`[BACKUP] Error fetching ${table.id}:`, error);
        continue;
      }

      const rowCount = data?.length || 0;
      stats[table.label] = rowCount;

      if (data && rowCount > 0) {
        const sheet = workbook.addWorksheet(table.label.substring(0, 31).replace(/\//g, '-'));
        const formattedData = formatDataForExcel(data, lookupData);
        const columns = Object.keys(formattedData[0]);

        // Header
        const headerRow = sheet.addRow(columns);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008060' } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Data
        formattedData.forEach((item) => {
          const row = sheet.addRow(Object.values(item));
          row.eachCell((cell) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (typeof cell.value === 'number') cell.alignment = { horizontal: 'right' };
          });
        });

        // Auto-width
        sheet.columns.forEach(column => {
          let maxLen = 0;
          column.eachCell!({ includeEmpty: true }, (cell) => {
            const len = cell.value ? cell.value.toString().length : 10;
            if (len > maxLen) maxLen = len;
          });
          column.width = Math.min(maxLen + 4, 50);
        });
      }
    }

    const fileName = `CDX_Auto_Professional_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const fileData = Buffer.from(buffer).toString('base64');

    await sendEmail({
      smtpConfig,
      to: config.email,
      subject: `[TỰ ĐỘNG] Sao lưu dữ liệu CDX - ${new Date().toLocaleDateString('vi-VN')}`,
      fileName,
      fileData,
      tableList: labels,
      tableStats: stats,
      isAuto: true
    });

    console.log(`[BACKUP] Successfully sent auto-backup to ${config.email}`);
  } catch (error) {
    console.error("[BACKUP] Critical error during automatic backup:", error);
  }
}

/**
 * Hàm hỗ trợ gửi Email dùng chung cho cả Auto và Manual Backup
 */
async function sendEmail({ smtpConfig, to, subject, fileName, fileData, tableList, tableStats, isAuto = false }: any) {
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: parseInt(smtpConfig.port.toString()),
    secure: smtpConfig.secure,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
  });

  const mailOptions = {
    from: isAuto ? `"Hệ thống CDX Auto" <${smtpConfig.user}>` : `"Hệ thống Sao lưu CDX" <${smtpConfig.user}>`,
    to: to,
    subject: subject,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: ${isAuto ? '#2c3e50' : '#008060'}; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">
            ${isAuto ? 'Sao lưu dữ liệu tự động' : 'Sao lưu dữ liệu định kỳ'}
          </h1>
        </div>
        <div style="padding: 30px;">
          <p>Chào bạn,</p>
          <p>Hệ thống vừa hoàn thành việc trích xuất và tạo file sao lưu dữ liệu ${isAuto ? 'theo báo thức hàng ngày' : 'cho tài khoản của bạn'}.</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Tên file:</b> ${fileName}</p>
            <p style="margin: 5px 0;"><b>Ngày tạo:</b> ${new Date().toLocaleString('vi-VN')}</p>
            <p style="margin: 5px 0;"><b>Hình thức:</b> ${isAuto ? 'Chạy tự động trên Server' : 'Yêu cầu từ ứng dụng'}</p>
          </div>

          <div style="margin-top: 25px;">
            <p style="font-weight: bold; color: ${isAuto ? '#2c3e50' : '#008060'}; margin-bottom: 10px; border-bottom: 2px solid ${isAuto ? '#2c3e50' : '#008060'}; display: inline-block;">Thống kê chi tiết dữ liệu:</p>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee; margin-top: 10px;">
              <thead>
                <tr style="background-color: #f9f9f9; text-align: left;">
                  <th style="padding: 10px; border: 1px solid #eee;">Hạng mục dữ liệu</th>
                  <th style="padding: 10px; border: 1px solid #eee; text-align: center;">Số lượng bản ghi</th>
                  <th style="padding: 10px; border: 1px solid #eee; text-align: center;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${tableList && tableList.length > 0 
                  ? tableList.map((item: string) => `
                    <tr>
                      <td style="padding: 10px; border: 1px solid #eee;">${item}</td>
                      <td style="padding: 10px; border: 1px solid #eee; text-align: center;">${tableStats && tableStats[item] !== undefined ? tableStats[item] : 'N/A'}</td>
                      <td style="padding: 10px; border: 1px solid #eee; text-align: center; color: green;">✔ Sẵn sàng</td>
                    </tr>
                  `).join('')
                  : '<tr><td colspan="3" style="padding: 10px; text-align: center;">Dữ liệu tổng hợp</td></tr>'
                }
              </tbody>
            </table>
          </div>

          <p style="margin-top: 25px;">File đính kèm dưới đây chứa dữ liệu ở định dạng Excel (.xlsx).</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px; font-style: italic;">
            Lưu ý: Nếu bạn thấy email này trong mục Thư rác, hãy nhấn <b>"Không phải thư rác"</b> (Not Spam) để các bản sao lưu sau này được gửi thẳng vào Hộp thư chính.
          </p>
        </div>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 11px; color: #999;">
            Đây là email tự động từ hệ thống CDX. Vui lòng không trả lời thư này.
        </div>
      </div>
    `,
    attachments: [{ filename: fileName, content: fileData, encoding: 'base64' }]
  };

  console.log(`[SMTP_DEBUG] Attempting to send email to ${to} via ${smtpConfig.user}...`);
  await transporter.sendMail(mailOptions);
  console.log(`[SMTP_DEBUG] Successfully sent email to ${to}`);
}

const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const secretKey = process.env.API_SECRET_KEY;

  // Nếu chưa cấu hình key → bỏ qua (dev mode / internal only)
  if (!secretKey) return next();

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== secretKey) {
    console.warn(`[AUTH] Unauthorized API access attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Rate limiter: tối đa 5 request / 10 phút cho backup endpoint
const backupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 10 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


  // LOAD SCHEDULE ON START
  if (fs.existsSync(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    if (config.enabled && config.schedule) {
      console.log(`[BACKUP] Scheduling backup with cron: ${config.schedule}`);
      currentCronJob = cron.schedule(config.schedule, runAutoBackup);
    }
  }

  app.get("/api/get-backup-config", checkApiKey, (req, res) => {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      res.json(config);
    } else {
      res.json({});
    }
  });

  app.get("/api/cron-status", checkApiKey, (req, res) => {
    console.log("[DEBUG] /api/cron-status called");
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      res.json({
        hasJob: !!currentCronJob,
        schedule: config.schedule,
        enabled: config.enabled,
        nextRun: config.enabled && config.schedule ? "Scheduled" : "Disabled"
      });
    } else {
      res.json({ hasJob: !!currentCronJob, status: "No config file" });
    }
  });

  app.post("/api/save-backup-config", checkApiKey, (req, res) => {
    const { email, smtpConfig, schedule, enabled } = req.body;
    const config = { email, smtpConfig, schedule, enabled };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    // Stop old job if exists
    if (currentCronJob) {
      currentCronJob.stop();
      console.log("[BACKUP] Old job stopped.");
    }
    
    if (enabled && schedule) {
      console.log(`[BACKUP] New job scheduled: ${schedule}`);
      currentCronJob = cron.schedule(schedule, runAutoBackup);
    } else {
      currentCronJob = null;
    }

    res.json({ success: true });
  });


  app.post("/api/send-backup", backupLimiter, checkApiKey, async (req, res) => {
    const { email, fileName, fileData, tableList, tableStats } = req.body;
    
    const smtpConfig = {
      host: process.env.SMTP_HOST || req.body.smtpConfig?.host,
      port: process.env.SMTP_PORT || req.body.smtpConfig?.port,
      user: process.env.SMTP_USER || req.body.smtpConfig?.user,
      pass: process.env.SMTP_PASS || req.body.smtpConfig?.pass,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : req.body.smtpConfig?.secure
    };

    if (!email || !fileData || !smtpConfig.user || !smtpConfig.pass) {
      return res.status(400).json({ error: "Thiếu thông tin cấu hình mail ngầm (SMTP) hoặc dữ liệu backup." });
    }

    try {
      await sendEmail({
        smtpConfig,
        to: email,
        subject: `[HỆ THỐNG] Sao lưu dữ liệu CDX - ${new Date().toLocaleDateString('vi-VN')}`,
        fileName,
        fileData,
        tableList,
        tableStats
      });
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("[SMTP_ERROR] Log chi tiết lỗi gửi mail:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile("index.html", { root: "dist" }));
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
