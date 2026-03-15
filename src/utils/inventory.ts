import { supabase } from '../supabaseClient';

/**
 * Calculates available stock for a specific material in a specific warehouse up to a certain date.
 * @param materialId UUID of the material
 * @param warehouseId UUID of the warehouse
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Number representing current stock balance
 */
export const getAvailableStock = async (
  materialId: string,
  warehouseId: string,
  date: string
): Promise<number> => {
  if (!materialId || !warehouseId || !date) return 0;

  try {
    // 1. Total Stock In (Approved and on or before date)
    const { data: stockIn } = await supabase
      .from('stock_in')
      .select('quantity')
      .eq('material_id', materialId)
      .eq('warehouse_id', warehouseId)
      .eq('status', 'Đã duyệt')
      .lte('date', date);

    // 2. Total Stock Out (Approved and on or before date)
    const { data: stockOut } = await supabase
      .from('stock_out')
      .select('quantity')
      .eq('material_id', materialId)
      .eq('warehouse_id', warehouseId)
      .eq('status', 'Đã duyệt')
      .lte('date', date);

    // 3. Total Transfers Out (From this warehouse, Approved, on or before date)
    const { data: transfersFrom } = await supabase
      .from('transfers')
      .select('quantity')
      .eq('material_id', materialId)
      .eq('from_warehouse_id', warehouseId)
      .eq('status', 'Đã duyệt')
      .lte('date', date);

    // 4. Total Transfers In (To this warehouse, Approved, on or before date)
    const { data: transfersTo } = await supabase
      .from('transfers')
      .select('quantity')
      .eq('material_id', materialId)
      .eq('to_warehouse_id', warehouseId)
      .eq('status', 'Đã duyệt')
      .lte('date', date);

    const totalIn = (stockIn || []).reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalOut = (stockOut || []).reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalTransFrom = (transfersFrom || []).reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalTransTo = (transfersTo || []).reduce((sum, item) => sum + Number(item.quantity), 0);

    return totalIn - totalOut - totalTransFrom + totalTransTo;
  } catch (err) {
    console.error('Error calculating available stock:', err);
    return 0;
  }
};

/**
 * Fetches inventory summary for all materials, optionally filtered by warehouse and date range.
 */
export const getInventoryData = async (warehouseId?: string, endDate?: string) => {
  try {
    let siQuery = supabase.from('stock_in').select('material_id, warehouse_id, quantity, total_amount').eq('status', 'Đã duyệt');
    let soQuery = supabase.from('stock_out').select('material_id, warehouse_id, quantity, total_amount').eq('status', 'Đã duyệt');
    let trQuery = supabase.from('transfers').select('material_id, from_warehouse_id, to_warehouse_id, quantity').eq('status', 'Đã duyệt');

    if (endDate) {
      siQuery = siQuery.lte('date', endDate);
      soQuery = soQuery.lte('date', endDate);
      trQuery = trQuery.lte('date', endDate);
    }

    const [si, so, tr] = await Promise.all([siQuery, soQuery, trQuery]);

    const data: Record<string, { totalIn: number, totalOut: number, breakdown: Record<string, number> }> = {};

    const addStock = (matId: string, whId: string, qty: number, type: 'in' | 'out') => {
      if (!data[matId]) data[matId] = { totalIn: 0, totalOut: 0, breakdown: {} };
      if (!data[matId].breakdown[whId]) data[matId].breakdown[whId] = 0;
      
      if (type === 'in') {
        data[matId].totalIn += qty;
        data[matId].breakdown[whId] += qty;
      } else {
        data[matId].totalOut += qty;
        data[matId].breakdown[whId] -= qty;
      }
    };

    (si.data || []).forEach(item => addStock(item.material_id, item.warehouse_id, Number(item.quantity), 'in'));
    (so.data || []).forEach(item => addStock(item.material_id, item.warehouse_id, Number(item.quantity), 'out'));
    (tr.data || []).forEach(item => {
      addStock(item.material_id, item.from_warehouse_id, Number(item.quantity), 'out');
      addStock(item.material_id, item.to_warehouse_id, Number(item.quantity), 'in');
    });

    return data;
  } catch (err) {
    console.error('Error fetching inventory data:', err);
    return {};
  }
};
