# CDX ERP SYSTEM – UI Enhancement Specification
**Phiên bản:** 1.0  
**Ngày:** 2026-04-13  
**Dành cho:** Antigravity Development Team  
**Ưu tiên:** Không được để app bị crash, trắng màn hình, hoặc lỗi biến chưa khai báo

---

## 0. Nguyên tắc bắt buộc toàn hệ thống

- Mọi biến phải được khai báo đầy đủ trước khi sử dụng (dùng `const`/`let`, không dùng `var`).
- Mọi component phải có error boundary hoặc null-check đầy đủ để tránh crash toàn màn hình.
- State mới thêm vào phải có giá trị mặc định hợp lệ (không để `undefined` gây lỗi render).
- Mọi async call phải có `try/catch` hoặc `.catch()`.
- Không dùng `!important` tùy tiện; không để CSS ghi đè layout trên mobile gây vỡ giao diện.
- Test trên cả desktop (≥1024px) và mobile (≤430px) trước khi merge.

---

## 1. Cụm 4 nút điều khiển (Toolbar) – Áp dụng cho MỌI tính năng

### 1.1 Bố cục

Mỗi tính năng có một toolbar cố định gồm **4 nút**, luôn nằm bên **phải** của tiêu đề tính năng, trên cả desktop lẫn mobile. Thứ tự từ trái sang phải:

```
[ 📷 Lưu ảnh ] [ 📊 Xuất Excel ] [ 🔽 Sắp xếp ] [ 🔍 Lọc ]
```

> **Riêng màn hình Chấm công**, thêm nút **Chấm công** nằm **bên trái** nút Lưu ảnh:
>
> ```
> [ ✅ Chấm công ] [ 📷 Lưu ảnh ] [ 📊 Xuất Excel ] [ 🔽 Sắp xếp ] [ 🔍 Lọc ]
> ```

### 1.2 Responsive

- Trên mobile: các nút tự co giãn (dùng `flex-wrap: nowrap` + `min-width: 0` + `flex-shrink: 1`), không được tràn hoặc chồng lên nhau.
- Nếu quá chật, thu gọn label chỉ còn icon; tooltip hiện khi hover/tap giữ.
- Nút không được che khuất nội dung bảng hay header trang.

### 1.3 Style

- Nút dạng icon button, bo góc nhẹ, nhất quán với màu primary của app.
- Trạng thái active/hover phải có visual feedback rõ ràng.

---

## 2. Nút 📷 Lưu ảnh

### 2.1 Chức năng

- Chụp toàn bộ bảng dữ liệu hiện tại thành ảnh (dùng `html2canvas` hoặc thư viện tương đương), **không phải screenshot màn hình**.
- Ảnh xuất ra bao gồm:
  - **Header** (xem mục 4)
  - **Toàn bộ nội dung bảng** (kể cả phần bị scroll ẩn)
  - **Footer** (xem mục 4)

### 2.2 Trạng thái ẩn dòng = 0

- Nếu công tắc **"Ẩn dữ liệu có biến = 0"** đang **BẬT** → ảnh xuất ra cũng **không có** các dòng có giá trị = 0 (ví dụ: thực lĩnh = 0, công = 0).
- Nếu công tắc **TẮT** → ảnh xuất đầy đủ tất cả dòng.
- Tức là ảnh phản ánh đúng trạng thái bảng đang hiển thị trên màn hình.

### 2.3 Preview trước khi lưu

- Sau khi nhấn nút, hiện **modal preview** ảnh trước khi lưu xuống thiết bị.
- Modal preview hỗ trợ:
  - **Zoom bằng tay (pinch-to-zoom)** trên mobile – bắt buộc, dùng pointer events hoặc `touch-action: none` + tính toán scale thủ công.
  - **Thanh hiển thị % zoom** hiện tại (ví dụ: `100%`, `150%`...).
  - Nút **Lưu** và nút **Đóng/Hủy**.
