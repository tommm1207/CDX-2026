import { logoBase64 } from '@/utils/logoBase64';

interface ReportExportHeaderProps {
  /** Tên báo cáo, VD: "BẢNG TÍNH LƯƠNG", "BẢNG CHẤM CÔNG" */
  reportTitle: string;
  /** Dòng phụ dưới tên báo cáo. Nếu không truyền, tự hiển thị "Ngày: DD/MM/YYYY" */
  subtitle?: string;
}

/** Compact header dùng để render trong vùng DOM capture (không hiện trên màn hình thường).
 *  Layout: logo + tên công ty | tên báo cáo | dòng phụ */
export const ReportExportHeader = ({ reportTitle, subtitle }: ReportExportHeaderProps) => {
  const today = new Date();
  const defaultSubtitle = `Ngày: ${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  return (
    <div
      style={{
        background: '#fff',
        padding: '20px 24px 16px',
        borderBottom: '1px solid #F3F4F6',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Row 1: Logo + company */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <img
          src={logoBase64}
          alt="Logo CDX"
          style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 900,
              color: '#1F2937',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              lineHeight: 1.3,
            }}
          >
            CDX - CON ĐƯỜNG XANH
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 8.5,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginTop: 1,
            }}
          >
            HỆ THỐNG QUẢN LÝ KHO VÀ NHÂN SỰ
          </p>
        </div>
      </div>

      {/* Row 2: Report title */}
      <h1
        style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 900,
          fontStyle: 'italic',
          color: '#2D5A27',
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
          textTransform: 'uppercase',
        }}
      >
        {reportTitle}
      </h1>

      {/* Row 3: Subtitle */}
      <p
        style={{
          margin: '4px 0 0',
          fontSize: 11,
          fontWeight: 600,
          color: '#6B7280',
        }}
      >
        {subtitle ?? defaultSubtitle}
      </p>
    </div>
  );
};

/** Footer nhỏ xuất hiện ở cuối ảnh. */
export const ReportExportFooter = ({ showNetSalary = false }: { showNetSalary?: boolean }) => {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  return (
    <div
      style={{
        background: '#fff',
        padding: '8px 24px 12px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {showNetSalary && (
        <p
          style={{
            margin: '0 0 6px',
            fontSize: 8,
            fontWeight: 700,
            color: '#9CA3AF',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          NET SALARY DETAILS
        </p>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #F3F4F6',
          paddingTop: 6,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#D1D5DB',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          CDX ERP SYSTEM
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#D1D5DB',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          {timeStr}
        </span>
      </div>
    </div>
  );
};
