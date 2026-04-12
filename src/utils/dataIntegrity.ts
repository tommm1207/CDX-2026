import { supabase } from '@/lib/supabase';

export type UsageType = 'material' | 'group' | 'warehouse' | 'employee' | 'bom';

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
  attendance: 'Chấm công',
  warehouses: 'Danh sách kho',
};

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
    );
  } else if (type === 'group') {
    tablesToCheck.push('materials');
  } else if (type === 'warehouse') {
    tablesToCheck.push('stock_in', 'stock_out', 'transfers', 'costs', 'materials', 'users');
  } else if (type === 'employee') {
    tablesToCheck.push(
      'stock_in',
      'stock_out',
      'transfers',
      'costs',
      'production_orders',
      'salary_settings',
      'advances',
      'attendance',
      'warehouses'
    );
  } else if (type === 'bom') {
    tablesToCheck.push('production_orders');
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
          if (type === 'employee') queryBase = queryBase.eq('created_by', id);
          if (type === 'warehouse')
            queryBase = queryBase.or(`warehouse_id.eq.${id},output_warehouse_id.eq.${id}`);
        } else if (table === 'bom_items') {
          if (type === 'material') queryBase = queryBase.eq('material_item_id', id);
        } else if (table === 'bom_configs') {
          if (type === 'material') queryBase = queryBase.eq('product_item_id', id);
        } else if (table === 'warehouses') {
          if (type === 'employee') queryBase = queryBase.eq('manager_id', id);
        } else {
          let field = 'material_id';
          if (type === 'warehouse') field = 'warehouse_id';
          if (type === 'employee') field = 'employee_id';
          queryBase = queryBase.eq(field, id);
        }
        return queryBase;
      };

      // Execute twice without clone
      const activeQuery = buildQuery();
      const deletedQuery = buildQuery();
      
      const pActive = activeQuery.or('status.is.null,status.neq.Đã xóa').then(res => res).catch(() => ({ count: 0 }));
      const pDeleted = deletedQuery.eq('status', 'Đã xóa').then(res => res).catch(() => ({ count: 0 }));

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
