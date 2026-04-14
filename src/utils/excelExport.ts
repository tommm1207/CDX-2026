/**
 * CDX Unified Excel Export Utility
 * Provides a consistent, branded style for all .xlsx exports across the application.
 */
import ExcelJS from 'exceljs';

// ─── Brand Colors ──────────────────────────────────────────────────────────────
const CDX_GREEN = '2D5A27';
const CDX_GREEN_LIGHT = 'EFF7EE';
const CDX_GREEN_MID = 'C8E6C1';
const CDX_GRAY = '6B7280';
const CDX_LIGHT_GRAY = 'F3F4F6';
const CDX_BORDER = 'D1D5DB';
const WHITE = 'FFFFFFFF';

// ─── Helper: thin border ──────────────────────────────────────────────────────
const thinBorder = (argb = CDX_BORDER): ExcelJS.Border => ({
  style: 'thin',
  color: { argb },
});

const allBorders = (argb = CDX_BORDER): Partial<ExcelJS.Borders> => ({
  top: thinBorder(argb),
  left: thinBorder(argb),
  bottom: thinBorder(argb),
  right: thinBorder(argb),
});

// ─── Build workbook with rich cover/summary sheet ─────────────────────────────
const buildWorkbook = (
  reportTitle: string,
  sheets: { sheetName: string; rows: any[][] }[] = [],
): ExcelJS.Workbook => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CDX ERP System';
  wb.lastModifiedBy = 'CDX System';
  wb.created = new Date();
  wb.modified = new Date();

  const cover = wb.addWorksheet('TỔNG QUAN', { views: [{ showGridLines: false }] });

  cover.getColumn(1).width = 32;
  cover.getColumn(2).width = 20;
  cover.getColumn(3).width = 22;

  // ── Banner ──
  cover.mergeCells('A1:C1');
  const banner = cover.getCell('A1');
  banner.value = 'CDX – CON ĐƯỜNG XANH';
  banner.font = { name: 'Calibri', size: 22, bold: true, color: { argb: WHITE } };
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
  banner.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
  cover.getRow(1).height = 40;

  cover.mergeCells('A2:C2');
  const sub = cover.getCell('A2');
  sub.value = 'HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX 2026';
  sub.font = { name: 'Calibri', size: 11, italic: true, color: { argb: WHITE } };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
  sub.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
  cover.getRow(2).height = 22;

  cover.getRow(3).height = 10;

  // ── Report title ──
  cover.mergeCells('A4:C4');
  const rptTitle = cover.getCell('A4');
  rptTitle.value = reportTitle.toUpperCase();
  rptTitle.font = { name: 'Calibri', size: 15, bold: true, color: { argb: CDX_GREEN } };
  rptTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN_LIGHT } };
  rptTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
  rptTitle.border = allBorders(CDX_GREEN_MID);
  cover.getRow(4).height = 30;

  // ── Export date ──
  cover.getRow(5).height = 20;
  const now = new Date();
  const lbl = cover.getCell('A5');
  lbl.value = 'Ngày xuất báo cáo:';
  lbl.font = { name: 'Calibri', bold: true, size: 10, color: { argb: CDX_GRAY } };
  lbl.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
  const dtCell = cover.getCell('B5');
  dtCell.value = now.toLocaleString('vi-VN');
  dtCell.font = { name: 'Calibri', size: 10, color: { argb: CDX_GRAY } };
  dtCell.alignment = { horizontal: 'left', vertical: 'middle' };

  cover.getRow(6).height = 10;

  // ── Table of contents header ──
  cover.getRow(7).height = 22;
  ['Tên Sheet', 'Số bản ghi', 'Ghi chú'].forEach((h, i) => {
    const cell = cover.getCell(7, i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = allBorders(CDX_GREEN);
  });

  // ── TOC rows ──
  const totalRows = sheets.reduce((acc, s) => acc + (s.rows?.length ?? 0), 0);
  sheets.forEach((s, idx) => {
    const r = 8 + idx;
    cover.getRow(r).height = 18;
    const bg = idx % 2 === 0 ? CDX_GREEN_LIGHT : WHITE;

    const n = cover.getCell(r, 1);
    n.value = s.sheetName;
    n.font = { name: 'Calibri', size: 10, bold: true };
    n.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    n.border = allBorders();
    n.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    const c = cover.getCell(r, 2);
    c.value = s.rows?.length ?? 0;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: CDX_GREEN } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    c.border = allBorders();
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.numFmt = '#,##0';

    const nt = cover.getCell(r, 3);
    nt.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    nt.border = allBorders();
  });

  // ── Total row ──
  const totIdx = 8 + sheets.length;
  cover.getRow(totIdx).height = 20;
  const tlbl = cover.getCell(totIdx, 1);
  tlbl.value = 'TỔNG CỘNG';
  tlbl.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
  tlbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
  tlbl.border = allBorders(CDX_GREEN);
  tlbl.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const tval = cover.getCell(totIdx, 2);
  tval.value = totalRows;
  tval.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
  tval.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
  tval.border = allBorders(CDX_GREEN);
  tval.alignment = { horizontal: 'center', vertical: 'middle' };
  tval.numFmt = '#,##0';

  const tnote = cover.getCell(totIdx, 3);
  tnote.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
  tnote.border = allBorders(CDX_GREEN);

  // ── Footer note ──
  const fi = totIdx + 2;
  cover.getRow(fi).height = 16;
  cover.mergeCells(`A${fi}:C${fi}`);
  const fc = cover.getCell(fi, 1);
  fc.value = '* Dữ liệu chi tiết được trình bày trong các Tab tương ứng bên dưới.';
  fc.font = { name: 'Calibri', size: 9, italic: true, color: { argb: CDX_GRAY } };

  return wb;
};

