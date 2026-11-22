import { useEffect, useRef } from 'react';

/**
 * Ultra-smooth 60fps ambient candlelight & rising golden embers canvas.
 * Dùng sprite pre-render (offscreen canvas) thay vì tạo radialGradient mỗi frame
 * để giảm ~90% tải CPU/GPU khi cuộn trang. Tự tạm dừng khi cuộn khỏi viewport.
 *
 * @param {{ variant?: 'hero' | 'ember', className?: string }} props
 */
export default function CandleAtmosphereCanvas({ variant = 'ember', className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let rafId = null;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let lastFrameTime = 0;
    const pointer = { x: -9999, y: -9999, active: false };

    const isHero = variant === 'hero';
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isHero ? (isMobile ? 14 : 24) : (isMobile ? 20 : 38);

    const palette = isHero
      ? ['217, 119, 6', '180, 83, 9', '140, 74, 50']
      : ['253, 230, 138', '245, 158, 11', '251, 191, 36', '255, 247, 237'];

    // Pre-render sẵn sprite phát sáng 1 lần duy nhất cho từng màu -> drawImage siêu nhanh
    const spriteSize = 32;
    const sprites = palette.map((rgb) => {
      const off = document.createElement('canvas');
      off.width = spriteSize;
      off.height = spriteSize;
      const octx = off.getContext('2d');
      const half = spriteSize / 2;
      const grad = octx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, `rgba(${rgb}, 1)`);
      grad.addColorStop(0.25, `rgba(${rgb}, 0.72)`);
      grad.addColorStop(0.55, `rgba(${rgb}, 0.22)`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      octx.fillStyle = grad;
      octx.fillRect(0, 0, spriteSize, spriteSize);
      return off;
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const makeParticle = (randomY = true) => ({
      x: Math.random() * width,
      y: randomY ? Math.random() * height : height + 12 + Math.random() * 36,
      size: isHero ? Math.random() * 14 + 8 : Math.random() * 18 + 9,
      vy: -(Math.random() * 0.4 + (isHero ? 0.16 : 0.26)),
      vx: (Math.random() - 0.5) * 0.18,
      swayAmp: Math.random() * 0.32 + 0.1,
      swayFreq: Math.random() * 0.012 + 0.005,
      phase: Math.random() * Math.PI * 2,
      baseAlpha: isHero ? Math.random() * 0.32 + 0.12 : Math.random() * 0.65 + 0.2,
      twinkleSpeed: Math.random() * 0.028 + 0.012,
      sprite: sprites[Math.floor(Math.random() * sprites.length)],
    });

    const particles = Array.from({ length: count }, () => makeParticle(true));
    let tick = 0;

    const handlePointerMove = (e) => {
      if (isMobile) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active =
        pointer.x >= 0 && pointer.x <= rect.width && pointer.y >= 0 && pointer.y <= rect.height;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const parent = canvas.parentElement;
    if (parent && !isMobile) {
      parent.addEventListener('mousemove', handlePointerMove, { passive: true });
      parent.addEventListener('mouseleave', handlePointerLeave, { passive: true });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible && !document.hidden && !rafId) {
          lastFrameTime = 0;
          rafId = requestAnimationFrame(render);
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);

    window.addEventListener('resize', resize, { passive: true });

    const render = (timestamp) => {
      if (!isVisible || document.hidden) {
        rafId = null;
        return;
      }

      const frameScale = lastFrameTime
        ? Math.min(2, Math.max(0.4, (timestamp - lastFrameTime) / 16.667))
        : 1;
      lastFrameTime = timestamp;
      tick += frameScale;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.y += p.vy * frameScale;
        p.x += (p.vx + Math.sin(tick * p.swayFreq + p.phase) * p.swayAmp) * frameScale;

        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 15000 && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / 122) * 0.55;
            p.x += (dx / dist) * force * frameScale;
            p.y += (dy / dist) * force * frameScale;
          }
        }

        if (p.y < -p.size) {
          particles[i] = makeParticle(false);
          continue;
        }
        if (p.x < -p.size) p.x = width + p.size;
        if (p.x > width + p.size) p.x = -p.size;

        const edgeFade = Math.min(1, p.y / 50, (height - p.y) / 50);
        const twinkle = 0.65 + 0.35 * Math.sin(tick * p.twinkleSpeed + p.phase);
        const alpha = Math.max(0, p.baseAlpha * twinkle * edgeFade);
        if (alpha <= 0.01) continue;

        ctx.globalAlpha = alpha;
        const half = p.size * 0.5;
        ctx.drawImage(p.sprite, p.x - half, p.y - half, p.size, p.size);
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(render);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        return;
      }

      if (isVisible && !rafId) {
        lastFrameTime = 0;
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (parent && !isMobile) {
        parent.removeEventListener('mousemove', handlePointerMove);
        parent.removeEventListener('mouseleave', handlePointerLeave);
      }
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
