import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import { numberToVnText } from './numberToVnText';

const DEFAULT_FONT = 'Times New Roman';
const DEFAULT_SIZE = 26; // 13pt = 26 half-points

/**
 * Tạo file Word cho Hợp đồng thuê xe cuốc
 */
export const exportLeaseVehicleContract = async (data: any) => {
  const { partyA, partyB, content, contractCode, date } = data;
  const signDate = new Date(date || new Date());

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Tiêu ngữ
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Độc lập - Tự do - Hạnh phúc',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '--------------------------',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 400 } }),

          // Tên hợp đồng
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'HỢP ĐỒNG KINH TẾ', bold: true, size: 32, font: DEFAULT_FONT }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `(V/v thuê thiết bị máy đào xe cuốc bánh xích phục vụ thi công móng trụ điện)`,
                italic: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 300 } }),

          // Căn cứ
          ...[
            'Căn cứ Bộ luật dân sự 91/2015/QH13 được Quốc hội thông qua ngày 24 tháng 11 năm 2015, có hiệu lực thi hành kể từ ngày 01 tháng 01 năm 2017.',
            'Căn cứ Luật thương mại số 36/2005/QH11 được Quốc hội thông qua ngày 14 tháng 6 năm 2005, có hiệu lực thi hành kể từ ngày 01 tháng 01 năm 2006.',
            `Hôm nay, ngày ${signDate.getDate().toString().padStart(2, '0')} tháng ${(signDate.getMonth() + 1).toString().padStart(2, '0')} năm ${signDate.getFullYear()}, tại Công ty Cổ phần xuất nhập khẩu Con Đường Xanh, địa chỉ: Lầu 7, số 207 đường Hoàng Sa, Phường Tân Định, Q1.Tp Hồ Chí Minh.`,
            'Căn cứ nhu cầu và khả năng của hai bên. Chúng tôi gồm:',
          ].map(
            (text) =>
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 450 },
                spacing: { line: 360 },
                children: [new TextRun({ text, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
              }),
          ),

          new Paragraph({ spacing: { before: 200 } }),

          // BÊN A
          new Paragraph({
            children: [
              new TextRun({
                text:
                  'BÊN A (BÊN THUÊ): ' +
                  (partyA.companyName || 'CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU CON ĐƯỜNG XANH'),
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          ...[
            {
              label: 'Đại diện',
              value: partyA.representative,
              subLabel: 'Chức vụ',
              subValue: partyA.position,
            },
            { label: 'Địa chỉ', value: partyA.address },
            { label: 'Mã số thuế', value: partyA.taxCode },
            { label: 'Email', value: partyA.email },
            { label: 'Điện thoại', value: partyA.phone },
            {
              label: 'Ghi chú',
              value:
                partyA.notes || 'Biên bản/giấy uỷ quyền cho thuê. người đại diện theo pháp luật',
            },
          ].map(
            (item) =>
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 360 },
                children: [
                  new TextRun({
                    text: `\t${item.label}: ${item.value || '....................................'}`,
                    size: DEFAULT_SIZE,
                    font: DEFAULT_FONT,
                  }),
                  ...(item.subLabel
                    ? [
                        new TextRun({
                          text: `\t\t${item.subLabel}: ${item.subValue || '....................'}`,
                          size: DEFAULT_SIZE,
                          font: DEFAULT_FONT,
                        }),
                      ]
                    : []),
                ],
              }),
          ),

          new Paragraph({ spacing: { before: 200 } }),

          // BÊN B
          new Paragraph({
            children: [
              new TextRun({
                text:
                  'BÊN B (BÊN CHO THUÊ): ' +
                  (partyB.companyName || '..................................................'),
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          ...[
            {
              label: 'Đại diện',
              value: partyB.representative,
              subLabel: 'Chức vụ',
              subValue: partyB.position,
            },
            { label: 'Địa chỉ', value: partyB.address },
            { label: 'Mã số thuế', value: partyB.taxCode },
            { label: 'Email', value: partyB.email },
            { label: 'Điện thoại', value: partyB.phone },
            { label: 'Số TK', value: partyB.bankAccount },
          ].map(
            (item) =>
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 360 },
                children: [
                  new TextRun({
                    text: `\t${item.label}: ${item.value || '....................................'}`,
                    size: DEFAULT_SIZE,
                    font: DEFAULT_FONT,
                  }),
                  ...(item.subLabel
                    ? [
                        new TextRun({
                          text: `\t\t${item.subLabel}: ${item.subValue || '....................'}`,
                          size: DEFAULT_SIZE,
                          font: DEFAULT_FONT,
                        }),
                      ]
                    : []),
                ],
              }),
          ),

          new Paragraph({
            spacing: { before: 200, line: 360 },
            children: [
              new TextRun({
                text: 'Sau khi bàn bạc cùng thoả thuận hai bên thống nhất ký kết hợp đồng với các nội dung sau:',
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),

          // ĐIỀU 1
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: 'ĐIỀU 1: NỘI DUNG VÀ ĐƠN GIÁ THUÊ.',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, line: 360 },
            children: [
              new TextRun({
                text: '1. Nội dung:',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360 },
            children: [
              new TextRun({
                text:
                  content.workContent ||
                  'Bên B đồng ý cho bên A thuê các thiết bị... phục vụ dự án...',
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 100, line: 360 },
            children: [
              new TextRun({
                text: '2. Đơn giá và thời gian thuê:',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          ...[
            `Thời gian: ${content.duration || '01 tháng'}, bắt đầu tính từ ngày: ${content.startDate || '................'} đến hết ngày ................`,
            `Giá thuê: ${Number(content.totalPrice).toLocaleString('vi-VN')} Việt nam đồng/ tháng (Bằng chữ: ${numberToVnText(content.totalPrice)}/ tháng).`,
            `Thời gian thanh toán: Sau 15 ngày làm việc, bên B xuất hóa đơn VAT và bên A sẽ thanh toán cho bên B số tiền: ${Number(content.paymentAmount).toLocaleString('vi-VN')} đồng/ tháng (Bằng chữ: ${numberToVnText(content.paymentAmount)}). Đơn giá trên đã bao gồm thuế.`,
          ].map(
            (text) =>
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 450 },
                spacing: { line: 360 },
                children: [new TextRun({ text, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
              }),
          ),

          // Các điều khoản khác có thể viết thêm ở đây...
          new Paragraph({
            spacing: { before: 800 },
            children: [
              new TextRun({
                text: 'ĐẠI DIỆN BÊN A\t\t\t\t\tĐẠI DIỆN BÊN B',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  saveAs(blob, `Hop_Dong_Thue_Xe_${contractCode || 'New'}.docx`);
};
