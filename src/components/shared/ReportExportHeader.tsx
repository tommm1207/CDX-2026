import React, { useRef, useEffect } from 'react';
import { logoBase64 } from '@/utils/logoBase64';

export const CanvasLogo = ({
  size = 44,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <img
      src={logoBase64}
      className={className}
      style={{
        width: size,
        height: size,
        display: 'block',
        borderRadius: size * 0.2, // Visual fallback for rounded corners
        backgroundColor: '#fff',
        objectFit: 'contain',
        ...style,
      }}
      alt="Logo"
    />
  );
};

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
  const defaultSubtitle = `Ngày lập: ${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  return (
    <div
      style={{
        background: '#fff',
        padding: '20px 24px 16px',
        borderBottom: '1px solid #F3F4F6',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <CanvasLogo />
        <div style={{ marginLeft: 10 }}>
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
            CON ĐƯỜNG XANH
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 8,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginTop: 1,
            }}
          >
            CỘNG TÁC ĐỂ VƯƠN XA
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 9,
              fontWeight: 700,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 1,
            }}
          >
            HỆ THỐNG QUẢN LÝ KHO & NHÂN SỰ CDX
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
          whiteSpace: 'nowrap',
        }}
      >
        {reportTitle}
      </h1>

      {/* Row 3: Subtitle */}
      <p
        style={{
          margin: '8px 0 0',
          fontSize: 24,
          fontWeight: 1000,
          color: '#374151',
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
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
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

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
