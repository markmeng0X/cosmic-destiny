import { useEffect, useRef } from "react";

export function CosmicBackground({ children }: { children?: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const stars: { x: number; y: number; radius: number; opacity: number; twinkleSpeed: number }[] = [];
    const numStars = 150;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
        ctx.fill();
      });

      time++;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[hsl(260,35%,8%)] via-[hsl(270,30%,12%)] to-[hsl(260,35%,8%)]">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-purple-500/20 blur-[100px]" />
        <div className="absolute right-1/4 top-1/2 h-48 w-48 rounded-full bg-cyan-500/20 blur-[80px]" />
        <div className="absolute bottom-1/4 left-1/2 h-56 w-56 rounded-full bg-amber-500/10 blur-[90px]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
