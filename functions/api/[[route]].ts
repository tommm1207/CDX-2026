import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

const BACKUP_TABLES = [
  { id: 'users', label: 'Danh sách Nhân sự' },
  { id: 'attendance', label: 'Dữ liệu Chấm công' },
  { id: 'advances', label: 'Tạm ứng & Phụ cấp' },
  { id: 'construction_diaries', label: 'Nhật ký thi công' },
  { id: 'costs', label: 'Báo cáo Chi phí' },
  { id: 'production_orders', label: 'Lệnh sản xuất' },
  { id: 'warehouses', label: 'Danh sách Kho' },
  { id: 'materials', label: 'Danh mục Vật tư' },
  { id: 'material_groups', label: 'Nhóm vật tư' },
  { id: 'stock_in', label: 'Báo cáo Nhập kho' },
  { id: 'stock_out', label: 'Báo cáo Xuất kho' }
];

const formatDataForExcel = (data: any[]) => {
  return data.map(item => {
    const newItem: any = {};
    Object.keys(item).forEach(key => {
      newItem[key] = item[key];
    });
    return newItem;
  });
};

const app = new Hono().basePath('/api');

// Helper function to check API key
const checkApiKey = (c: any, next: any) => {
  const secretKey = c.env.API_SECRET_KEY;
  if (!secretKey) return next();

  const apiKey = c.req.header('x-api-key');
  if (apiKey !== secretKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
};

app.use('*', checkApiKey);

app.get('/health-check', (c) => {
  return c.json({ status: 'online', platform: 'cloudflare-pages' });
});

app.get('/get-backup-config', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'Missing userId' }, 400);

  const supabase = createClient(c.env.VITE_SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.VITE_SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', `backup_settings_${userId}`)
    .single();

  if (error || !data) return c.json({});
  return c.json(data.value);
});

app.get('/cron-status', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'Missing userId' }, 400);

  const supabase = createClient(c.env.VITE_SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.VITE_SUPABASE_ANON_KEY);
  
  const { data } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', `backup_settings_${userId}`)
    .single();

  const config = data?.value;
  return c.json({
    hasJob: true,
    schedule: config?.schedule,
    enabled: config?.enabled,
    nextRun: config?.enabled && config?.schedule ? "Scheduled" : "Disabled"
  });
});

app.post('/save-backup-config', async (c) => {
  const body = await c.req.json();
  const { userId, email, smtpConfig, schedule, enabled } = body;
  if (!userId) return c.json({ error: 'Missing userId' }, 400);

  const supabase = createClient(c.env.VITE_SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.VITE_SUPABASE_ANON_KEY);
  const config = { email, smtpConfig, schedule, enabled };

  const { error } = await supabase
    .from('system_configs')
    .upsert({ key: `backup_settings_${userId}`, value: config }, { onConflict: 'key' });

  if (error) return c.json({ error: 'Failed to save config' }, 500);
  return c.json({ success: true });
});

