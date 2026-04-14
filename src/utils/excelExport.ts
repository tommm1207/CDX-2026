/**
 * CDX Unified Excel Export Utility
 * Provides a consistent, branded style for all .xlsx exports across the application.
 */
import ExcelJS from 'exceljs';

// ─── Brand Colors ──────────────────────────────────────────────────────────────
const CDX_GREEN = '2D5A27';
const CDX_GREEN_LIGHT = 'EFF7EE';
const CDX_GRAY = '6B7280';
const CDX_LIGHT_GRAY = 'F3F4F6';
const WHITE = 'FFFFFFFF';

// ─── Helper: build a CDX-branded workbook ──────────────────
const buildWorkbook = (reportTitle: string, includeCover = true): ExcelJS.Workbook => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CDX ERP System';
  wb.lastModifiedBy = 'CDX System';
  wb.created = new Date();
  wb.modified = new Date();

  if (includeCover) {
    // Cover / Summary sheet
    const cover = wb.addWorksheet('TỔNG QUAN', { views: [{ showGridLines: false }] });

    cover.getColumn(1).width = 28;
    cover.getColumn(2).width = 55;

    const title = cover.getCell('A1');
    title.value = 'CDX – CON ĐƯỜNG XANH';
    title.font = { name: 'Calibri', size: 20, bold: true, color: { argb: CDX_GREEN } };

    const sub = cover.getCell('A2');
    sub.value = 'HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ';
    sub.font = { name: 'Calibri', size: 11, italic: true, color: { argb: CDX_GRAY } };

    cover.getCell('A4').value = reportTitle.toUpperCase();
    cover.getCell('A4').font = { name: 'Calibri', size: 14, bold: true };

    cover.getCell('A6').value = 'Ngày xuất:';
    cover.getCell('B6').value = new Date().toLocaleString('vi-VN');
    cover.getCell('A6').font = { bold: true };

    cover.getCell('A8').value = 'Dữ liệu chi tiết được trình bày trong các Tab tương ứng bên dưới.';
    cover.getCell('A8').font = { italic: true, color: { argb: CDX_GRAY } };
  }

  return wb;
};

// ─── Apply CDX style to a single sheet ───────────────────────────────────────
export const applyCDXSheetStyle = (
  sheet: ExcelJS.Worksheet,
  title: string,
  columns: string[],
  rows: any[][],
) => {
  sheet.views = [{ showGridLines: false }];

  // ── Header block (rows 1-4) ──
  sheet.mergeCells('A1:' + String.fromCharCode(64 + Math.max(columns.length, 1)) + '1');
  const h1 = sheet.getCell('A1');
  h1.value = 'CDX – CON ĐƯỜNG XANH  |  CDX ERP SYSTEM';
  h1.font = { name: 'Calibri', bold: true, size: 13, color: { argb: WHITE } };
  h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
  h1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  sheet.mergeCells('A2:' + String.fromCharCode(64 + Math.max(columns.length, 1)) + '2');
  const h2 = sheet.getCell('A2');
  h2.value = title.toUpperCase();
  h2.font = { name: 'Calibri', bold: true, size: 14, italic: true, color: { argb: CDX_GREEN } };
  h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN_LIGHT } };
  h2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  sheet.mergeCells('A3:' + String.fromCharCode(64 + Math.max(columns.length, 1)) + '3');
  const h3 = sheet.getCell('A3');
  const now = new Date();
  h3.value = `Ngày xuất: ${now.toLocaleDateString('vi-VN')}  •  ${now.toLocaleTimeString('vi-VN')}`;
  h3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: CDX_GRAY } };
  h3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN_LIGHT } };
  h3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  sheet.getRow(1).height = 26;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 16;

  // ── Column header row (row 5) ──
  const headerRow = sheet.getRow(5);
  headerRow.height = 22;
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: WHITE } },
      left: { style: 'thin', color: { argb: WHITE } },
      bottom: { style: 'thin', color: { argb: WHITE } },
      right: { style: 'thin', color: { argb: WHITE } },
    };
  });

  // ── Data rows (starting at row 6) ──
  rows.forEach((rowData, rowIdx) => {
    const row = sheet.getRow(rowIdx + 6);
    row.height = 18;
    const isEven = rowIdx % 2 === 1;
    rowData.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val ?? '';
      cell.font = { name: 'Calibri', size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? CDX_LIGHT_GRAY : 'FFFFFFFF' },
      };
      cell.border = {
        top: { style: 'hair', color: { argb: CDX_LIGHT_GRAY } },
        left: { style: 'hair', color: { argb: CDX_LIGHT_GRAY } },
        bottom: { style: 'hair', color: { argb: CDX_LIGHT_GRAY } },
        right: { style: 'hair', color: { argb: CDX_LIGHT_GRAY } },
      };
      if (typeof val === 'number') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
    row.commit();
  });

  // ── Footer row ──
  const footerRowIdx = rows.length + 7;
  const maxCol = Math.max(columns.length, 1);
  const footerRow = sheet.getRow(footerRowIdx);
  footerRow.height = 20;

  for (let i = 1; i <= maxCol; i++) {
    const cell = footerRow.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN_LIGHT } };
    cell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF9CA3AF' } };

    if (i === 1) {
      cell.value = `CDX ERP SYSTEM`;
      cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    } else if (i === maxCol) {
      cell.value = `${new Date().toLocaleString('vi-VN')}`;
      cell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    }
  }

  if (maxCol === 1) {
    footerRow.getCell(1).value = `CDX ERP SYSTEM  •  ${new Date().toLocaleString('vi-VN')}`;
    footerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // ── Auto-fit column widths ──
  const MIN_W = 10;
  const MAX_W = 50;
  columns.forEach((col, i) => {
    let maxLen = col.length + 2;
    rows.forEach((r) => {
      const v = r[i];
      if (v != null) {
        const len = String(v).length;
        if (len > maxLen) maxLen = len;
      }
    });
    sheet.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, MIN_W), MAX_W);
  });
};

