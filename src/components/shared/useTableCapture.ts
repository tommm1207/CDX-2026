import { useCallback, useState } from 'react';
import { toPng } from 'html-to-image';

export interface CaptureOptions {
  reportTitle: string;
  subtitle?: string;
  showNetSalary?: boolean;
  fileName?: string;
}

/**
 * Hook capture bảng thành PNG.
 * Kỹ thuật: wrap element thật (không clone) bằng header/footer,
 * tạm xóa overflow constraints, chụp, rồi restore.
 * Đảm bảo Tailwind CSS variables và computed styles hoạt động đúng.
 */
export const useTableCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);

  const captureElement = useCallback(
    async (tableEl: HTMLElement, options: CaptureOptions): Promise<string | null> => {
      if (!tableEl) return null;
      setIsCapturing(true);

      // ---- Saved state for cleanup ----
      const savedOverflows: { el: HTMLElement; saved: Partial<CSSStyleDeclaration> }[] = [];
      let wrapper: HTMLDivElement | null = null;
      let headerEl: HTMLDivElement | null = null;
      let footerEl: HTMLDivElement | null = null;
      const originalParent = tableEl.parentNode as HTMLElement | null;
      const originalNextSibling = tableEl.nextSibling;
      let originalTableWidth: string = '';
      let originalTableMinWidth: string = '';

      try {
        const { logoBase64 } = await import('@/utils/logoBase64');
        const { reportTitle, subtitle, showNetSalary = false } = options;

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const finalSubtitle =
          subtitle ?? `Ngày: ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

        // ---- 1. Remove overflow constraints (inside tableEl subtree) ----
        const removeOverflow = (el: HTMLElement) => {
          const cs = window.getComputedStyle(el);
          const needsFix =
            cs.overflow === 'hidden' ||
            cs.overflow === 'auto' ||
            cs.overflowX === 'hidden' ||
            cs.overflowX === 'auto' ||
            (cs.maxHeight !== 'none' && cs.maxHeight !== '');

          if (needsFix) {
            savedOverflows.push({
              el,
              saved: {
                overflow: el.style.overflow,
                overflowX: el.style.overflowX,
                overflowY: el.style.overflowY,
                maxHeight: el.style.maxHeight,
                width: el.style.width,
                minWidth: el.style.minWidth,
              },
            });
            el.style.overflow = 'visible';
            el.style.overflowX = 'visible';
            el.style.overflowY = 'visible';
            el.style.maxHeight = 'none';
            // Force width expansion for scrollable containers
            if (el.scrollWidth > el.clientWidth) {
              el.style.width = 'max-content';
              el.style.minWidth = 'max-content';
            }
          }
          Array.from(el.children).forEach((c) => removeOverflow(c as HTMLElement));
        };

        originalTableWidth = tableEl.style.width;
        originalTableMinWidth = tableEl.style.minWidth;
        tableEl.style.width = 'max-content';
        tableEl.style.minWidth = 'max-content';

        removeOverflow(tableEl);

        // ---- 2. Build header HTML ----
        headerEl = document.createElement('div');
        headerEl.innerHTML = `
          <div style="background:#fff;padding:20px 24px 16px;border-bottom:1px solid #F3F4F6;font-family:'Inter',system-ui,sans-serif;width:max-content;min-width:100%;box-sizing:border-box;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <img src="${logoBase64}" alt="CDX" style="width:44px;height:44px;border-radius:10px;object-fit:contain;flex-shrink:0;" />
              <div>
                <p style="margin:0;font-size:11px;font-weight:900;color:#1F2937;text-transform:uppercase;letter-spacing:0.06em;line-height:1.3;">CDX - CON ĐƯỜNG XANH</p>
                <p style="margin:0;font-size:8.5px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.1em;margin-top:1px;">HỆ THỐNG QUẢN LÝ KHO VÀ NHÂN SỰ</p>
              </div>
            </div>
            <h1 style="margin:0;font-size:26px;font-weight:900;font-style:italic;color:#2D5A27;letter-spacing:-0.01em;line-height:1.1;text-transform:uppercase;">${reportTitle}</h1>
            <p style="margin:4px 0 0;font-size:11px;font-weight:600;color:#6B7280;">${finalSubtitle}</p>
          </div>
        `;

        // ---- 3. Build footer HTML ----
        footerEl = document.createElement('div');
        footerEl.innerHTML = `
          <div style="background:#fff;padding:8px 24px 14px;font-family:'Inter',system-ui,sans-serif;width:max-content;min-width:100%;box-sizing:border-box;">
            ${showNetSalary ? '<p style="margin:0 0 6px;font-size:8px;font-weight:700;color:#9CA3AF;letter-spacing:0.2em;text-transform:uppercase;">NET SALARY DETAILS</p>' : ''}
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #F3F4F6;padding-top:6px;">
              <span style="font-size:9px;font-weight:700;color:#D1D5DB;text-transform:uppercase;letter-spacing:0.12em;">CDX ERP SYSTEM</span>
              <span style="font-size:9px;font-weight:700;color:#D1D5DB;text-transform:uppercase;letter-spacing:0.12em;">Xuất lúc: ${timeStr}</span>
            </div>
          </div>
        `;

        // ---- 4. Wrap tableEl with header + footer ----
        wrapper = document.createElement('div');
        wrapper.style.background = '#ffffff';
        wrapper.style.fontFamily = "'Inter', system-ui, sans-serif";
        wrapper.style.width = 'max-content';
        wrapper.style.minWidth = '100%';

        // Insert wrapper in place of tableEl
        if (originalParent) {
          originalParent.insertBefore(wrapper, tableEl);
        }
        wrapper.appendChild(headerEl);
        wrapper.appendChild(tableEl); // Move tableEl inside wrapper
        wrapper.appendChild(footerEl);

        // ---- 5. Wait for layout/paint to settle ----
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        await new Promise<void>((r) => setTimeout(r, 150));

        // Get actual full dimensions after layout update
        const fullWidth = wrapper.scrollWidth;
        const fullHeight = wrapper.scrollHeight;

        // ---- 6. Capture ----
        const dataUrl = await toPng(wrapper, {
          cacheBust: true,
          backgroundColor: '#ffffff',
          quality: 1,
          pixelRatio: 2,
          skipFonts: false,
          width: fullWidth,
          height: fullHeight,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
            width: `${fullWidth}px`,
            height: `${fullHeight}px`,
          },
        });

        return dataUrl;
      } catch (err) {
        console.error('[useTableCapture] capture failed:', err);
        return null;
      } finally {
        // ---- 7. Always restore DOM ----
        try {
          if (wrapper && originalParent) {
            // Move tableEl back to original position
            if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
              originalParent.insertBefore(tableEl, originalNextSibling);
            } else {
              originalParent.appendChild(tableEl);
            }
            wrapper.remove();
          }
          // Restore overflow styles
          const restoreStyle = (el: HTMLElement, prop: any, val: string | undefined) => {
            if (val) {
              (el.style as any)[prop] = val;
            } else {
              el.style.removeProperty(prop.replace(/[A-Z]/g, (m: string) => '-' + m.toLowerCase()));
            }
          };

          savedOverflows.forEach(({ el, saved }) => {
            if (saved.overflow !== undefined) restoreStyle(el, 'overflow', saved.overflow);
            if (saved.overflowX !== undefined) restoreStyle(el, 'overflowX', saved.overflowX);
            if (saved.overflowY !== undefined) restoreStyle(el, 'overflowY', saved.overflowY);
            if (saved.maxHeight !== undefined) restoreStyle(el, 'maxHeight', saved.maxHeight);
            if (saved.width !== undefined) restoreStyle(el, 'width', saved.width);
            if (saved.minWidth !== undefined) restoreStyle(el, 'minWidth', saved.minWidth);
          });

          if (tableEl) {
            restoreStyle(tableEl, 'width', originalTableWidth);
            restoreStyle(tableEl, 'minWidth', originalTableMinWidth);
          }
        } catch (cleanupErr) {
          console.warn('[useTableCapture] cleanup error:', cleanupErr);
        }
        setIsCapturing(false);
      }
    },
    [],
  );

  return { captureElement, isCapturing };
};