- Không dùng zoom bằng nút +/− vì chỉ zoom vào giữa, không dùng được trên màn hình nhỏ.
- Ảnh trong preview phải scroll được nếu lớn hơn màn hình.

### 2.4 Lưu ý kỹ thuật

- Đảm bảo `html2canvas` (hoặc thư viện chọn) render được toàn bộ bảng kể cả phần ngoài viewport — dùng kỹ thuật clone DOM ra ngoài màn hình rồi capture.
- Xử lý font, icon, và màu nền đúng (tránh bị trắng hoặc mất chữ).

---

## 3. Nút 📊 Xuất Excel

- Xuất **toàn bộ dữ liệu của bảng** (không bị ảnh hưởng bởi filter hiển thị hay công tắc ẩn dòng = 0).
- Excel luôn là **full thông tin**, bao gồm tất cả cột và tất cả dòng trong dataset hiện tại (sau khi lọc tháng/năm nếu có, nhưng không ẩn dòng = 0).
- Tên file xuất ra gợi ý theo format: `CDX_[TenTinhNang]_[Thang]_[Nam].xlsx`
- Dùng thư viện `xlsx` (SheetJS) hoặc tương đương.
- Phải có loading indicator trong khi xuất nếu dataset lớn.

---

## 4. Nút 🔽 Sắp xếp

- Nhấn vào hiện **dropdown/popover** với các lựa chọn sắp xếp phù hợp với từng tính năng.
- Ví dụ các option thường dùng:
  - Theo tên (A→Z / Z→A)
  - Theo giá trị (Tăng dần / Giảm dần)
  - Theo ngày (Mới nhất / Cũ nhất)
- Option hiện tại đang chọn phải có trạng thái highlighted.
- Chỉ hiện 1 popover tại một thời điểm; nhấn ra ngoài thì đóng.

---

## 5. Nút 🔍 Lọc

- Nhấn vào hiện **panel lọc** (dropdown hoặc side panel tùy layout) chứa các thành phần sau:

### 5.1 Bộ chọn Tháng / Năm *(ở tính năng có hỗ trợ)*

- Dropdown chọn **tháng** (1–12) và **năm** (danh sách năm hợp lệ).
- Áp dụng filter ngay khi chọn hoặc có nút **Áp dụng**.

### 5.2 Công tắc khoảng ngày

- Toggle **"Lọc theo khoảng ngày"**.
- Khi BẬT: hiện 2 ô chọn ngày **Từ ngày** – **Đến ngày**.
- Khi TẮT: ẩn 2 ô đó, filter theo khoảng ngày bị vô hiệu.
- Dữ liệu trong bảng cập nhật theo khoảng ngày đã chọn.

### 5.3 Công tắc ẩn dữ liệu có biến = 0

- Toggle **"Ẩn dòng có giá trị = 0"**.
- Khi BẬT: ẩn các dòng mà giá trị chính (thực lĩnh, công, ...) bằng 0.
- Khi TẮT: hiện tất cả dòng kể cả dòng = 0.
- Trạng thái này **đồng thời ảnh hưởng đến ảnh xuất** (xem mục 2.2).
- State phải được lưu trong component state, không reset khi đóng/mở panel lọc.

### 5.4 Ô tìm kiếm theo ký tự

- Input text để tìm kiếm theo tên nhân viên, mã, hoặc trường phù hợp với tính năng.
- Tìm kiếm real-time (debounce 300ms).
- Có nút **X** để xóa nhanh.

### 5.5 Nút Reset

- Nút **"Đặt lại"** để reset toàn bộ filter về mặc định.

---

## 6. Thiết kế ảnh xuất (Export Image)

> 📎 **Tham khảo ảnh đính kèm:** `header_reference.png` – ảnh mẫu header thực tế từ app.

### 6.1 Header ảnh

Header giữ nguyên đúng như giao diện hiện tại của app, gồm 2 vùng bố cục như sau:

