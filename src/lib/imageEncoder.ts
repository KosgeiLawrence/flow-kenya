/**
 * Browser-side image re-encoder.
 *
 * Pipeline: original File -> downscaled canvas -> AVIF (preferred) -> WebP (fallback)
 * -> JPEG (last resort, only if neither modern format is supported).
 *
 * This drastically shrinks marketplace and cleanup-report photos before they
 * hit Supabase Storage, so they download faster for everyone afterwards.
 *
 * SVGs and animated GIFs are returned untouched.
 */

const MAX_DIMENSION = 1920; // longest edge after downscale
const AVIF_QUALITY = 0.55;
const WEBP_QUALITY = 0.78;
const JPEG_QUALITY = 0.82;

const encoderCache: Record<string, boolean> = {};

async function canEncode(mime: string): Promise<boolean> {
  if (encoderCache[mime] !== undefined) return encoderCache[mime];
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.5));
    const ok = !!blob && blob.type === mime;
    encoderCache[mime] = ok;
    return ok;
  } catch {
    encoderCache[mime] = false;
    return false;
  }
}

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

function drawScaled(img: HTMLImageElement): HTMLCanvasElement {
  const longest = Math.max(img.width, img.height);
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, mime, quality));
}

/**
 * Re-encode an image File to AVIF (or WebP / JPEG fallback). Returns the
 * original file if the input isn't a re-encodable raster image, or if the
 * conversion would actually produce a larger file.
 */
export async function encodeImageForUpload(file: File): Promise<File> {
  // Skip non-images, SVGs, and GIFs (animation would be lost).
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadBitmap(file);
  } catch {
    return file;
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = drawScaled(img);
  } catch {
    return file;
  }

  const attempts: Array<{ mime: string; quality: number; ext: string }> = [];
  if (await canEncode("image/avif")) attempts.push({ mime: "image/avif", quality: AVIF_QUALITY, ext: "avif" });
  if (await canEncode("image/webp")) attempts.push({ mime: "image/webp", quality: WEBP_QUALITY, ext: "webp" });
  attempts.push({ mime: "image/jpeg", quality: JPEG_QUALITY, ext: "jpg" });

  for (const { mime, quality, ext } of attempts) {
    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob) continue;
    // Only use the new file if it's actually smaller than the original.
    if (blob.size >= file.size) {
      return file;
    }
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.${ext}`, { type: mime, lastModified: Date.now() });
  }

  return file;
}
