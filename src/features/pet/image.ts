/** Turn a chosen image file into a small PNG data URL, resized so it's safe to keep in storage.
 *  The image never leaves the browser. */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function downscaleImage(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error('Please choose an image file (PNG, JPG…).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process the image.'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch {
        reject(new Error('Could not process the image.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read.'));
    };
    img.src = url;
  });
}