**Vùng trên – Thông tin công ty** (nền trắng, layout ngang):
```
┌─────────────────────────────────────────────────────┐
│  [Logo CDX – hình vuông bo góc xanh lá]             │
│      CDX - CON ĐƯỜNG XANH          (chữ đậm)        │
│      HỆ THỐNG QUẢN LÝ KHO VÀ NHÂN SỰ  (chữ nhỏ mờ) │
└─────────────────────────────────────────────────────┘
```

- Logo: lấy đúng logo app hiện tại (hình vuông bo góc, nền xanh lá).
- Tên công ty: **CDX - CON ĐƯỜNG XANH** – font đậm, cỡ vừa.
- Tagline: *HỆ THỐNG QUẢN LÝ KHO VÀ NHÂN SỰ* – font nhỏ hơn, màu xám nhạt.

**Vùng dưới – Tiêu đề báo cáo** (nền trắng, layout dọc, căn trái):
```
┌─────────────────────────────────────────────────────┐
│  BẢNG TÍNH LƯƠNG          ← font in đậm, cỡ lớn,   │
│                              màu xanh lá primary    │
│  Kỳ lương: Tháng 4/2026 (2/4 - 2/4)  ← nhỏ, mờ    │
└─────────────────────────────────────────────────────┘
```

- **Tên báo cáo** (dòng lớn, in đậm, màu xanh lá primary của app):
  - Font giữ nguyên font đang dùng trong app (bold italic như trong ảnh mẫu).
  - Mỗi tính năng có tên riêng, ví dụ:
    - Bảng lương → `BẢNG TÍNH LƯƠNG`
    - Chấm công → `BẢNG CHẤM CÔNG`
    - Kho → `BẢNG QUẢN LÝ KHO`
    - *(Các tính năng còn lại dev tự đặt theo quy tắc tương tự)*

- **Dòng phụ dưới tên** (font nhỏ, màu xám nhạt, mờ):
  - **Chỉ có ở bảng lương**: hiển thị kỳ lương, ví dụ `Kỳ lương: Tháng 4/2026 (2/4 - 2/4)`.
  - **Tất cả tính năng còn lại**: hiển thị ngày xuất ảnh, ví dụ `Ngày: 13/04/2026` – font nhỏ, màu mờ.

- Không có đường kẻ hay nền màu phân tách giữa header và bảng; giữ nền trắng sạch như ảnh mẫu.

### 6.2 Khu vực bảng

- Nội dung bảng giữ nguyên style như trên màn hình (màu zebra row, màu header cột, v.v.).
- Không bị cắt ngang dòng hay cắt ngang cột.

### 6.3 Footer ảnh

Footer nằm ở cuối ảnh xuất:

```
┌─────────────────────────────────────────────┐
│  Xuất lúc: DD/MM/YYYY HH:mm        CDX ERP SYSTEM │
└─────────────────────────────────────────────┘
```

- Góc **trái**: thời gian xuất ảnh (format `DD/MM/YYYY HH:mm`).
- Góc **phải**: chữ `CDX ERP SYSTEM`.
- Ở màn hình kết quả bảng tính lương: thêm dòng chữ `NET SALARY DETAILS` phía trên footer hoặc trong vùng bảng.

---

## 7. Màn hình Chấm công – Các thay đổi riêng

### 7.1 Nút Chấm công

- Di chuyển nút **Chấm công** từ góc màn hình lên **cùng hàng với cụm 4 nút** toolbar.
- Vị trí: **ngoài cùng bên trái**, trước nút Lưu ảnh.
- Nút tự co giãn theo responsive, không chồng lên nút khác.
- Trên mobile nếu quá chật: co label thành icon + text ngắn, hoặc chỉ icon kèm tooltip.

### 7.2 Modal Chấm công

