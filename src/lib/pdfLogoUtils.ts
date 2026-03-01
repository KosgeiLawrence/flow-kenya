/**
 * Renders the Duara Flow brand logo (matching the landing page navbar)
 * as a base64 PNG for embedding in jsPDF documents.
 */
export const renderDuaraFlowLogo = (size = 120): Promise<string> => {
  return new Promise((resolve) => {
    const s = size;
    const canvas = document.createElement("canvas");
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext("2d")!;

    // Gold circle background — matches bg-gold (#D4A843)
    const cx = s / 2;
    const cy = s / 2;
    const r = s * 0.42;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#D4A843";
    ctx.fill();

    // Draw recycling arrows icon in forest-deep (#1A3A2A)
    ctx.strokeStyle = "#1A3A2A";
    ctx.fillStyle = "#1A3A2A";
    ctx.lineWidth = s * 0.03;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const iconR = r * 0.52;
    const arrowSize = s * 0.06;

    // Three curved arrows at 120° intervals
    for (let i = 0; i < 3; i++) {
      const angle = (i * 120 - 90) * (Math.PI / 180);
      const nextAngle = ((i * 120 + 120) - 90) * (Math.PI / 180);
      const midAngle = ((i * 120 + 60) - 90) * (Math.PI / 180);

      const x1 = cx + iconR * Math.cos(angle);
      const y1 = cy + iconR * Math.sin(angle);
      const xm = cx + iconR * 0.35 * Math.cos(midAngle);
      const ym = cy + iconR * 0.35 * Math.sin(midAngle);
      const x2 = cx + iconR * Math.cos(nextAngle);
      const y2 = cy + iconR * Math.sin(nextAngle);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(xm, ym, x2, y2);
      ctx.stroke();

      // Arrowhead
      const tipAngle = Math.atan2(y2 - ym, x2 - xm);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - arrowSize * Math.cos(tipAngle - 0.5), y2 - arrowSize * Math.sin(tipAngle - 0.5));
      ctx.lineTo(x2 - arrowSize * Math.cos(tipAngle + 0.5), y2 - arrowSize * Math.sin(tipAngle + 0.5));
      ctx.closePath();
      ctx.fill();
    }

    resolve(canvas.toDataURL("image/png"));
  });
};

/**
 * Load an image URL as a base64 data URL for jsPDF embedding.
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
