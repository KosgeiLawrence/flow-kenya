import { useEffect, useRef, useState } from "react";

const TargetCrosshair = () => {
  const [enabled, setEnabled] = useState(false);
  const hLineRef = useRef<HTMLDivElement>(null);
  const vLineRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const dot = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const raf = useRef<number>();

  useEffect(() => {
    const isTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(hover: none)").matches;
    if (isTouch) return;
    setEnabled(true);

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (hLineRef.current)
        hLineRef.current.style.transform = `translateY(${e.clientY}px)`;
      if (vLineRef.current)
        vLineRef.current.style.transform = `translateX(${e.clientX}px)`;
    };

    const tick = () => {
      // spring-damper toward target
      const stiffness = 0.18;
      const damping = 0.72;
      const ax = (target.current.x - dot.current.x) * stiffness;
      const ay = (target.current.y - dot.current.y) * stiffness;
      dot.current.vx = (dot.current.vx + ax) * damping;
      dot.current.vy = (dot.current.vy + ay) * damping;
      dot.current.x += dot.current.vx;
      dot.current.y += dot.current.vy;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dot.current.x}px, ${dot.current.y}px) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ opacity: 0.3 }}
    >
      <div
        ref={hLineRef}
        className="absolute left-0 top-0 w-screen"
        style={{
          height: 0,
          borderTop: "1px dashed #ffffff",
          willChange: "transform",
        }}
      />
      <div
        ref={vLineRef}
        className="absolute left-0 top-0 h-screen"
        style={{
          width: 0,
          borderLeft: "1px dashed #ffffff",
          willChange: "transform",
        }}
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 rounded-full bg-white"
        style={{ width: 6, height: 6, willChange: "transform" }}
      />
    </div>
  );
};

export default TargetCrosshair;
