import { logoBase64 } from '@/utils/logoBase64';
import { useRef, useEffect } from 'react';

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Kích thước canvas 8K (Retina++ scale)
    const scale = 8;
    canvas.width = size * scale;
    canvas.height = size * scale;

    const img = new Image();
    img.src = logoBase64;
    img.onload = () => {
      // Làm mịn ảnh tối đa
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Bo góc (chuẩn gấp 8, ước tính bo góc khoảng 22% của size)
      const radius = size * 0.22 * scale;
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

      // Nền trắng dự phòng nếu logo PNG/JPEG có lỗi nhiễu vùng biên
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'block',
        ...style,
      }}
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
          margin: '6px 0 0',
          fontSize: 22,
          fontWeight: 900,
          color: '#4B5563',
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