// ─── Apply CDX style to a data sheet ─────────────────────────────────────────
export const applyCDXSheetStyle = (
  sheet: ExcelJS.Worksheet,
  title: string,
  columns: string[],
  rows: any[][],
) => {
  sheet.views = [{ showGridLines: false }];
  const colCount = Math.max(columns.length, 1);
  const lastColLetter = colCount <= 26 ? String.fromCharCode(64 + colCount) : 'Z';

  // ── Banner row 1 ──
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const h1 = sheet.getCell('A1');
  h1.value = 'CDX – CON ĐƯỜNG XANH  |  CDX ERP SYSTEM';
  h1.font = { name: 'Calibri', bold: true, size: 12, color: { argb: WHITE } };
  h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
  h1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(1).height = 26;

  // ── Report title row 2 ──
  sheet.mergeCells(`A2:${lastColLetter}2`);
  const h2 = sheet.getCell('A2');
  h2.value = title.toUpperCase();
  h2.font = { name: 'Calibri', bold: true, size: 13, color: { argb: CDX_GREEN } };
  h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN_LIGHT } };
  h2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  h2.border = allBorders(CDX_GREEN_MID);
  sheet.getRow(2).height = 24;

  // ── Meta row 3 ──
  sheet.mergeCells(`A3:${lastColLetter}3`);
  const h3 = sheet.getCell('A3');
  const now = new Date();
  h3.value = `Ngày xuất: ${now.toLocaleDateString('vi-VN')}  •  ${now.toLocaleTimeString('vi-VN')}  •  Tổng: ${rows.length} bản ghi`;
  h3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: CDX_GRAY } };
  h3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN_LIGHT } };
  h3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(3).height = 16;

  // ── Spacer row 4 ──
  sheet.getRow(4).height = 6;

  // ── Column headers row 5 ──
  const headerRow = sheet.getRow(5);
  headerRow.height = 24;
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    cell.border = allBorders(CDX_GREEN);
  });

  // ── Data rows (starting row 6) ──
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
      // Visible thin borders on every cell
      cell.border = allBorders(CDX_BORDER);
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
  const footerRow = sheet.getRow(footerRowIdx);
  footerRow.height = 20;
  for (let i = 1; i <= colCount; i++) {
    const cell = footerRow.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CDX_GREEN_LIGHT } };
    cell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: CDX_GRAY } };
    cell.border = allBorders(CDX_GREEN_MID);
    if (i === 1) {
      cell.value = 'CDX ERP SYSTEM';
      cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    } else if (i === colCount) {
      cell.value = new Date().toLocaleString('vi-VN');
      cell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    }
  }

  // ── Auto-fit column widths ──
  const MIN_W = 12;
  const MAX_W = 50;
  columns.forEach((col, i) => {
    let maxLen = col.length + 4;
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

// ─── Single-sheet export (individual module reports) ─────────────────────────
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

    const wb = new ExcelJS.Workbook();
    wb.creator = 'CDX ERP System';
    wb.created = new Date();

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

// ─── Multi-sheet backup export ───────────────────────────────────────────────
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

    const wb = buildWorkbook(
      reportTitle,
      sheets.map((s) => ({ sheetName: s.sheetName, rows: s.rows })),
    );

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
