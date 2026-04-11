// Phiên bản TypeScript của format.js — thêm type annotations
// format.js vẫn được giữ lại để tương thích ngược với các imports hiện tại

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
};

export const formatNumber = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const num =
    typeof val === 'number' ? val : parseFloat(val.toString().replace(/\./g, '').replace(',', '.'));
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const parseNumber = (val: string): number => {
  if (!val) return 0;
  const cleanVal = val.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanVal) || 0;
};

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export const numberToWords = (number: number): string => {
  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tens = [
    '',
    'mười',
    'hai mươi',
    'ba mươi',
    'bốn mươi',
    'năm mươi',
    'sáu mươi',
    'bảy mươi',
    'tám mươi',
    'chín mươi',
  ];

  if (number === 0) return 'không đồng';

  const readGroup = (n: number): string => {
    let s = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) {
      s += units[h] + ' trăm ';
      if (t === 0 && u > 0) s += 'lẻ ';
    }
    if (t > 0) s += tens[t] + ' ';
    if (u > 0) {
      if (u === 1 && t > 1) s += 'mốt';
      else if (u === 5 && t > 0) s += 'lăm';
      else s += units[u];
    }
    return s.trim();
  };

  let res = '';
  const billion = Math.floor(number / 1000000000);
  const million = Math.floor((number % 1000000000) / 1000000);
  const thousand = Math.floor((number % 1000000) / 1000);
  const remainder = number % 1000;

  if (billion > 0) res += readGroup(billion) + ' tỷ ';
  if (million > 0) res += readGroup(million) + ' triệu ';
  if (thousand > 0) res += readGroup(thousand) + ' ngàn ';
  if (remainder > 0) res += readGroup(remainder);

  return res.trim() + ' đồng';
};
