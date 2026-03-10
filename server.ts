import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size for large backups
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // API routes
  app.post("/api/send-backup", async (req, res) => {
    const { email, fileName, fileData, smtpConfig } = req.body;

    if (!email || !fileData || !smtpConfig) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port),
        secure: smtpConfig.secure, // true for 465, false for other ports
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

      const mailOptions = {
        from: `"Hệ thống Quản lý CDX" <${smtpConfig.user}>`,
        to: email,
        subject: `[BACKUP] ${fileName}`,
        text: `Chào bạn,\n\nĐây là file sao lưu dữ liệu hệ thống được tạo vào lúc ${new Date().toLocaleString('vi-VN')}.\n\nTrân trọng.`,
        attachments: [
          {
            filename: fileName,
            content: fileData,
            encoding: 'base64'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("Email sending error:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("index.html", { root: "dist" });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
