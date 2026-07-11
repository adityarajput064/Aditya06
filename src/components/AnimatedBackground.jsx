import { useEffect, useRef } from "react";

export const AnimatedBackground = () => {
  const glowRef = useRef(null);

  // Mouse ke peeche glow follow karta hai
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (glowRef.current) {
        glowRef.current.style.setProperty("--mx", `${e.clientX}px`);
        glowRef.current.style.setProperty("--my", `${e.clientY}px`);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Particles ke liye random values ek hi baar generate karo (re-render pe na badlein)
  const particles = useRef(
    [...Array(25)].map(() => ({
      left: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 12 + 10,
      delay: Math.random() * 10,
    }))
  ).current;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Moving gradient blobs */}
      <div className="gradient-blob gradient-blob-1" />
      <div className="gradient-blob gradient-blob-2" />
      <div className="gradient-blob gradient-blob-3" />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Mouse glow */}
      <div ref={glowRef} className="mouse-glow" />
    </div>
  );
};
