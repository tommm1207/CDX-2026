# Bảng Tổng Hợp Phân Quyền CDX-2026 (Admin vs User) - v9 Final

Hệ thống đã được cấu hình để nhân viên (User) có đủ các tính năng cá nhân và công việc, trong khi dữ liệu nhạy cảm của Admin được bảo mật tuyệt đối.

| Tính năng / Module | Admin (Quản trị viên) | User (Nhân viên) | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Giao diện Menu** | Thấy đầy đủ tất cả các mục quản trị. | Thêm: Nhật ký, Chấm công, Lương cá nhân. | Đầy đủ công cụ làm việc. |
| **Nhập chi phí** | Thấy Dashboard tổng (Thu/Chi/Lợi nhuận). | **Chỉ vào trang Nhập liệu**. Không thấy Dashboard tiền. | Bảo mật dòng tiền. |
| **Phiếu lương** | Xem & Xuất bảng lương toàn công ty. | **Chỉ xem duy nhất phiếu lương của mình**. | Bảo mật thu nhập cá nhân. |
| **Chấm công** | Chấm công, Sửa, Chấm hàng loạt. | **Chỉ xem lịch chấm công cá nhân**. | Khóa chức năng sửa. |
| **Nhật ký thi công** | Xem, Duyệt nhật ký. | Nhập nhật ký mới (Sửa sẽ reset chờ duyệt). | |
| **Kho bãi** | Duyệt phiếu, Xem báo cáo tồn. | Nhập/Xuất/Luân chuyển (Sửa sẽ reset chờ duyệt). | |
| **Quy tắc Sửa phiếu** | Có quyền chốt trạng thái Duyệt ngay. | **Mọi hành động sửa sẽ Reset về "Chờ duyệt"**. | Quy trình "Sửa là phải Duyệt lại". |
| **Thùng rác & Cài đặt**| Toàn quyền kiểm soát. | **Bị chặn hoàn toàn (Redirect về Dashboard)**. | Bảo vệ cấu trúc hệ thống. |

---
**Các điểm nâng cấp vừa thực hiện:**
1. **Sửa lỗi link Dashboard**: Nút "Chi phí" trên Dashboard giờ sẽ dẫn User về trang Nhập liệu, Admin về trang Báo cáo.
2. **Mở khóa tính năng cá nhân**: Nhân viên đã có thể xem Lương và Chấm công của chính mình.
3. **Menu thông minh**: Thanh menu dưới đã được bổ sung đầy đủ các mục cần thiết cho công việc hàng ngày của nhân viên.
