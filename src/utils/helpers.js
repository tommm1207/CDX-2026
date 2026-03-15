export const isUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const generateCostCode = (date, employeeId) => {
  if (!date || !employeeId) return '';
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${employeeId}-${dd}${mm}${yy}`;
};
export const generateCode = (prefix) => {
  const d = new Date();
  const year = d.getFullYear().toString().slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}${month}${date}-${random}`;
};
