/**
 * Image delivery helpers.
 *
 * For images stored in Supabase Storage, we route URLs through the built-in
 * image transformation CDN (`/render/image/public/...`). The CDN:
 *   - serves WebP automatically to browsers that support it
 *   - downscales to the requested width
 *   - caches aggressively at the edge
 *
 * That gives us "AVIF/WebP for existing images" without re-encoding any files.
 * Non-Supabase URLs are returned unchanged.
 */

const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

interface Options {
  width?: number;
  height?: number;
  quality?: number; // 20 - 100
  resize?: "cover" | "contain" | "fill";
}

export function cdnImage(url: string | null | undefined, opts: Options = {}): string {
  if (!url) return "";
  if (!url.includes(OBJECT_PATH)) return url;

  const { width = 800, height, quality = 75, resize = "cover" } = opts;
  const rendered = url.replace(OBJECT_PATH, RENDER_PATH);
  const params = new URLSearchParams();
  params.set("width", String(width));
  if (height) params.set("height", String(height));
  params.set("quality", String(quality));
  params.set("resize", resize);
  return `${rendered}?${params.toString()}`;
}

export const imagePresets = {
  thumb: { width: 240, quality: 65 },
  card: { width: 600, quality: 72 },
  detail: { width: 1280, quality: 80 },
  avatar: { width: 96, quality: 70 },
  logo: { width: 160, quality: 80 },
} as const;
