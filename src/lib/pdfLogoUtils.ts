import duaraLogoUrl from "@/assets/duara-flow-logo.png";

/**
 * Load an image as a base64 data URL for jsPDF embedding.
 * Returns null if loading fails.
 */
export const loadImageAsBase64 = (src: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

/** Pre-bundled Duara Flow logo import path */
export const DUARA_LOGO_SRC = duaraLogoUrl;
