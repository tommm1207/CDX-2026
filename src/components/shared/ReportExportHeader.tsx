import React, { useRef, useEffect } from 'react';
import { logoBase64 } from '@/utils/logoBase64';

let cachedLogoDataUrl: string | null = null;

export const CanvasLogo = ({
  size = 44,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (cachedLogoDataUrl) {
      if (imgRef.current) imgRef.current.src = cachedLogoDataUrl;
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 4; // High density enough for 44px
    canvas.width = size * scale;
    canvas.height = size * scale;

    const img = new Image();
    img.src = logoBase64;
    img.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const radius = size * 0.2 * scale;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(canvas.width - radius, 0);
      ctx.arcTo(canvas.width, 0, canvas.width, radius, radius);
      ctx.lineTo(canvas.width, canvas.height - radius);
      ctx.arcTo(canvas.width, canvas.height, canvas.width - radius, canvas.height, radius);
      ctx.lineTo(radius, canvas.height);
      ctx.arcTo(0, canvas.height, 0, canvas.height - radius, radius);
      ctx.lineTo(0, radius);
      ctx.arcTo(0, 0, radius, 0, radius);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      cachedLogoDataUrl = dataUrl;
      if (imgRef.current) imgRef.current.src = dataUrl;
    };
  }, [size]);

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <img
        ref={imgRef}
        className={className}
        style={{
          width: size,
          height: size,
          display: 'block',
          borderRadius: size * 0.2, // Visual fallback
          ...style,
        }}
        alt="Logo"
      />
    </>
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
