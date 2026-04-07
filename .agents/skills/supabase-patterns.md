# Supabase Patterns — CDX Team

## 1. Client Setup

```ts
// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

## 2. Fetch với Soft Delete

```ts
// ✅ Luôn lọc bỏ records đã xóa mềm
const { data } = await supabase
  .from('materials')
  .select('*')
  .or('status.is.null,status.neq.Đã xóa')  // null hoặc không phải 'Đã xóa'
  .order('created_at', { ascending: false });
```

## 3. Join Relations (Supabase Foreign Key)

```ts
// Lấy tên kho kèm vật tư
const { data } = await supabase
  .from('stock_in')
  .select('*, materials(name, unit), warehouses(name), users(full_name)')
  .eq('status', 'Chờ duyệt');

// Truy cập: item.materials?.name, item.warehouses?.name
```

## 4. Upsert (Insert hoặc Update)

```ts
// salary_settings dùng upsert theo employee_id
await supabase.from('salary_settings').upsert({
  employee_id: selectedEmp.id,
  daily_rate: formData.daily_rate,
  base_salary: formData.base_salary,
}, { onConflict: 'employee_id' });
```

## 5. Soft Delete Pattern

```ts
// ❌ KHÔNG làm — không xóa cứng dữ liệu quan trọng
await supabase.from('costs').delete().eq('id', id);

// ✅ Đúng — soft delete
await supabase.from('costs').update({ status: 'Đã xóa' }).eq('id', id);

// ✅ Đúng — restore từ thùng rác
await supabase.from('costs').update({ status: null }).eq('id', id);
```

## 6. Realtime Subscription

```ts
// Lắng nghe thay đổi realtime (dùng trong App.tsx cho pending count)
const channel = supabase
  .channel('my-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_in' }, callback)
  .subscribe();

// Cleanup khi unmount
return () => { supabase.removeChannel(channel); };
```

## 7. Pagination & Filtering

```ts
// Supabase không hỗ trợ offset lớn tốt — dùng cursor-based nếu cần
const { data, count } = await supabase
  .from('costs')
  .select('*', { count: 'exact' })
  .eq('employee_id', userId)
  .gte('date', startDate)
  .lte('date', endDate)
  .order('date', { ascending: false })
  .range(0, 49);  // 50 records đầu
```

## 8. Error Handling Pattern

```ts
try {
  const { data, error } = await supabase.from('...').select('...');
  if (error) throw error;
  // xử lý data
} catch (err: any) {
  if (addToast) addToast('Lỗi: ' + err.message, 'error');
  else console.error(err);
}
```

## 9. Upload File / Image

```ts
// Upload ảnh vật tư (base64 → url hoặc dùng Storage)
// Hiện tại dự án dùng base64 string lưu thẳng vào DB (image_url column)
// Không dùng Supabase Storage
```

## 10. Truy vấn theo Permission

```ts
// Lọc kho theo quyền của user
import { getAllowedWarehouses } from '../utils/helpers';

const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
let query = supabase.from('warehouses').select('*');
if (allowedWhIds) {
  query = query.in('id', allowedWhIds);
}
const { data } = await query;
```
