import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runTests() {
  const report = {};

  // Test 1: Tồn kho âm?
  const { data: si } = await supabase.from('stock_in').select('material_id, warehouse_id, quantity, status');
  const { data: so } = await supabase.from('stock_out').select('material_id, warehouse_id, quantity, status');
  
  const inventory = {};
  if (si) si.filter(x => x.status === 'Đã duyệt').forEach(x => {
    const key = `${x.material_id}_${x.warehouse_id}`;
    if (!inventory[key]) inventory[key] = 0;
    inventory[key] += x.quantity;
  });
  
  let negativeFound = false;
  if (so) so.filter(x => x.status === 'Đã duyệt').forEach(x => {
    const key = `${x.material_id}_${x.warehouse_id}`;
    inventory[key] = (inventory[key] || 0) - x.quantity;
    if (inventory[key] < 0) {
      if (!report.negativeInventory) report.negativeInventory = [];
      report.negativeInventory.push({key, quantity: inventory[key]});
      negativeFound = true;
    }
  });

  if (!negativeFound) report.negativeInventory = 'PASS';

  // Test 2: Phiếu thiếu dữ liệu quan trọng
  const { data: bSi } = await supabase.from('stock_in').select('id, import_code').is('material_id', null);
  const { data: bSo } = await supabase.from('stock_out').select('id, export_code').is('material_id', null);
  if (bSi.length === 0 && bSo.length === 0) report.missingData = 'PASS';
  else report.missingData = { bSi, bSo };

  // Test 3: Chấm công trùng
  const { data: att } = await supabase.from('attendance').select('employee_id, date');
  const attCount = {};
  att.forEach(a => {
    const key = `${a.employee_id}_${a.date}`;
    attCount[key] = (attCount[key] || 0) + 1;
  });
  const dupes = Object.keys(attCount).filter(k => attCount[k] > 1);
  if (dupes.length === 0) report.duplicateAttendance = 'PASS';
  else report.duplicateAttendance = dupes;

  // Test 4: Nhân viên có lương nhưng thiếu settings
  const { data: users } = await supabase.from('users').select('id, code, has_salary, status');
  const { data: settings } = await supabase.from('salary_settings').select('employee_id');
  const setIds = new Set(settings.map(s => s.employee_id));
  const missingSettings = users.filter(u => u.has_salary && u.status !== 'Nghỉ việc' && !setIds.has(u.id));
  if (missingSettings.length === 0) report.missingSalarySettings = 'PASS';
  else report.missingSalarySettings = missingSettings.map(m => m.code);

  fs.writeFileSync('db_report.json', JSON.stringify(report, null, 2));
}

runTests();
