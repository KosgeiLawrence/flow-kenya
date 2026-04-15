import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const NeuralBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Create nodes
    const count = Math.min(60, Math.floor((window.innerWidth * window.innerHeight) / 25000));
    nodesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      radius: Math.random() * 2 + 1,
    }));

    const colors = [
      "rgba(100, 180, 255, ",  // blue
      "rgba(140, 120, 255, ",  // purple
      "rgba(80, 200, 200, ",   // teal
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const nodes = nodesRef.current;
      const maxDist = 180;

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.12;
            const colorIdx = (i + j) % colors.length;

            // Curved line via quadratic bezier
            const mx = (nodes[i].x + nodes[j].x) / 2 + (dy * 0.15);
            const my = (nodes[i].y + nodes[j].y) / 2 - (dx * 0.15);

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.quadraticCurveTo(mx, my, nodes[j].x, nodes[j].y);
            ctx.strokeStyle = colors[colorIdx] + opacity + ")";
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw nodes with glow
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const colorIdx = i % colors.length;

        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 6);
        grad.addColorStop(0, colors[colorIdx] + "0.15)");
        grad.addColorStop(1, colors[colorIdx] + "0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = colors[colorIdx] + "0.25)";
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ filter: "blur(1.5px)", opacity: 0.4 }}
      aria-hidden="true"
    />
  );
};

export default NeuralBackground;
