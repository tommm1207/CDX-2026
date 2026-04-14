import { logoBase64 } from './logoBase64';

export interface InjectLogoOptions {
  x: number;
  y: number;
  size: number;
  pixelRatio?: number;
}

/**
 * Manually injects/stamps the logo onto a captured image DataURL.
 * This bypasses browser capture bugs by performing a manual canvas merge.
 * Perfect for iOS/Safari where html-to-image often fails to capture base64 images inside clones.
 */
export const injectLogoToImage = async (
  mainImageDataUrl: string,
  options: InjectLogoOptions,
): Promise<string> => {
  const { x, y, size, pixelRatio = 1 } = options;

  return new Promise((resolve, reject) => {
    const mainImg = new Image();
    mainImg.crossOrigin = 'anonymous';
    mainImg.src = mainImageDataUrl;

    mainImg.onload = () => {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = logoBase64;

      logoImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = mainImg.width;
        canvas.height = mainImg.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }

        // 1. Draw the main captured image
        ctx.drawImage(mainImg, 0, 0);

        // 2. Prepare coordinates
        const renderX = x * (mainImg.width / (mainImg.width / pixelRatio));
        const renderY = y * (mainImg.height / (mainImg.height / pixelRatio));
        const renderSize = size * (mainImg.width / (mainImg.width / pixelRatio));

        // Use absolute pixel ratio if possible, otherwise calculate based on image width
        const actualPixelRatio = mainImg.width / (mainImg.width / (pixelRatio || 1));
        const finalX = x * actualPixelRatio;
        const finalY = y * actualPixelRatio;
        const finalSize = size * actualPixelRatio;

        ctx.save();

        // 3. Clear the area where the logo will be (in case a "bad" logo was captured)
        // We clear a significant area to the right and bottom to wipe out any residual shadows
        ctx.fillStyle = '#FCFCFC'; // Match the bill background
        ctx.fillRect(finalX - 10, finalY - 10, finalSize + 40, finalSize + 40);

        // 4. Create rounded path for the logo background
        const radius = finalSize * 0.25; // rounded-xl match (~11px for 44px)
        ctx.beginPath();
        ctx.moveTo(finalX + radius, finalY);
        ctx.lineTo(finalX + finalSize - radius, finalY);
        ctx.arcTo(finalX + finalSize, finalY, finalX + finalSize, finalY + radius, radius);
        ctx.lineTo(finalX + finalSize, finalY + finalSize - radius);
        ctx.arcTo(
          finalX + finalSize,
          finalY + finalSize,
          finalX + finalSize - radius,
          finalY + finalSize,
          radius,
        );
        ctx.lineTo(finalX + radius, finalY + finalSize);
        ctx.arcTo(finalX, finalY + finalSize, finalX, finalY + finalSize - radius, radius);
        ctx.lineTo(finalX, finalY + radius);
        ctx.arcTo(finalX, finalY, finalX + radius, finalY, radius);
        ctx.closePath();

        // 5. Build Shadow and White Background
        // Match the high-end UI "shadow-sm" look
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = actualPixelRatio * 3;
        ctx.shadowOffsetY = actualPixelRatio * 1.5;

        ctx.fillStyle = '#ffffff';
        ctx.fill(); // Draw the rounded white box with shadow

        // 6. Draw the actual logo inside the path
        ctx.save();
        ctx.clip();
        // Reset shadow so it doesn't apply to the image content
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(logoImg, finalX, finalY, finalSize, finalSize);
        ctx.restore();

        ctx.restore();

        // Return high-quality PNG
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      logoImg.onerror = (e) => reject(new Error('Logo image failed to load: ' + e));
    };
    mainImg.onerror = (e) => reject(new Error('Main image failed to load: ' + e));
  });
};
