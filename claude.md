# SPEC: Module Quản Lý Sản Xuất Cọc
**CDX Team App — v1.0 — Tháng 4/2026**

---

## Tổng Quan

Module này bổ sung khả năng quản lý toàn bộ vòng đời sản xuất cọc bê tông cốt thép. Gồm ba phần chức năng liên kết với nhau và với kho vật tư hiện có:

| Phần | Tên | Mục đích |
|------|-----|----------|
| Phần 1 | Xả / Gộp Vật Tư | Tách vật liệu thô thành mảnh nhỏ hơn, hoặc gộp mảnh dư thành vật liệu mới |
| Phần 2 | Định Nghĩa & Lệnh Sản Xuất | Tạo công thức vật tư (BOM) cho từng loại cọc, phát lệnh sản xuất để trừ kho |
| Phần 3 | Nhập Kho Thành Phẩm | Sau khi đúc xong, nhập cọc vào kho và tự động trừ vật tư cấu thành |

> ⚠️ Toàn bộ thao tác đều ảnh hưởng trực tiếp đến số lượng tồn kho. Cần modal xác nhận trước khi thực thi.

---

## Phần 1 — Xả / Gộp Vật Tư

### Mô tả nghiệp vụ

Vật liệu thô (thép cây, thép tấm, kẽm li...) khi về kho thường ở dạng nguyên kiện. Trước khi sản xuất, thợ cần cắt/xẻ chúng thành các mảnh có kích thước xác định. Ngược lại, các đoạn dư từ nhiều lần cắt có thể được hàn gộp lại thành vật liệu mới.

**Ví dụ — Xả thép cây:**
Kho có 1 cây thép Ø8AI dài 11.7m. Thợ cắt lấy đoạn 8m, còn lại 3.7m.
- Giảm: 1 cây thép Ø8AI 11.7m
- Tăng: 1 đoạn 8m (dùng sản xuất) + 1 đoạn 3.7m (đoạn dư, lưu kho)

**Ví dụ — Xả thép tấm:**
1 tấm lớn → xả ra 7 tấm phôi đầu hộp (1100×230mm) + 1 tấm dư (1100×180mm). Tấm dư tiếp tục xả ra 6 tấm chắn vách (118×...) + 1 miếng vụn (118×50mm).

**Ví dụ — Gộp đoạn dư:**
3 đoạn thép Ø8AI × 3.7m được hàn lại → 1 cây mới ~11.1m (trừ hao mối hàn).
- Giảm: 3 đoạn 3.7m
- Tăng: 1 cây ~11.1m (khai báo chiều dài thực tế)

---

### Luồng thao tác — Xả

| Bước | Hành động | Input | Kết quả |
|------|-----------|-------|---------|
| 1 | Chọn vật tư nguồn từ kho | Chọn mặt hàng | Hiển thị tồn kho hiện tại |
| 2 | Nhập số lượng xả | Số lượng | Validate không vượt tồn kho |
| 3 | Khai báo từng mảnh ra được | Tên / kích thước / số lượng mỗi mảnh | Preview tổng mảnh ra |
| 4 | Xác nhận | Nút Xác nhận | Trừ vật tư nguồn, cộng từng mảnh vào kho |

### Luồng thao tác — Gộp

| Bước | Hành động | Input | Kết quả |
|------|-----------|-------|---------|
| 1 | Chọn các mảnh dư cần gộp | Multi-select từ kho | Hiển thị tồn của từng loại |
| 2 | Nhập số lượng từng loại đem gộp | Số lượng mỗi loại | Validate không vượt tồn |
| 3 | Khai báo vật tư mới sinh ra | Tên / kích thước / số lượng | Preview vật tư mới |
| 4 | Xác nhận | Nút Xác nhận | Trừ các mảnh nguồn, cộng vật tư mới vào kho |

### Quy tắc nghiệp vụ

- Tên mảnh ra có thể chọn từ danh sách kho hiện có, hoặc khai báo mới (hệ thống tạo mặt hàng mới với tồn = 0).
- Số lượng xả không được vượt tồn hiện tại.
- Mỗi thao tác tạo một bản ghi lịch sử với ngày giờ và người thực hiện.
- Không cho phép xóa bản ghi đã hoàn thành — nếu sai phải tạo thao tác đảo ngược.

