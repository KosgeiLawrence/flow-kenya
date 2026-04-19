/**
 * Image optimization helpers.
 *
 * Supabase Storage supports on-the-fly image transformation via URL params
 * on the `/render/image/public/` endpoint. We rewrite `/object/public/` URLs
 * to use the renderer + width/quality so browsers download a smaller, faster
 * thumbnail instead of the original full-resolution photo.
 *
 * Falls back to the original URL for non-Supabase URLs.
 */

type Resize = "cover" | "contain" | "fill";

interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number; // 20 - 100
  resize?: Resize;
}

const SUPABASE_OBJECT_PATH = "/storage/v1/object/public/";
const SUPABASE_RENDER_PATH = "/storage/v1/render/image/public/";

export function optimizedImageUrl(url: string | null | undefined, opts: OptimizeOptions = {}): string {
  if (!url) return "";
  // Only transform Supabase public storage URLs.
  if (!url.includes(SUPABASE_OBJECT_PATH)) return url;

  const { width = 600, height, quality = 70, resize = "cover" } = opts;
  const rendered = url.replace(SUPABASE_OBJECT_PATH, SUPABASE_RENDER_PATH);

  const params = new URLSearchParams();
  params.set("width", String(width));
  if (height) params.set("height", String(height));
  params.set("quality", String(quality));
  params.set("resize", resize);

  return `${rendered}?${params.toString()}`;
}

/** Common image presets used across the platform. */
export const imagePresets = {
  thumb: { width: 200, quality: 60 },
  card: { width: 600, quality: 70 },
  detail: { width: 1200, quality: 80 },
  avatar: { width: 96, quality: 70 },
} as const;