app.post('/send-backup', async (c) => {
  const body = await c.req.json();
  const { email, fileName, fileData, tableList, tableStats } = body;

  if (!email || !fileData) {
    return c.json({ error: 'Thiếu thông tin người nhận file (Email) hoặc fileData.' }, 400);
  }

  const resendApiKey = c.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return c.json({ error: 'Thiếu cấu hình Resend API Key.' }, 500);
  }

  const resend = new Resend(resendApiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'CDX System <onboarding@resend.dev>', // Update this to your verified domain later e.g. backup@cdx-team.com
      to: email,
      subject: `[HỆ THỐNG] Sao lưu dữ liệu CDX - ${new Date().toLocaleDateString('vi-VN')}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #008060; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">
              Sao lưu dữ liệu định kỳ
            </h1>
          </div>
          <div style="padding: 30px;">
            <p>Chào bạn,</p>
            <p>Hệ thống vừa hoàn thành việc trích xuất và tạo file sao lưu dữ liệu theo yêu cầu.</p>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><b>Tên file:</b> ${fileName}</p>
              <p style="margin: 5px 0;"><b>Ngày tạo:</b> ${new Date().toLocaleString('vi-VN')}</p>
              <p style="margin: 15px 0 5px 0;"><b>Hạng mục đã sao lưu:</b></p>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #555;">
                ${(tableList || []).map((t: string) => `<li>${t}</li>`).join('')}
              </ul>
            </div>
            <p style="margin-top: 25px;">File đính kèm dưới đây chứa dữ liệu ở định dạng Excel (.xlsx).</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: fileData, // base64 string
        },
      ],
    });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Email sent successfully', data });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to send email' }, 500);
  }
});

// We expose a /trigger-cron endpoint to be called by an external service or Cloudflare worker
app.post('/trigger-cron', async (c) => {
  // Only allow if cron secret matches
  const authHeader = c.req.header('authorization');
  const apiKey = c.req.header('x-api-key');
  const validSecret = c.env.CRON_SECRET || c.env.API_SECRET_KEY || 'cdx-secret-2026';
  
  if (authHeader !== `Bearer ${validSecret}` && apiKey !== validSecret) {
    return c.json({ error: 'Unauthorized cron trigger' }, 401);
  }

  const supabase = createClient(c.env.VITE_SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.VITE_SUPABASE_ANON_KEY);
  
  const { data: configs } = await supabase
    .from('system_configs')
    .select('value')
    .like('key', 'backup_settings_%');

  if (!configs || configs.length === 0) {
    return c.json({ status: 'No user configs found' });
  }

  const results = [];
  const now = new Date();
  const vnTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const currentHour = vnTime.getHours();
  const currentMin = vnTime.getMinutes();

  for (const configData of configs) {
    const config = configData.value;
    if (!config.enabled || !config.schedule || !config.email) continue;

    const parts = config.schedule.split(' ');
    if (parts.length < 2) continue;

    const targetMin = parseInt(parts[0], 10);
    const targetHour = parseInt(parts[1], 10);
    
    // Check if the current time matches the scheduled time
    if (currentHour !== targetHour || currentMin !== targetMin) continue;

    const resendApiKey = c.env.RESEND_API_KEY;
    if (!resendApiKey) continue;
    
    // Generating Excel (This requires nodejs_compat flag)
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CDX Auto System';
      
      const summarySheet = workbook.addWorksheet('TỔNG QUAN', { views: [{ showGridLines: false }] });
      summarySheet.getCell('A1').value = 'HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX 2026';
      summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF008060' } };
      summarySheet.getCell('A3').value = 'BÁO CÁO SAO LƯU DỮ LIỆU TỰ ĐỘNG';
      summarySheet.getCell('A3').font = { size: 14, bold: true };
      
      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase.from(table.id).select("*");
        if (error) continue;
        
        const rowCount = data?.length || 0;
        if (data && rowCount > 0) {
          const sheet = workbook.addWorksheet(table.label.substring(0, 31).replace(/[:\\\\/?*\\[\\]]/g, '-'));
          const formattedData = formatDataForExcel(data);
          if (formattedData.length > 0) {
            const columns = Object.keys(formattedData[0]);
            sheet.addRow(columns);
            formattedData.forEach((item) => sheet.addRow(Object.values(item)));
          }
        }
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      const uint8Array = new Uint8Array(buffer as ArrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const fileData = btoa(binary);

      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: 'CDX System <onboarding@resend.dev>',
        to: config.email,
        subject: `[TỰ ĐỘNG] Sao lưu dữ liệu CDX - ${vnTime.toLocaleDateString('vi-VN')}`,
        html: `<p>Tệp sao lưu tự động đính kèm.</p>`,
        attachments: [{ filename: `CDX_Auto_Backup_${vnTime.toISOString().split('T')[0]}.xlsx`, content: fileData }]
      });

      results.push({ email: config.email, status: 'Success' });
    } catch (err: any) {
      results.push({ email: config.email, status: 'Error: ' + err.message });
    }
  }

  return c.json({ status: 'Processed', executedAt: vnTime.toISOString(), results });
});

export const onRequest = handle(app);
