/**
 * Utility to find the first missing index in a sequence of codes.
 * Example: ['CDX001', 'CDX002', 'CDX007'], prefix 'CDX' -> returns 'CDX003'
 */
export const generateSmartCode = (
  existingCodes: string[],
  prefix: string,
  padding: number = 3,
): string => {
  if (!existingCodes || existingCodes.length === 0) {
    return `${prefix}${'1'.padStart(padding, '0')}`;
  }

  // Extract numeric parts and filter out non-matching codes
  const indices = existingCodes
    .map((code) => {
      if (!code || !code.startsWith(prefix)) return null;
      // Extract numeric part: find the first sequence of digits after prefix
      const numPartMatch = code.substring(prefix.length).match(/\d+/);
      if (!numPartMatch) return null;
      const num = parseInt(numPartMatch[0], 10);
      return isNaN(num) ? null : num;
    })
    .filter((num): num is number => num !== null)
    .sort((a, b) => a - b);

  if (indices.length === 0) {
    return `${prefix}${'1'.padStart(padding, '0')}`;
  }

  // Find the first gap starting from 1
  let nextIndex = 1;
  for (const index of indices) {
    if (index === nextIndex) {
      nextIndex++;
    } else if (index > nextIndex) {
      // Found a gap
      break;
    }
  }

  return `${prefix}${nextIndex.toString().padStart(padding, '0')}`;
};
