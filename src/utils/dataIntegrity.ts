import { supabase } from '@/lib/supabase';

export type UsageType = 'material' | 'group' | 'warehouse' | 'employee' | 'bom';

export interface UsageResult {
  inUse: boolean;
  tables: string[];
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
  users: 'Nhân sự phụ trách',
  inventory: 'Tồn kho thực tế'
};

export const checkUsage = async (type: UsageType, id: string): Promise<UsageResult> => {
  const tablesToCheck: string[] = [];
  const results: string[] = [];

  if (type === 'material') {
    tablesToCheck.push('stock_in', 'stock_out', 'transfers', 'bom_configs', 'bom_items', 'costs', 'inventory');
  } else if (type === 'group') {
    tablesToCheck.push('materials');
  } else if (type === 'warehouse') {
    tablesToCheck.push('stock_in', 'stock_out', 'transfers', 'costs', 'materials', 'users');
  } else if (type === 'employee') {
    tablesToCheck.push('stock_in', 'stock_out', 'transfers', 'costs', 'production_orders');
  } else if (type === 'bom') {
    tablesToCheck.push('production_orders');
  }

  const queries = tablesToCheck.map(table => {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    
    if (table === 'transfers') {
      if (type === 'material') query = query.eq('material_id', id);
      if (type === 'warehouse') query = query.or(`from_warehouse_id.eq.${id},to_warehouse_id.eq.${id}`);
      if (type === 'employee') query = query.eq('employee_id', id);
    } else if (table === 'users') {
      query = query.eq('warehouse_id', id);
    } else if (table === 'materials') {
      if (type === 'group') query = query.eq('group_id', id);
      if (type === 'warehouse') query = query.eq('warehouse_id', id);
    } else if (table === 'production_orders') {
      if (type === 'bom') query = query.eq('bom_id', id);
      if (type === 'employee') query = query.eq('created_by', id);
      if (type === 'warehouse') query = query.or(`warehouse_id.eq.${id},output_warehouse_id.eq.${id}`);
    } else if (table === 'bom_items') {
      if (type === 'material') query = query.eq('material_item_id', id);
    } else if (table === 'bom_configs') {
      if (type === 'material') query = query.eq('product_item_id', id);
    } else {
      let field = 'material_id';
      if (type === 'warehouse') field = 'warehouse_id';
      if (type === 'employee') field = 'employee_id';
      query = query.eq(field, id);
    }

    // Always ignore records in Trash (Soft-deleted)
    query = query.or('status.is.null,status.neq.Đã xóa');
    
    return { table, query };
  });

  const resolved = await Promise.all(queries.map(q => q.query));
  
  resolved.forEach((res, index) => {
    if (res.count && res.count > 0) {
      results.push(TABLE_LABELS[queries[index].table] || queries[index].table);
    }
  });

  return {
    inUse: results.length > 0,
    tables: results
  };
};
