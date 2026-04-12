import { supabase } from '@/lib/supabase';
import { UsageType } from './dataIntegrity';

/**
 * Purges or unlinks all records that reference a given entity.
 * This is used for "Force Delete" functionality for Develop users.
 */
export const purgeDependencies = async (
  type: UsageType,
  id: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (type === 'employee') {
      // 1. Transactional Slips - Unlink preferred (Keep records but remove worker link)
      await Promise.all([
        supabase.from('stock_in').update({ employee_id: null }).eq('employee_id', id),
        supabase.from('stock_out').update({ employee_id: null }).eq('employee_id', id),
        supabase.from('transfers').update({ employee_id: null }).eq('employee_id', id),
        supabase.from('costs').update({ employee_id: null }).eq('employee_id', id),
        supabase.from('production_orders').update({ created_by: null }).eq('created_by', id),
        supabase.from('production_orders').update({ approved_by: null }).eq('approved_by', id),
        supabase.from('warehouses').update({ manager_id: null }).eq('manager_id', id),
      ]);

      // 2. Personal/HR Records - Delete (No meaning without the user)
      await Promise.all([
        supabase.from('attendance').delete().eq('employee_id', id),
        supabase.from('advances').delete().eq('employee_id', id),
        supabase.from('allowances').delete().eq('employee_id', id),
        supabase.from('salary_settings').delete().eq('employee_id', id),
        supabase.from('notes').delete().eq('created_by', id),
        supabase.from('construction_diaries').delete().eq('created_by', id),
        supabase.from('reminders').delete().eq('created_by', id),
        supabase.from('notifications').delete().eq('created_by', id),
      ]);
    } else if (type === 'material') {
      // 1. Transactional - We cannot really unlink material from slips easily without breaking inventory
      // So for material "Force Delete", we must delete the slips too if the user insists.
      await Promise.all([
        supabase.from('inventory').delete().eq('material_id', id),
        supabase.from('bom_items').delete().eq('material_item_id', id),
        supabase.from('bom_configs').delete().eq('product_item_id', id),
        supabase.from('stock_in').delete().eq('material_id', id),
        supabase.from('stock_out').delete().eq('material_id', id),
        supabase.from('transfers').delete().eq('material_id', id),
        supabase.from('costs').delete().eq('material_id', id),
        supabase.from('production_orders').delete().eq('material_id', id),
      ]);
    } else if (type === 'warehouse') {
      // Unlink users first
      await supabase.from('users').update({ warehouse_id: null }).eq('warehouse_id', id);

      // Delete everything else
      await Promise.all([
        supabase.from('inventory').delete().eq('warehouse_id', id),
        supabase.from('stock_in').delete().eq('warehouse_id', id),
        supabase.from('stock_out').delete().eq('warehouse_id', id),
        supabase
          .from('transfers')
          .delete()
          .or(`from_warehouse_id.eq.${id},to_warehouse_id.eq.${id}`),
        supabase.from('costs').delete().eq('warehouse_id', id),
        supabase
          .from('production_orders')
          .delete()
          .or(`warehouse_id.eq.${id},output_warehouse_id.eq.${id}`),
        supabase.from('construction_diaries').delete().eq('warehouse_id', id),
      ]);
    } else if (type === 'group') {
      // Unlink materials
      await supabase.from('materials').update({ group_id: null }).eq('group_id', id);
    } else if (type === 'bom') {
      await Promise.all([
        supabase.from('bom_items').delete().eq('bom_id', id),
        supabase.from('production_orders').delete().eq('bom_id', id),
      ]);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error purging dependencies:', err);
    return { success: false, error: err.message };
  }
};
