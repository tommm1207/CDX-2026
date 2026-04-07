# UI Patterns — CDX Team

## 1. Cấu trúc Table với Row-Click

**Quy tắc bắt buộc**: Tất cả bảng dữ liệu phải hỗ trợ nhấp vào dòng để xem/sửa chi tiết.

```tsx
// ✅ Đúng — Row click mở detail/edit
<tr
  key={item.id}
  className="hover:bg-primary/5 transition-colors cursor-pointer"
  onClick={() => handleOpenDetail(item)}
>
  <td>...</td>
  <td className="text-center">
    {/* Các nút action dùng stopPropagation để không trigger row click */}
    <button
      onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
    >
      <Edit size={14} />
    </button>
    <button
      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
    >
      <Trash2 size={14} />
    </button>
  </td>
</tr>
```

## 2. Modal Chi tiết / Sửa

```tsx
// ✅ Pattern chuẩn — click ngoài để đóng
<AnimatePresence>
  {showModal && (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => setShowModal(false)}   // click nền mờ → đóng
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}  // click trong modal → không đóng
      >
        {/* Header */}
        <div className="bg-primary p-6 text-white rounded-t-3xl flex items-center justify-between">
          ...
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          ...
        </div>
        {/* Footer actions */}
        <div className="p-4 border-t bg-gray-50 rounded-b-3xl flex gap-3">
          <Button variant="danger" icon={Trash2} onClick={handleDelete}>Xóa</Button>
          <Button variant="warning" icon={Edit} onClick={handleEdit}>Sửa</Button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

## 3. Z-Index Hierarchy

| Layer | Z-Index | Dùng cho |
|-------|---------|---------|
| Sidebar | `z-[60]` | Thanh bên trái |
| Modal cấp 1 | `z-[100]` | Modal chính |
| Modal cấp 2 | `z-[110]` | Modal nested (sửa trong chi tiết) |
| Modal cấp 3 | `z-[120]` | Confirm xóa |
| Material modal | `z-[130]` | Modal thêm vật tư (sâu nhất) |
| Search global | `z-[150]` | Tìm kiếm toàn cục |

## 4. Mobile — Modal Toàn Màn Hình

Trên mobile (`md:` breakpoint), modal dùng `mt-auto` để slide lên từ dưới:

```tsx
className="bg-white rounded-none md:rounded-3xl w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] mt-auto md:mt-0"
```

## 5. Các Component Shared

| Component | Import từ | Dùng khi |
|-----------|-----------|---------|
| `<Button>` | `../shared/Button` | Bất kỳ nút action nào |
| `<FAB>` | `../shared/FAB` | Nút "+" nổi góc phải |
| `<PageBreadcrumb>` | `../shared/PageBreadcrumb` | Đầu mỗi trang |
| `<ConfirmModal>` | `../shared/ConfirmModal` | Xác nhận xóa |
| `<CustomCombobox>` | `../shared/CustomCombobox` | Dropdown có search |
| `<NumericInput>` | `../shared/NumericInput` | Input số tiền, có format |
| `<MonthYearPicker>` | `../shared/MonthYearPicker` | Chọn tháng/năm |

## 6. Màu và Style Chính

```css
--color-primary: #2D6A4F;     /* Xanh lá CDX */
--color-primary-hover: #1B4332;
```

- Header bảng: `bg-primary text-white`
- Row hover: `hover:bg-primary/5`
- Nút Sửa: `text-yellow-500 / bg-yellow-500`
- Nút Xóa: `text-red-500 / bg-red-500`
- Nút Đóng: `text-gray-500 / bg-gray-500`
