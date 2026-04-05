import nodemailer from 'nodemailer';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, fileName, fileData, tableList, tableStats } = req.body;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  if (!email || !fileData || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'Thiếu thông tin cấu hình SMTP hoặc dữ liệu backup.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587'),
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const tableRows = tableList && tableList.length > 0
      ? tableList.map((item: string) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #eee;">${item}</td>
            <td style="padding: 10px; border: 1px solid #eee; text-align: center;">${tableStats?.[item] ?? 'N/A'}</td>
            <td style="padding: 10px; border: 1px solid #eee; text-align: center; color: green;">✔ Hoàn tất</td>
          </tr>`).join('')
      : `<tr><td colspan="3" style="padding: 10px; text-align: center;">Dữ liệu tổng hợp</td></tr>`;

    await transporter.sendMail({
      from: `"Hệ thống Sao lưu CDX" <${smtpUser}>`,
      to: email,
      subject: `[HỆ THỐNG] Sao lưu dữ liệu CDX - ${new Date().toLocaleDateString('vi-VN')}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #2D5A27; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px; letter-spacing: 2px;">SAO LƯU DỮ LIỆU CDX</h1>
          </div>
          <div style="padding: 30px;">
            <p>Chào bạn,</p>
            <p>Hệ thống vừa hoàn thành việc tạo file sao lưu dữ liệu cho tài khoản của bạn.</p>
            <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 4px 0;"><b>Tên file:</b> ${fileName}</p>
              <p style="margin: 4px 0;"><b>Ngày tạo:</b> ${new Date().toLocaleString('vi-VN')}</p>
              <p style="margin: 4px 0;"><b>Hình thức:</b> Yêu cầu từ ứng dụng</p>
            </div>
            <p><b style="color: #2D5A27;">Thống kê dữ liệu:</b></p>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee;">
              <thead>
                <tr style="background: #f9f9f9;">
                  <th style="padding: 10px; border: 1px solid #eee; text-align: left;">Hạng mục</th>
                  <th style="padding: 10px; border: 1px solid #eee; text-align: center;">Số bản ghi</th>
                  <th style="padding: 10px; border: 1px solid #eee; text-align: center;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <p style="margin-top: 20px; color: #666; font-size: 12px; font-style: italic;">
              Nếu email này vào Spam, hãy nhấn "Không phải thư rác" để nhận đầy đủ báo cáo.
            </p>
          </div>
          <div style="background: #f4f4f4; padding: 12px; text-align: center; font-size: 11px; color: #999;">
            Email tự động từ hệ thống CDX. Vui lòng không trả lời.
          </div>
        </div>`,
      attachments: [{ filename: fileName, content: fileData, encoding: 'base64' }]
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (err: any) {
    console.error('[SMTP_ERROR]', err);
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
}
