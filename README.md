# Hệ thống Quản lý Thi công CDX - 2026

![CDX Banner](https://cdx-2026.vercel.app/logo.png)

Hệ thống quản lý toàn diện dành cho các công trình thi công, bao gồm quản lý kho vật tư, tài chính dự án, nhân sự và tiền lương. Được tối ưu hóa cho di động dưới dạng Progressive Web App (PWA).

## 🚀 Tính năng chính

### 📦 Quản lý Kho (Warehouse)
- **Nhập/Xuất kho**: Quy trình phê duyệt nghiêm ngặt cho mọi giao dịch.
- **Tồn kho thời gian thực**: Theo dõi số lượng vật tư chính xác theo từng kho.
- **Báo cáo tồn kho**: Tổng hợp dữ liệu vật tư chi tiết, cảnh báo khi sắp hết hàng.

### 💰 Quản lý Tài chính (Finance)
- **Ghi chép chi phí**: Theo dõi mọi khoản chi tiêu của dự án.
- **Phê duyệt phiếu chi**: Quy trình duyệt chi nhiều cấp độ.
- **Báo cáo chi phí**: Phân loại chi phí theo nhóm, kho và nhân sự.

### 👥 Nhân sự & Tiền lương (HR & Payroll)
- **Chấm công**: Hệ thống điểm danh hàng ngày nhanh chóng.
- **Tạm ứng & Phụ cấp**: Quản lý các khoản chi ngoài lương.
- **Bảng lương tháng**: Tự động tính toán lương dựa trên công và các khoản khấu trừ.

### 📝 Tiện ích hệ thống
- **Ghi chú & Nhắc việc**: Lưu trữ thông tin quan trọng và nhắc nhở thời hạn.
- **PWA**: Cài đặt trực tiếp lên điện thoại như một ứng dụng nguyên bản.

## 🛠 Công nghệ sử dụng
- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL, Auth, Storage)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Export**: XLSX cho báo cáo Excel

## 🔧 Cài đặt & Triển khai

### Chạy dưới local
1. Cài đặt Node.js.
2. Clone repository.
3. Chạy lệnh cài đặt:
   ```bash
   npm install
   ```
4. Cấu hình file `.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. Khởi động dự án:
   ```bash
   npm run dev
   ```

### Triển khai trên Vercel
1. Đẩy code lên GitHub.
2. Kết nối GitHub với Vercel.
3. Thiết lập **Environment Variables** trong phần Settings của Vercel (giống bước 4 ở trên).
4. Deploy!

## 📸 Ảnh chụp màn hình

<div align="center">
  <img src="https://cdx-2026.vercel.app/logo.png" width="200" alt="Logo" />
</div>

---
*Phát triển bởi CDX Team 2026*
