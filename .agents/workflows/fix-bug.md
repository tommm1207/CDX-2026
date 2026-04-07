---
description: Quy trình fix bug trong CDX application
---

# Quy trình Fix Bug

## 1. Xác định vấn đề

Trước khi sửa, cần hiểu rõ:
- Bug xảy ra ở component nào? (component tree)
- Có liên quan đến state, fetch data, hay UI?
- Có ảnh hưởng mobile không?

## 2. Tìm file liên quan

```bash
# Tìm theo tên component
grep -r "ComponentName" src/

# Tìm theo route ID
grep -r "'my-route'" src/App.tsx
```

Mapping route → file:
| Route ID | File |
|----------|------|
| `salary-settings` | `src/components/hr/SalarySettings.tsx` |
| `material-groups` | `src/components/materials/MaterialGroups.tsx` |
| `costs` | `src/components/finance/Costs.tsx` |
| `stock-in` | `src/components/inventory/StockIn.tsx` |
| ... | ... |

## 3. Các lỗi hay gặp

### Stale React State
```tsx
// ❌ Lỗi — state chưa cập nhật khi hàm chạy
const handleClick = (item) => {
  setSelectedItem(item);
  fetchRelated(selectedItem.id); // selectedItem vẫn là giá trị cũ!
};

// ✅ Đúng — truyền trực tiếp
const handleClick = (item) => {
  setSelectedItem(item);
  fetchRelated(item.id); // dùng biến local, không qua state
};
```

### Event Bubbling (row click + button click)
```tsx
// ❌ Lỗi — click Delete cũng trigger row click
<tr onClick={() => openDetail(item)}>
  <td><button onClick={() => handleDelete(item.id)}>Xóa</button></td>
</tr>

// ✅ Đúng
<tr onClick={() => openDetail(item)}>
  <td>
    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>Xóa</button>
  </td>
</tr>
```

### Modal Overlay bị chặn
```tsx
// Kiểm tra z-index hierarchy (xem skills/ui-patterns.md)
// Modal cấp 1 cần z-[100], cấp 2 cần z-[110]...
```

## 4. Quy trình commit

```bash
# 1. Tạo nhánh fix từ develop
git checkout develop
git checkout -b fix/ten-bug

# 2. Fix, test
# 3. Commit
git add -A
git commit -m "fix: mô tả ngắn gọn vấn đề"

# 4. Merge vào develop (test tiếp)
git checkout develop
git merge fix/ten-bug

# 5. Khi ổn, merge vào main để deploy
git checkout main
git merge develop
git push origin main
```

## 5. Hotfix khẩn (production bug)

```bash
git checkout main
git checkout -b hotfix/ten-bug
# ... fix ...
git commit -m "hotfix: mô tả"
git checkout main
git merge hotfix/ten-bug
git push origin main
# Cũng merge về develop để đồng bộ
git checkout develop
git merge hotfix/ten-bug
```