---

## Phần 2 — Định Nghĩa & Lệnh Sản Xuất

### Mô tả nghiệp vụ

Mỗi loại cọc có một công thức vật tư gọi là **Bill of Materials (BOM)** — định nghĩa loại và khối lượng từng nguyên liệu để đúc ra 1 cọc. Khi phát lệnh sản xuất N cọc, hệ thống nhân BOM × N để tính tổng nguyên liệu cần dùng và trừ khỏi kho.

**Ví dụ BOM — Cọc C40-4B1 (từ bản vẽ):**

| Vật tư | Đơn vị | Định mức / 1 cọc |
|--------|--------|------------------|
| Bê tông M350 | m³ | 0.62 |
| Thép Ø8AI | kg | 69.66 |
| Thép Ø22AIII | kg | 100.26 |
| Thép bản -8mm (300×280) | kg | 21.10 |
| Thép L90×7 L=300 | kg | 11.51 |

---

### Quản lý BOM

| Bước | Hành động | Input | Kết quả |
|------|-----------|-------|---------|
| 1 | Tạo loại cọc mới | Tên cọc (vd: C40-4B1), mô tả | Tạo bản ghi sản phẩm |
| 2 | Thêm vật tư vào BOM | Chọn vật tư từ kho, nhập định mức / 1 cọc, đơn vị | Lưu công thức BOM |
| 3 | Xem / sửa BOM | Chỉnh sửa định mức | Cập nhật công thức |

### Phát lệnh sản xuất

| Bước | Hành động | Input | Kết quả |
|------|-----------|-------|---------|
| 1 | Chọn loại cọc | Chọn từ danh sách | Hiển thị BOM tương ứng |
| 2 | Nhập số lượng cọc | Số lượng (vd: 10) | Tính tổng vật tư = BOM × số lượng |
| 3 | Xem bảng dự trù | — | Từng vật tư: cần / có / đủ không |
| 4 | Xác nhận phát lệnh | Nút Xác nhận | Tạo lệnh sản xuất, trừ vật tư khỏi kho |

> ⚠️ Nếu bất kỳ vật tư nào không đủ, hiển thị cảnh báo rõ ràng. Người dùng có thể chấp nhận tồn âm hoặc hủy lệnh.

### Quy tắc nghiệp vụ

- Mỗi loại cọc chỉ có 1 BOM đang hoạt động tại một thời điểm. Lưu lịch sử các phiên bản cũ.
- Vật tư bị trừ ngay khi phát lệnh, không chờ hoàn thành.
- Lệnh có thể hủy nếu chưa nhập kho thành phẩm — khi hủy, hệ thống hoàn trả vật tư về kho.

---

## Phần 3 — Nhập Kho Thành Phẩm

### Mô tả nghiệp vụ

Sau khi đúc và bảo dưỡng xong, cọc được nhập vào kho thành phẩm. Thao tác này tăng số lượng cọc trong kho và cập nhật trạng thái lệnh sản xuất. Vật tư đã bị trừ ở Phần 2 không bị ảnh hưởng thêm.

### Luồng thao tác

| Bước | Hành động | Input | Kết quả |
|------|-----------|-------|---------|
| 1 | Vào danh sách lệnh đang hoạt động | — | Hiển thị lệnh trạng thái "Đang sản xuất" |
| 2 | Chọn lệnh cần nhập kho | Chọn lệnh | Chi tiết: loại cọc, số lượng phát lệnh |
| 3 | Nhập số lượng thực tế hoàn thành | Số lượng (≤ số lượng phát lệnh) | Preview số cọc sẽ thêm vào kho |
| 4 | Xác nhận nhập kho | Nút Xác nhận | Tăng cọc trong kho, cập nhật trạng thái lệnh |

> ⚠️ Cho phép nhập kho từng đợt. Lệnh chỉ chuyển sang "Hoàn thành" khi đủ số lượng kế hoạch.

### Quy tắc nghiệp vụ

