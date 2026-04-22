/**
 * Chuyển đổi số tiền thành chữ tiếng Việt (Đồng)
 */
const defaultNumbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(number: number, readZero: boolean): string {
  let res = '';
  const hundred = Math.floor(number / 100);
  const ten = Math.floor((number % 100) / 10);
  const unit = number % 10;

  if (hundred > 0 || readZero) {
    res += defaultNumbers[hundred] + ' trăm ';
  }

  if (ten > 0) {
    if (ten === 1) res += 'mười ';
    else res += defaultNumbers[ten] + ' mươi ';
  } else if (hundred > 0 && unit > 0) {
    res += 'lẻ ';
  }

  if (unit > 0) {
    if (unit === 1 && ten > 1) res += 'mốt';
    else if (unit === 5 && ten > 0) res += 'lăm';
    else res += defaultNumbers[unit];
  }

  return res;
}

export function numberToVnText(amount: number): string {
  if (amount === 0) return 'Không đồng';
  if (isNaN(amount)) return '';

  let res = '';
  let tempAmount = Math.abs(amount);
  const groups = [];

  while (tempAmount > 0) {
    groups.push(tempAmount % 1000);
    tempAmount = Math.floor(tempAmount / 1000);
  }

  const groupLabels = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];

  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    const groupText = readThreeDigits(groupVal, i < groups.length - 1);

    if (groupVal > 0) {
      res += groupText + groupLabels[i] + ' ';
    }
  }

  res = res.trim();
  if (res.length > 0) {
    res = res.charAt(0).toUpperCase() + res.slice(1) + ' đồng';
  }

  return res;
}
