import express from "express";
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

// Vercel already provides environment variables.
// dotenv.config() is only needed for local dev:
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const dotenv = await import("dotenv");
  dotenv.config();
}

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
let currentCronJob: ScheduledTask | null = null;

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
// Dùng service_role key để bypass RLS khi backup (chỉ dùng server-side)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl) {
  console.error("[CRITICAL] VITE_SUPABASE_URL is missing in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Guard for API routes if config is missing
const checkSupabaseConfig = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "System configuration missing: Supabase URL/Key not set in Vercel." });
  }
  next();
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

/**
 * Lấy cấu hình backup từ Supabase (thay thế tệp JSON)
 */
async function getBackupConfig(userId: string) {
  try {
    const { data, error } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', `backup_settings_${userId}`)
      .single();

    if (error || !data) return null;
    return data.value;
  } catch (err) {
    console.error(`[CONFIG] Error fetching config for user ${userId} from Supabase:`, err);
    return null;
  }
}

/**
 * Lưu cấu hình backup vào Supabase
 */
async function saveBackupConfig(userId: string, config: any) {
  try {
    const { error } = await supabase
      .from('system_configs')
      .upsert({ key: `backup_settings_${userId}`, value: config }, { onConflict: 'key' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`[CONFIG] Error saving config for user ${userId} to Supabase:`, err);
    return false;
  }
}

async function runAutoBackup() {
  console.log("----------------------------------------------------------------");
  console.log(`[BACKUP] >>> AUTOMATIC BACKUP TRIGGERED AT: ${new Date().toLocaleString('vi-VN')}`);
  console.log("----------------------------------------------------------------");
  
  const { data: configs } = await supabase
    .from('system_configs')
    .select('value')
    .like('key', 'backup_settings_%');

  if (!configs || configs.length === 0) {
    console.log("[BACKUP] No user configurations found in Supabase. Skipping.");
    return;
  }

  const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const currentHour = vnTime.getHours();
  const currentMin = vnTime.getMinutes();

  for (const configData of configs) {
    const config = configData.value;
    if (!config || !config.enabled || !config.email || !config.schedule) continue;

    // Check schedule
    const parts = config.schedule.split(' ');
    if (parts.length < 2) continue;
    const targetMin = parseInt(parts[0], 10);
    const targetHour = parseInt(parts[1], 10);

    // We check if current time matches the target time (to the minute)
    // Note: Local scheduler runs every minute.
    if (currentHour !== targetHour || currentMin !== targetMin) continue;

    console.log(`[BACKUP] Processing backup for ${config.email}...`);

    const smtpConfig = {
      host: process.env.SMTP_HOST || config.smtpConfig?.host || '',
      port: process.env.SMTP_PORT || config.smtpConfig?.port || '',
      user: process.env.SMTP_USER || config.smtpConfig?.user || '',
      pass: process.env.SMTP_PASS || config.smtpConfig?.pass || '',
      secure: process.env.SMTP_SECURE === 'true' || config.smtpConfig?.secure || false
    };

    if (!smtpConfig.user || !smtpConfig.pass) {
      console.log(`[BACKUP] Missing SMTP credentials for ${config.email}. Skipping.`);
      continue;
    }

    try {
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
        const { data, error } = await supabase.from(table.id).select("*");
        if (error) continue;

        labels.push(table.label);
        const rowCount = data?.length || 0;
        stats[table.label] = rowCount;

        if (data && rowCount > 0) {
          const sheet = workbook.addWorksheet(table.label.substring(0, 31).replace(/\//g, '-'));
          const formattedData = formatDataForExcel(data, lookupData);
          if (formattedData.length > 0) {
            const columns = Object.keys(formattedData[0]);
            const headerRow = sheet.addRow(columns);
            headerRow.height = 25;
            headerRow.eachCell((cell) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D5A27' } };
              cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            formattedData.forEach((item) => {
              const row = sheet.addRow(Object.values(item));
              row.eachCell((cell) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                if (typeof cell.value === 'number') cell.alignment = { horizontal: 'right' };
              });
            });
          }
        }
      }

      const fileName = `CDX_Auto_Backup_${vnTime.toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const fileData = Buffer.from(buffer).toString('base64');

      await sendEmail({
        smtpConfig,
        to: config.email,
        subject: `[TỰ ĐỘNG] Sao lưu dữ liệu CDX - ${vnTime.toLocaleDateString('vi-VN')}`,
        fileName,
        fileData,
        tableList: labels,
        tableStats: stats,
        isAuto: true
      });

      console.log(`[BACKUP] Successfully sent auto-backup to ${config.email}`);
    } catch (error) {
      console.error(`[BACKUP] Error during backup for ${config.email}:`, error);
    }
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

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

/**
 * Khởi tạo lịch trình Backup
 */
async function initBackupScheduler() {
  console.log("[BACKUP] Initializing Backup Scheduler...");
  
  const { data: configs } = await supabase
    .from('system_configs')
    .select('value')
    .like('key', 'backup_settings_%');

  if (configs && configs.length > 0) {
    // For local Express server, we currently only support one cron job in this simple implementation.
    // However, the auto-cron serverless function handles multiple users by iterating.
    // For local dev, let's just pick the first one or logic that covers all.
    // A better approach is multiple jobs or a single minute-by-minute job.
    
    // To keep it simple and consistent with serverless, we'll run a job every minute that checks all configs.
    cron.schedule("* * * * *", runAutoBackup);
    console.log("[BACKUP] Global scheduler started (checks all user configs every minute).");
  }
}

// Gọi khởi tạo lần đầu (Khi server start)
initBackupScheduler();

app.get("/api/get-backup-config", checkApiKey, checkSupabaseConfig, async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  
  const config = await getBackupConfig(userId as string);
  res.json(config || {});
});

app.get("/api/cron-status", checkApiKey, checkSupabaseConfig, async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const config = await getBackupConfig(userId as string);
  res.json({
    hasJob: true, // We now use a global minute-by-minute checker
    schedule: config?.schedule,
    enabled: config?.enabled,
    nextRun: config?.enabled && config?.schedule ? "Scheduled" : "Disabled"
  });
});

app.post("/api/save-backup-config", checkApiKey, checkSupabaseConfig, async (req, res) => {
  const { userId, email, smtpConfig, schedule, enabled } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  
  const config = { email, smtpConfig, schedule, enabled };
  
  const saved = await saveBackupConfig(userId, config);
  if (!saved) return res.status(500).json({ error: "Failed to save config to database" });

  // No need to stop/start cron here because the global scheduler checks every minute
  res.json({ success: true });
});

app.post("/api/send-backup", backupLimiter, checkApiKey, checkSupabaseConfig, async (req, res) => {
  const { email, fileName, fileData, tableList, tableStats } = req.body;
  
  const smtpConfig = {
    host: process.env.SMTP_HOST || req.body.smtpConfig?.host,
    port: process.env.SMTP_PORT || req.body.smtpConfig?.port,
    user: process.env.SMTP_USER || req.body.smtpConfig?.user,
    pass: process.env.SMTP_PASS || req.body.smtpConfig?.pass,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : req.body.smtpConfig?.secure
  };

  if (!email || !fileData || !smtpConfig.user || !smtpConfig.pass) {
    return res.status(400).json({ error: "Thiêu thông tin cấu hình mail ngầm (SMTP) hoặc dữ liệu backup." });
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

app.get("/api/health-check", (req, res) => {
  res.json({
    status: "online",
    vercel: !!process.env.VERCEL,
    supabaseConfig: {
      url: !!process.env.VITE_SUPABASE_URL,
      key: !!process.env.VITE_SUPABASE_ANON_KEY,
      serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    apiKeySet: !!process.env.API_SECRET_KEY,
    time: new Date().toISOString()
  });
});

// Middleware for static files or Vite
const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
const isVercel = !!process.env.VERCEL;

if (!isProd) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
} else if (!isVercel) {
  // Local Production (Non-Vercel): Serve static files from 'dist'
  const distPath = path.join(__dirname, "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }
  
  app.get("*", (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api/')) {
       const indexPath = path.join(__dirname, "dist", "index.html");
       if (fs.existsSync(indexPath)) {
         res.sendFile(indexPath);
       } else {
         res.status(404).send("Front-end build not found. Please run 'npm run build'.");
       }
    } else {
       res.status(404).json({ error: "API Route not found" });
    }
  });
}

// Trên Vercel, chúng ta không set app.get("*") vì Vercel native routing sẽ xử lý index.html.
// Việc lồng thêm Express router có thể gây treo Serverless Function.

// Chỉ chạy server thủ công nếu KHÔNG PHẢI Vercel
if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