- Số lượng nhập mỗi đợt không vượt số lượng còn lại của lệnh.
- Cọc nhập kho được quản lý như hàng hóa thông thường — có thể xuất theo phiếu xuất hàng.
- Lịch sử nhập kho lưu đầy đủ: ngày, người nhập, số lượng.

---

## Database Schema (Supabase)

> ⚠️ Cần xác nhận tên bảng kho hàng hiện tại để tạo FK đúng trước khi migrate.

### `xasa_gop_phieu` — Phiếu xả / gộp

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| id | uuid PK | ✓ | |
| loai | text | ✓ | `'xa'` hoặc `'gop'` |
| ngay_thuc_hien | timestamptz | ✓ | |
| nguoi_thuc_hien | uuid FK users | ✓ | |
| ghi_chu | text | | |
| created_at | timestamptz | ✓ | |

### `xasa_gop_chi_tiet` — Chi tiết từng dòng vật tư

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| id | uuid PK | ✓ | |
| phieu_id | uuid FK phieu | ✓ | |
| hang_hoa_id | uuid FK kho | ✓ | |
| vai_tro | text | ✓ | `'nguon'` (bị trừ) hoặc `'ra'` (được cộng) |
| so_luong | numeric | ✓ | Luôn dương |
| don_vi | text | ✓ | kg / cây / tấm / m / m³ |

### `san_pham_bom` — Danh sách sản phẩm / BOM

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| id | uuid PK | ✓ | |
| ten_san_pham | text | ✓ | Vd: C40-4B1 |
| mo_ta | text | | |
| dang_hoat_dong | boolean | ✓ | true = BOM hiện hành |
| created_at | timestamptz | ✓ | |

### `san_pham_bom_chi_tiet` — Vật tư trong BOM

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| id | uuid PK | ✓ | |
| bom_id | uuid FK bom | ✓ | |
| hang_hoa_id | uuid FK kho | ✓ | |
| dinh_muc | numeric | ✓ | Lượng cần / 1 sản phẩm |
| don_vi | text | ✓ | kg / m³ / cái |

### `lenh_san_xuat` — Lệnh sản xuất

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|-------|
| id | uuid PK | ✓ | |
| bom_id | uuid FK bom | ✓ | BOM dùng lúc phát lệnh |
| so_luong_ke_hoach | integer | ✓ | Số cọc cần đúc |
| so_luong_hoan_thanh | integer | ✓ | Số cọc đã nhập kho (default 0) |
| trang_thai | text | ✓ | `'dang_san_xuat'` \| `'hoan_thanh'` \| `'da_huy'` |
| ngay_phat_lenh | timestamptz | ✓ | |
| nguoi_phat_lenh | uuid FK users | ✓ | |
| ghi_chu | text | | |

---

## UI / UX

**Navigation:** Thêm mục "Sản Xuất" vào sidebar/bottom nav với 3 tab con: Xả/Gộp — BOM — Lệnh Sản Xuất.

**Cảnh báo:** Khi vật tư không đủ, hiển thị badge đỏ kèm số lượng thiếu. Tất cả thao tác thay đổi kho đều yêu cầu modal xác nhận với bảng tóm tắt.

**Mobile:** Các bảng dữ liệu scroll ngang, không truncate.

**Lịch sử & Export:** Mỗi loại thao tác có trang lịch sử riêng, lọc theo ngày và người thực hiện. Xuất Excel theo chuẩn nút Export hiện tại của app.

---

## Thứ Tự Implement (Đề Xuất)

1. **Sprint 1** — DB migration: tạo 5 bảng mới + RLS policy
2. **Sprint 2** — Quản lý BOM (CRUD công thức sản phẩm)
3. **Sprint 3** — Phát lệnh sản xuất + trừ kho
4. **Sprint 4** — Nhập kho thành phẩm
5. **Sprint 5** — Xả / Gộp vật tư (phức tạp nhất về UX)
6. **Sprint 6** — Lịch sử, báo cáo, xuất Excel

> Phần Xả/Gộp đặt sau cùng vì logic kho phức tạp nhất và ít urgent hơn so với vòng sản xuất chính (BOM → Lệnh → Nhập kho).
