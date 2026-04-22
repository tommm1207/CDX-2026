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
 * Tạo file Word cho Hợp đồng thuê thép tấm (Mẫu phức tạp hơn có bảng)
 */
export const exportSteelSheetContract = async (data: any) => {
  const { partyA, partyB, content, contractCode, date, items } = data;
  const signDate = new Date(date || new Date());

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Tiêu ngữ (Giống mẫu trước)
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
          new Paragraph({ spacing: { before: 400 } }),

          // Tên hợp đồng
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'HỢP ĐỒNG CHO THUÊ', bold: true, size: 32, font: DEFAULT_FONT }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Số: ${contractCode}`,
                italic: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 300 } }),

          // Thông tin dự án
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '- Công trình',
                            size: DEFAULT_SIZE,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 80, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `: ${content.projectName || ''}`,
                            bold: true,
                            size: DEFAULT_SIZE,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '- Hạng mục',
                            size: DEFAULT_SIZE,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `: ${content.category || ''}`,
                            bold: true,
                            size: DEFAULT_SIZE,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '- Địa điểm',
                            size: DEFAULT_SIZE,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `: ${content.location || ''}`,
                            bold: true,
                            size: DEFAULT_SIZE,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 300 } }),

          // Phần 1 & 2 (Bên A/B) - Logic tương tự mẫu trước nhưng đổi tiêu đề động
          new Paragraph({
            children: [
              new TextRun({
                text: 'BÊN A (BÊN CHO THUÊ): ',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
              new TextRun({
                text: partyA.companyName,
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          // ... Các trường thông tin bên A ...
          new Paragraph({ spacing: { before: 200 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'BÊN B (BÊN THUÊ): ',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
              new TextRun({
                text: partyB.companyName,
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          // ... Các trường thông tin bên B ...

          new Paragraph({ spacing: { before: 300 } }),

          // Bảng đơn giá chi tiết
          new Paragraph({
            children: [
              new TextRun({
                text: 'ĐIỀU 1: CHI TIẾT VẬT TƯ VÀ ĐƠN GIÁ',
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'STT', bold: true, size: 22, font: DEFAULT_FONT }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Công việc, hạng mục',
                            bold: true,
                            size: 22,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'ĐVT', bold: true, size: 22, font: DEFAULT_FONT }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Số lượng',
                            bold: true,
                            size: 22,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Đơn giá',
                            bold: true,
                            size: 22,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Thành tiền',
                            bold: true,
                            size: 22,
                            font: DEFAULT_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              ...(items || []).map(
                (item: any, index: number) =>
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: (index + 1).toString(),
                                size: 22,
                                font: DEFAULT_FONT,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: item.name, size: 22, font: DEFAULT_FONT }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: item.unit, size: 22, font: DEFAULT_FONT }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: item.quantity.toString(),
                                size: 22,
                                font: DEFAULT_FONT,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({
                                text: item.price.toLocaleString(),
                                size: 22,
                                font: DEFAULT_FONT,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({
                                text: (item.quantity * item.price).toLocaleString(),
                                size: 22,
                                font: DEFAULT_FONT,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
              ),
            ],
          }),

          // Phân chân trang (Đại diện A/B ký tên)
          new Paragraph({ spacing: { before: 800 } }),
          new Paragraph({
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
  saveAs(blob, `Hop_Dong_Thue_Thep_Tam_${contractCode || 'New'}.docx`);
};

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