- Modal popup chấm công phải có kích thước **lớn hơn** so với hiện tại để dễ thao tác trên mobile.
- Gợi ý: chiếm ít nhất **85% chiều cao màn hình** trên mobile, có thể scroll nội dung bên trong.
- Padding, font size, và touch target của các nút bên trong modal phải đủ lớn (tối thiểu 44×44px cho mỗi element tương tác).

### 7.3 Màu 1 ngày công

- Thay màu **xanh lá tươi** (hiện tại) thành **màu xanh đậm primary của app** (màu brand chính).
- Áp dụng cho toàn bộ chỗ hiển thị "1 ngày công" (badge, cell, tag...).
- Đảm bảo contrast ratio đạt chuẩn WCAG AA (≥ 4.5:1) với chữ trên nền đó.

---

## 8. Checklist kiểm tra trước khi deploy

### Tổng quát
- [ ] Tất cả biến được khai báo trước khi dùng
- [ ] Không có `undefined is not a function` hay `Cannot read properties of null`
- [ ] Error boundary hoặc null-check ở mọi component mới
- [ ] Không có màn hình trắng khi state thay đổi đột ngột

### Toolbar
- [ ] 4 nút hiển thị đúng thứ tự trên desktop
- [ ] 4 nút hiển thị đúng thứ tự trên mobile (≤430px), không bị chồng
- [ ] Màn hình Chấm công có thêm nút Chấm công bên trái

### Lưu ảnh
- [ ] Capture đúng toàn bộ bảng (kể cả phần scroll ẩn)
- [ ] Header và footer xuất hiện đúng trong ảnh
- [ ] Preview modal mở được trên mobile
- [ ] Pinch-to-zoom hoạt động trong preview
- [ ] Thanh % zoom hiển thị đúng
- [ ] Công tắc ẩn dòng = 0 ảnh hưởng đúng đến ảnh xuất

### Xuất Excel
- [ ] Xuất full data (không bị ảnh hưởng bởi ẩn dòng = 0)
- [ ] File đặt tên đúng format
- [ ] Không bị crash khi dataset lớn

### Panel Lọc
- [ ] Chọn tháng/năm hoạt động đúng
- [ ] Khoảng ngày toggle đúng
- [ ] Công tắc ẩn dòng = 0 hoạt động real-time
- [ ] Tìm kiếm debounce 300ms, nút X xóa được
- [ ] Nút Đặt lại reset đúng tất cả filter

### Chấm công
- [ ] Modal đủ lớn, scroll được trên mobile
- [ ] Màu 1 ngày công đổi sang màu primary app
- [ ] Nút Chấm công không đè lên nút khác

### Ảnh xuất
- [ ] Header vùng trên: logo + tên công ty + tagline đúng như app
- [ ] Header vùng dưới: tên báo cáo font đậm nghiêng màu xanh lá primary
- [ ] Bảng lương: dòng phụ hiện kỳ lương (tháng + khoảng ngày)
- [ ] Tính năng khác: dòng phụ hiện ngày xuất ảnh (nhỏ, mờ)
- [ ] Footer góc trái: thời gian xuất (DD/MM/YYYY HH:mm)
- [ ] Footer góc phải: CDX ERP SYSTEM
- [ ] Màn hình lương có chữ NET SALARY DETAILS

---

## 9. Phụ lục – Thư viện gợi ý

| Chức năng | Thư viện gợi ý |
|---|---|
| Capture DOM thành ảnh | `html2canvas` hoặc `dom-to-image-more` |
| Xuất Excel | `xlsx` (SheetJS) |
| Pinch-to-zoom | Tự implement với Pointer Events API |
| Date picker | Thư viện đang dùng trong project |
| Debounce | `lodash.debounce` hoặc custom hook |

---

*Tài liệu này mô tả yêu cầu UI/UX và hành vi chức năng. Logic nghiệp vụ (công thức lương, quy tắc chấm công...) giữ nguyên như hiện tại, không thay đổi.*
