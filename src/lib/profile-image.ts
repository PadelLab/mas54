/**
 * Prepare the profile photo for localStorage: keep high quality
 * and only downscale when the image is very large (high-quality canvas smoothing).
 */
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.98;

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function processAvatarForStorage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return readFileAsDataURL(file);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      img.src = objectUrl;
    });

    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) {
      return readFileAsDataURL(file);
    }

    const maxSide = Math.max(w0, h0);
    const scale = maxSide > MAX_EDGE ? MAX_EDGE / maxSide : 1;

    if (scale === 1) {
      return readFileAsDataURL(file);
    }

    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return readFileAsDataURL(file);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const usePng = file.type === "image/png";
    if (usePng) {
      return canvas.toDataURL("image/png");
    }
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return readFileAsDataURL(file);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
