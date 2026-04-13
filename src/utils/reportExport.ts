import { toPng } from 'html-to-image';

/**
 * Standardized image export utility for CDX reports.
 * Pattern: capture element → direct share (mobile) or download (desktop).
 * No preview modal.
 */
export const exportTableImage = async ({
  element,
  fileName,
  title = 'Báo cáo CDX',
  text = 'Báo cáo xuất từ CDX ERP System',
  onStart,
  onEnd,
  onError,
  addToast,
}: {
  element: HTMLElement;
  fileName: string;
  title?: string;
  text?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  addToast?: (msg: string, type?: 'error' | 'success' | 'info' | 'warning') => void;
}) => {
  try {
    onStart?.();
    if (addToast) addToast('Đang tạo ảnh báo cáo...', 'info');

    // Stabilization wait (Safari / WebKit)
    await new Promise((resolve) => setTimeout(resolve, 600));

    const dataUrl = await toPng(element, {
      cacheBust: true,
      backgroundColor: '#FFFFFF',
      quality: 1,
      pixelRatio: 4,
      skipFonts: false,
    });

    // Convert to blob/file
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: 'image/png' });

    // Mobile: native share
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        if (addToast)
          addToast('Đang mở bảng chọn. Hãy chọn "Lưu hình ảnh" để lưu vào máy.', 'info');
        await navigator.share({ files: [file], title, text });
        if (addToast) addToast('Đã mở bảng thành công!', 'success');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User cancelled, do nothing
          return;
        }
        // Fallback to download for other errors
      }
    }

    // Default: anchor download
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (addToast) addToast('Đã tải ảnh về máy!', 'success');
  } catch (err) {
    console.error('[CDX] exportTableImage error:', err);
    onError?.(err);
    if (addToast) addToast('Lỗi khi tạo ảnh báo cáo', 'error');
  } finally {
    onEnd?.();
  }
};
