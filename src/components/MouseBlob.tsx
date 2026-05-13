import { useEffect, useRef } from "react";

const MouseBlob = () => {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  useEffect(() => {
    target.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    pos.current = { ...target.current };

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };

    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.08;
      pos.current.y += (target.current.y - pos.current.y) * 0.08;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${pos.current.x - 300}px, ${pos.current.y - 300}px, 0)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 h-[600px] w-[600px] rounded-full will-change-transform"
      style={{
        background:
          "radial-gradient(circle at center, hsl(var(--primary) / 0.28) 0%, hsl(var(--primary) / 0.12) 35%, transparent 70%)",
        filter: "blur(80px)",
        mixBlendMode: "screen",
      }}
    />
  );
};

export default MouseBlob;