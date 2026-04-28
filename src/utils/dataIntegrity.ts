import { supabase } from '@/lib/supabase';

export type UsageType = 'material' | 'group' | 'warehouse' | 'employee' | 'bom' | 'cost_item';

export interface UsageResult {
  inUse: boolean;
  tables: string[];
  details: {
    table: string;
    label: string;
    count: number;
    softDeletedCount: number;
  }[];
}

const TABLE_LABELS: Record<string, string> = {
  stock_in: 'Phiếu nhập kho',
  stock_out: 'Phiếu xuất kho',
  transfers: 'Phiếu chuyển kho',
  bom_configs: 'Định mức sản xuất (Thành phẩm)',
  bom_items: 'Chi tiết định mức (Nguyên liệu)',
  costs: 'Báo cáo chi phí',
  production_orders: 'Lệnh sản xuất',
  materials: 'Danh mục vật tư',
  users: 'Phân quyền kho (Nhân sự)',
  salary_settings: 'Cài đặt lương',
  advances: 'Tạm ứng',
  allowances: 'Phụ cấp/Thưởng',
  attendance: 'Chấm công',
  warehouses: 'Danh sách kho',
  inventory: 'Tồn kho thực tế',
  notes: 'Ghi chú nhật ký',
  construction_diaries: 'Nhật ký thi công',
  reminders: 'Nhắc nhở',
  notifications: 'Thông báo hệ thống',
};

// Tables that have a 'status' column for soft-delete filtering
const TABLES_WITH_STATUS = [
  'users',
  'materials',
  'material_groups',
  'warehouses',
  'stock_in',
  'stock_out',
  'transfers',
  'costs',
  'advances',
  'allowances',
  'reminders',
  'construction_diaries',
  'production_orders',
  'bom_configs',
];

export const checkUsage = async (type: UsageType, id: string): Promise<UsageResult> => {
  const tablesToCheck: string[] = [];
  const results: string[] = [];
  const details: UsageResult['details'] = [];

  if (type === 'material') {
    tablesToCheck.push(
      'stock_in',
      'stock_out',
      'transfers',
      'bom_configs',
      'bom_items',
      'costs',
      'inventory',
      'production_orders',
    );
  } else if (type === 'group') {
    tablesToCheck.push('materials', 'costs', 'cost_items');
  } else if (type === 'cost_item') {
    tablesToCheck.push('costs');
  } else if (type === 'warehouse') {
    tablesToCheck.push(
      'stock_in',
      'stock_out',
      'transfers',
      'costs',
      'materials',
      'users',
      'inventory',
      'production_orders',
      'construction_diaries',
    );
  } else if (type === 'employee') {
    tablesToCheck.push(
      'stock_in',
      'stock_out',
      'transfers',
      'costs',
      'production_orders',
      'salary_settings',
      'advances',
      'allowances',
      'attendance',
      'warehouses',
      'notes',
      'construction_diaries',
      'reminders',
      'notifications',
    );
  } else if (type === 'bom') {
    tablesToCheck.push('production_orders', 'bom_items');
  }

  const queries = await Promise.all(
    tablesToCheck.map(async (table) => {
      const buildQuery = () => {
        let queryBase = supabase.from(table).select('*', { count: 'exact', head: false });

        if (table === 'transfers') {
          if (type === 'material') queryBase = queryBase.eq('material_id', id);
          if (type === 'warehouse')
            queryBase = queryBase.or(`from_warehouse_id.eq.${id},to_warehouse_id.eq.${id}`);
          if (type === 'employee') queryBase = queryBase.eq('employee_id', id);
        } else if (table === 'users') {
          queryBase = queryBase.eq('warehouse_id', id);
        } else if (table === 'materials') {
          if (type === 'group') queryBase = queryBase.eq('group_id', id);
          if (type === 'warehouse') queryBase = queryBase.eq('warehouse_id', id);
        } else if (table === 'production_orders') {
          if (type === 'bom') queryBase = queryBase.eq('bom_id', id);
          if (type === 'employee')
            queryBase = queryBase.or(`created_by.eq.${id},approved_by.eq.${id}`);
          if (type === 'warehouse')
            queryBase = queryBase.or(`warehouse_id.eq.${id},output_warehouse_id.eq.${id}`);
          if (type === 'material') queryBase = queryBase.eq('material_id', id);
        } else if (table === 'bom_items') {
          if (type === 'material') queryBase = queryBase.eq('material_item_id', id);
          if (type === 'bom') queryBase = queryBase.eq('bom_id', id);
        } else if (table === 'bom_configs') {
          if (type === 'material') queryBase = queryBase.eq('product_item_id', id);
        } else if (table === 'warehouses') {
          if (type === 'employee') queryBase = queryBase.eq('manager_id', id);
        } else if (
          table === 'notes' ||
          table === 'construction_diaries' ||
          table === 'reminders' ||
          table === 'notifications'
        ) {
          if (type === 'employee') queryBase = queryBase.eq('created_by', id);
          if (table === 'construction_diaries' && type === 'warehouse')
            queryBase = queryBase.eq('warehouse_id', id);
        } else if (table === 'inventory') {
          if (type === 'warehouse') queryBase = queryBase.eq('warehouse_id', id);
          if (type === 'material') queryBase = queryBase.eq('material_id', id);
        } else if (table === 'costs') {
          if (type === 'group') queryBase = queryBase.eq('cost_group_id', id);
          if (type === 'cost_item') queryBase = queryBase.eq('cost_item_id', id);
          if (type === 'material') queryBase = queryBase.eq('material_id', id);
          if (type === 'employee') queryBase = queryBase.eq('employee_id', id);
          if (type === 'warehouse') queryBase = queryBase.eq('warehouse_id', id);
        } else if (table === 'cost_items') {
          if (type === 'group') queryBase = queryBase.eq('group_id', id);
        } else {
          let field = 'material_id';
          if (type === 'warehouse') field = 'warehouse_id';
          if (type === 'employee') field = 'employee_id';
          queryBase = queryBase.eq(field, id);
        }
        return queryBase;
      };

      const hasStatus = TABLES_WITH_STATUS.includes(table);

      let pActive;
      let pDeleted = Promise.resolve({ count: 0 });

      if (hasStatus) {
        pActive = Promise.resolve(buildQuery().or('status.is.null,status.neq.Đã xóa'))
          .then((res) => res)
          .catch(() => ({ count: 0 }));
        pDeleted = Promise.resolve(buildQuery().eq('status', 'Đã xóa'))
          .then((res) => res)
          .catch(() => ({ count: 0 }));
      } else {
        pActive = Promise.resolve(buildQuery())
          .then((res) => res)
          .catch(() => ({ count: 0 }));
      }

      const [activeRes, deletedRes] = await Promise.all([pActive, pDeleted]);

      return {
        table,
        activeCount: activeRes.count || 0,
        deletedCount: deletedRes.count || 0,
      };
    }),
  );

  queries.forEach((q) => {
    if (q.activeCount > 0 || q.deletedCount > 0) {
      if (q.activeCount > 0) results.push(TABLE_LABELS[q.table] || q.table);
      details.push({
        table: q.table,
        label: TABLE_LABELS[q.table] || q.table,
        count: q.activeCount,
        softDeletedCount: q.deletedCount,
      });
    }
  });

  return {
    inUse: results.length > 0 || details.some((d) => d.softDeletedCount > 0),
    tables: results,
    details,
  };
};
