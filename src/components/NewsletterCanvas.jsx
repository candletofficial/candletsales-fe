import { useRef, useEffect } from 'react';

export default function NewsletterCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId = null;
    let isVisible = false;
    let width = 0;
    let height = 0;
    let lastFrameTime = 0;

    // Pre-render 2 sprite phát sáng thay vì gọi ctx.shadowBlur 50 lần/frame (gây lag cuộn trang)
    const palette = ['226, 132, 98', '234, 179, 101'];
    const spriteSize = 28;
    const sprites = palette.map((rgb) => {
      const off = document.createElement('canvas');
      off.width = spriteSize;
      off.height = spriteSize;
      const octx = off.getContext('2d');
      const half = spriteSize / 2;
      const grad = octx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, `rgba(${rgb}, 1)`);
      grad.addColorStop(0.35, `rgba(${rgb}, 0.55)`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      octx.fillStyle = grad;
      octx.fillRect(0, 0, spriteSize, spriteSize);
      return off;
    });

    const resize = () => {
      width = Math.max(1, canvas.offsetWidth);
      height = Math.max(1, canvas.offsetHeight);
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize, { passive: true });
    resize();

    const particleCount = 32;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 14 + 8,
      dx: (Math.random() - 0.5) * 0.45,
      dy: (Math.random() - 0.5) * 0.4 - 0.25,
      alpha: Math.random() * 0.4 + 0.12,
      sprite: sprites[Math.random() > 0.5 ? 0 : 1],
    }));

    const render = (timestamp) => {
      if (!isVisible || document.hidden) {
        animationFrameId = null;
        return;
      }

      const frameScale = lastFrameTime
        ? Math.min(2, Math.max(0.4, (timestamp - lastFrameTime) / 16.667))
        : 1;
      lastFrameTime = timestamp;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.x += p.dx * frameScale;
        p.y += p.dy * frameScale;

        if (p.y < -p.size) {
          p.y = height + p.size;
          p.x = Math.random() * width;
        }
        if (p.x < -p.size) p.x = width + p.size;
        if (p.x > width + p.size) p.x = -p.size;

        ctx.globalAlpha = p.alpha;
        const half = p.size * 0.5;
        ctx.drawImage(p.sprite, p.x - half, p.y - half, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(render);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? false;
        if (isVisible && !document.hidden && !animationFrameId) {
          lastFrameTime = 0;
          animationFrameId = requestAnimationFrame(render);
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        return;
      }

      if (isVisible && !animationFrameId) {
        lastFrameTime = 0;
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
    />
  );
}
