// Phiên bản TypeScript của helpers.js — thêm type annotations
// helpers.js vẫn được giữ lại để tương thích ngược với các imports hiện tại

export const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const generateCostCode = (date: string, employeeId: string): string => {
  if (!date || !employeeId) return '';
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${employeeId}-${dd}${mm}${yy}`;
};

export const generateCode = (prefix: string): string => {
  const d = new Date();
  const year = d.getFullYear().toString().slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}${month}${date}-${random}`;
};

/**
 * Lấy danh sách warehouse IDs mà user được phép xem.
 * @returns null = xem tất cả, [] = không có quyền, string[] = danh sách ID
 */
export const getAllowedWarehouses = (permissionStr?: string): string[] | null => {
  if (!permissionStr || permissionStr.trim().toUpperCase() === 'ALL' || permissionStr.trim() === '') return null;
  if (permissionStr.startsWith('WH:')) {
    return permissionStr.replace('WH:', '').split(',').map(id => id.trim()).filter(id => id !== '');
  }
  return [];
};
