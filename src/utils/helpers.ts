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
  const yy = d.getFullYear().toString().slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yy}${mm}${dd}-${random}`;
};

/**
 * Lấy danh sách warehouse IDs mà user được phép xem.
 * @returns null = xem tất cả, [] = không có quyền, string[] = danh sách ID
 */
export const getAllowedWarehouses = (permissionStr?: string): string[] | null => {
  if (!permissionStr || permissionStr.trim().toUpperCase() === 'ALL' || permissionStr.trim() === '')
    return null;
  if (permissionStr.startsWith('WH:')) {
    return permissionStr
      .replace('WH:', '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '');
  }
  return [];
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()
    .replace(/-/g, '');
};

/**
 * Chuyển số tiền thành chữ tiếng Việt.
 */
export const numberToVietnamese = (num: number): string => {
  if (!num || num === 0) return 'Không đồng';
  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];

  const readGroup = (n: number): string => {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    let result = '';
    if (h > 0) result += ones[h] + ' trăm ';
    if (t > 0) {
      result += tens[t];
      if (o > 0) result += ' ' + (o === 5 && t > 0 ? 'lăm' : ones[o]);
    } else if (h > 0 && o > 0) {
      result += 'lẻ ' + ones[o];
    } else if (o > 0) {
      result += ones[o];
    }
    return result.trim();
  };

  const n = Math.round(num);
  if (n === 0) return 'Không đồng';
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;

  let result = '';
  if (billions > 0) result += readGroup(billions) + ' tỷ ';
  if (millions > 0) result += readGroup(millions) + ' triệu ';
  if (thousands > 0) result += readGroup(thousands) + ' nghìn ';
  if (remainder > 0) result += readGroup(remainder);

  return result.trim().replace(/\s+/g, ' ') + ' đồng';
};

