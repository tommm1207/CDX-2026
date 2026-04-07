---
description: Hướng dẫn thêm module mới vào CDX application
---

# Quy trình Thêm Module Mới

## 1. Tạo component file

```bash
# Tạo file trong thư mục phù hợp với domain
src/components/<domain>/<ModuleName>.tsx
```

Domain mapping:
- Kho hàng → `inventory/`
- Nhân sự, lương → `hr/`
- Tài chính, chi phí → `finance/`
- Vật tư → `materials/`
- Sản xuất → `production/`
- Hệ thống → `settings/`

## 2. Template Component cơ bản

```tsx
import { useState, useEffect } from 'react';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { FAB } from '../shared/FAB';
import { Button } from '../shared/Button';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { ToastType } from '../shared/Toast';

export const MyModule = ({ user, onBack, addToast }: {
  user: Employee;
  onBack?: () => void;
  addToast?: (msg: string, type?: ToastType) => void;
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .or('status.is.null,status.neq.Đã xóa')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      if (addToast) addToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Tên Module" onBack={onBack} />
      {/* ... table với row-click ... */}
      <FAB onClick={() => { setSelectedItem(null); setShowModal(true); }} />
    </div>
  );
};
```

## 3. Đăng ký trong App.tsx

```tsx
// 1. Import component
import { MyModule } from './components/<domain>/MyModule';

// 2. Thêm vào menuGroups (đúng nhóm)
{ id: 'my-module', label: 'Tên hiển thị', icon: SomeIcon }

// 3. Thêm case vào renderContent
case 'my-module': return <MyModule user={user} onBack={goBack} addToast={addToast} />;
```

## 4. Checklist trước khi hoàn thành

- [ ] Row click mở detail/edit (xem `skills/ui-patterns.md`)
- [ ] Click ngoài modal để đóng
- [ ] Soft delete (`status = 'Đã xóa'`)
- [ ] Kiểm tra phân quyền (`user.role`)
- [ ] `e.stopPropagation()` trên các nút action trong row
- [ ] Loading state khi fetch
- [ ] Toast thông báo sau mỗi action
- [ ] Responsive (mobile + desktop)