// ─── Main export helper for individual modules ────────────────────────────────
export const exportToExcel = async ({
  title,
  sheetName,
  columns,
  rows,
  fileName,
  addToast,
}: {
  title: string;
  sheetName: string;
  columns: string[];
  rows: any[][];
  fileName: string;
  addToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) => {
  try {
    if (!rows || rows.length === 0) {
      addToast?.('Không có dữ liệu để xuất', 'warning');
      return;
    }

    addToast?.('Đang tạo file Excel...', 'info');

    const wb = buildWorkbook(title, false);
    const sheet = wb.addWorksheet(sheetName.substring(0, 31).replace(/\//g, '-'), {
      views: [{ showGridLines: false }],
    });

    applyCDXSheetStyle(sheet, title, columns, rows);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    addToast?.('Xuất Excel thành công!', 'success');
  } catch (err: any) {
    console.error('[CDX] exportToExcel error:', err);
    addToast?.('Lỗi xuất Excel: ' + err.message, 'error');
  }
};

// ─── Multi-sheet backup helper ──────────────────────────────────────────────
export type BackupSheetInput = {
  sheetName: string;
  title: string;
  columns: string[];
  rows: any[][];
};

export const exportBackupToExcel = async ({
  reportTitle,
  sheets,
  fileName,
  addToast,
}: {
  reportTitle: string;
  sheets: BackupSheetInput[];
  fileName: string;
  addToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) => {
  try {
    addToast?.('Đang tạo file sao lưu...', 'info');
    const wb = buildWorkbook(reportTitle, true);

    for (const s of sheets) {
      if (!s.rows || s.rows.length === 0) continue;
      const ws = wb.addWorksheet(s.sheetName.substring(0, 31).replace(/\//g, '-'), {
        views: [{ showGridLines: false }],
      });
      applyCDXSheetStyle(ws, s.title, s.columns, s.rows);
    }

    const buffer = await wb.xlsx.writeBuffer();
    return buffer;
  } catch (err: any) {
    console.error('[CDX] exportBackupToExcel error:', err);
    addToast?.('Lỗi tạo file sao lưu: ' + err.message, 'error');
    return null;
  }
};
