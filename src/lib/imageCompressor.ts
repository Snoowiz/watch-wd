export function compressImage(
  dataUrl: string, 
  maxW = 1200, 
  maxH = 800,
  preferredMimeType?: string
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    // Detect format from data URL header (e.g. data:image/png;base64,...)
    const mimeMatch = dataUrl.match(/^data:([^;]+);/);
    const mimeType = (preferredMimeType || (mimeMatch ? mimeMatch[1] : 'image/jpeg')).toLowerCase();

    // Preserve vector SVGs completely intact
    if (mimeType.includes('svg')) {
      resolve(dataUrl);
      return;
    }

    // Preserve animated GIFs
    if (mimeType.includes('gif')) {
      resolve(dataUrl);
      return;
    }

    const isPng = mimeType.includes('png');
    const isWebp = mimeType.includes('webp');

    const img = new Image();
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // If the image is already within bounds, keep the exact original data URL
        // This ensures 100% pixel-perfect transparency, sharpness, and metadata
        if (width <= maxW && height <= maxH) {
          resolve(dataUrl);
          return;
        }

        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        if (height > maxH) {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear canvas with full transparent alpha channel
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Output according to original format to maintain transparency
          if (isPng) {
            // PNG preserves transparent background completely
            const compressed = canvas.toDataURL('image/png');
            resolve(compressed);
          } else if (isWebp) {
            const compressed = canvas.toDataURL('image/webp', 0.90);
            resolve(compressed);
          } else {
            // Standard JPEG for photos
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            resolve(compressed);
          }
        } else {
          resolve(dataUrl);
        }
      } catch (e) {
        console.warn('Failed to compress image in canvas', e);
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}
