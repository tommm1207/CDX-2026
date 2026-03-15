import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "backup-config.json");

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const BACKUP_TABLES = [
  { id: 'users', label: 'Bảng Nhân sự' },
  { id: 'attendance', label: 'Bảng Chấm công' },
  { id: 'salary_settings', label: 'Cài đặt lương' },
  { id: 'advances', label: 'Tạm ứng / Phụ cấp' },
  { id: 'stock_in', label: 'Báo cáo Nhập kho' },
  { id: 'stock_out', label: 'Báo cáo Xuất kho' },
  { id: 'transfers', label: 'Báo cáo Chuyển kho' },
  { id: 'warehouses', label: 'Danh sách Kho' },
  { id: 'materials', label: 'Danh mục Vật tư' },
  { id: 'material_groups', label: 'Nhóm vật tư' },
  { id: 'costs', label: 'Báo cáo Chi phí' },
  { id: 'notes', label: 'Nhật ký / Ghi chú' },
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
  if (!config.enabled || !config.email || !config.smtpConfig) {
    console.log("[BACKUP] Backup disabled or incomplete configuration. Skipping.");
    return;
  }

  try {
    const workbook = xlsx.utils.book_new();
    
    for (const table of BACKUP_TABLES) {
      console.log(`[BACKUP] Fetching ${table.label}...`);
      const { data, error } = await supabase.from(table.id).select("*");
      if (error) {
        console.error(`[BACKUP] Error fetching ${table.id}:`, error);
        continue;
      }
      if (data && data.length > 0) {
        const worksheet = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(workbook, worksheet, table.label.substring(0, 31));
      }
    }

    const fileName = `CDX_Auto_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileData = xlsx.write(workbook, { type: 'base64', bookType: 'xlsx' });

    const transporter = nodemailer.createTransport({
      host: config.smtpConfig.host,
      port: parseInt(config.smtpConfig.port),
      secure: config.smtpConfig.secure,
      auth: {
        user: config.smtpConfig.user,
        pass: config.smtpConfig.pass,
      },
    });

    const mailOptions = {
      from: `"CDX Auto Backup" <${config.smtpConfig.user}>`,
      to: config.email,
      subject: `[AUTO-BACKUP] ${fileName}`,
      text: `Đây là bản sao lưu tự động được thực hiện vào lúc ${new Date().toLocaleString('vi-VN')}.`,
      attachments: [
        {
          filename: fileName,
          content: fileData,
          encoding: 'base64'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`[BACKUP] Successfully sent backup to ${config.email}`);
  } catch (error) {
    console.error("[BACKUP] Critical error during automatic backup:", error);
  }
}

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
      cron.schedule(config.schedule, runAutoBackup);
    }
  }

  app.get("/api/get-backup-config", (req, res) => {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      res.json(config);
    } else {
      res.json({});
    }
  });

  app.post("/api/save-backup-config", (req, res) => {
    const { email, smtpConfig, schedule, enabled } = req.body;
    const config = { email, smtpConfig, schedule, enabled };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    // Restart scheduler by reloading (simpler way: just schedule if enabled)
    // Note: in a real production app we'd need to clear old jobs. 
    // Here we just restart the server or wait for next start for simplicity, 
    // or we can just run it immediately for testing.
    console.log(`[BACKUP] Configuration saved. New schedule: ${schedule}`);
    
    // Attempt to clear all and re-schedule (basic version)
    // Actually node-cron doesn't have an easy "clear all" without references.
    // For this prototype, we'll suggest a server restart if schedule changes, or just add new.
    if (enabled && schedule) {
      cron.schedule(schedule, runAutoBackup);
    }

    res.json({ success: true });
  });

  app.post("/api/send-backup", async (req, res) => {
    const { email, fileName, fileData, smtpConfig } = req.body;
    if (!email || !fileData || !smtpConfig) return res.status(400).json({ error: "Missing required fields" });

    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port),
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      });

      const mailOptions = {
        from: `"Hệ thống Quản lý CDX" <${smtpConfig.user}>`,
        to: email,
        subject: `[BACKUP] ${fileName}`,
        text: `Chào bạn,\n\nĐây là file sao lưu dữ liệu hệ thống được tạo vào lúc ${new Date().toLocaleString('vi-VN')}.\n\nTrân trọng.`,
        attachments: [{ filename: fileName, content: fileData, encoding: 'base64' }]
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("Email sending error:", error);
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
