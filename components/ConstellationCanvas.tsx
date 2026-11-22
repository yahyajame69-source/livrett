"use client";

import { useEffect, useRef } from "react";

interface ConstellationCanvasProps {
  variant: "header" | "hero";
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  tier: 0 | 1 | 2;
  color: string;
  glowColor: string;
  twinklePhase: number;
  twinkleSpeed: number;
  isStarFlare: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
}

interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

const GOLD_PALETTE = [
  { color: "#f8e2a3", glow: "rgba(230, 184, 92, 0.85)" },
  { color: "#e6b85c", glow: "rgba(230, 184, 92, 0.9)" },
  { color: "#fff6dc", glow: "rgba(255, 244, 214, 0.75)" },
  { color: "#9fd0ff", glow: "rgba(119, 182, 233, 0.75)" },
];

export default function ConstellationCanvas({ variant }: ConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isHero = variant === "hero";
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrameId = 0;

    const pointer = {
      x: -9999,
      y: -9999,
      active: false,
      lastTrailX: -9999,
      lastTrailY: -9999,
    };

    const particles: Particle[] = [];
    const sparks: Spark[] = [];
    const shootingStars: ShootingStar[] = [];
    const pulseWaves: PulseWave[] = [];

    let nextShootingStarAt = performance.now() + (isHero ? 1200 : 2800);

    const createParticle = (w: number, h: number): Particle => {
      const roll = Math.random();
      const tier: 0 | 1 | 2 = roll < 0.45 ? 0 : roll < 0.85 ? 1 : 2;
      const palette =
        tier === 0
          ? GOLD_PALETTE[2]
          : GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)];
      const speedScale = isHero ? (tier === 0 ? 0.18 : tier === 1 ? 0.34 : 0.48) : 0.24;
      const angle = Math.random() * Math.PI * 2;
      const baseRadius =
        tier === 0
          ? 0.8 + Math.random() * 0.9
          : tier === 1
          ? 1.5 + Math.random() * 1.4
          : 2.3 + Math.random() * 1.6;

      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(angle) * speedScale,
        vy: Math.sin(angle) * speedScale,
        baseRadius,
        radius: baseRadius,
        tier,
        color: palette.color,
        glowColor: palette.glow,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        isStarFlare: tier === 2 && Math.random() < 0.55,
      };
    };

    const initParticles = (w: number, h: number) => {
      particles.length = 0;
      const area = w * h;
      const targetCount = isHero
        ? Math.max(55, Math.min(130, Math.round(area / 7500)))
        : Math.max(26, Math.min(58, Math.round(area / 2800)));

      for (let i = 0; i < targetCount; i++) {
        particles.push(createParticle(w, h));
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initParticles(width, height);
    };

    const spawnBurst = (bx: number, by: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const speed = 1.1 + Math.random() * 2.8;
        const p = GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)];
        sparks.push({
          x: bx,
          y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 28 + Math.random() * 24,
          size: 1.4 + Math.random() * 2.1,
          color: p.color,
        });
      }
      pulseWaves.push({
        x: bx,
        y: by,
        radius: 4,
        maxRadius: isHero ? 120 : 70,
        alpha: 0.45,
      });
    };

    const spawnTrailSpark = (tx: number, ty: number) => {
      const p = GOLD_PALETTE[Math.floor(Math.random() * 2)];
      sparks.push({
        x: tx + (Math.random() - 0.5) * 8,
        y: ty + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65 - 0.15,
        life: 1,
        maxLife: 20 + Math.random() * 16,
        size: 1 + Math.random() * 1.6,
        color: p.color,
      });
    };

    const spawnShootingStar = () => {
      if (width < 120) return;
      const startX = Math.random() * width * 0.85;
      const startY = Math.random() * height * 0.45;
      const speed = isHero ? 7.5 + Math.random() * 4 : 5.5 + Math.random() * 3;
      const angle = 0.35 + Math.random() * 0.35;
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: isHero ? 85 + Math.random() * 55 : 48 + Math.random() * 30,
        life: 0,
        maxLife: isHero ? 42 : 28,
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const margin = 50;

      if (x >= -margin && x <= rect.width + margin && y >= -margin && y <= rect.height + margin) {
        pointer.x = x;
        pointer.y = y;
        pointer.active = true;

        const dx = x - pointer.lastTrailX;
        const dy = y - pointer.lastTrailY;
        if (dx * dx + dy * dy > 160 && sparks.length < 90) {
          spawnTrailSpark(x, y);
          pointer.lastTrailX = x;
          pointer.lastTrailY = y;
        }
      } else {
        pointer.active = false;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        pointer.x = x;
        pointer.y = y;
        pointer.active = true;
        if (!prefersReducedMotion) {
          spawnBurst(x, y, isHero ? 16 : 8);
        }
      }
    };

    const drawStarFlare = (x: number, y: number, r: number, alpha: number, color: string) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.9;
      const arm = r * 2.9;
      ctx.beginPath();
      ctx.moveTo(x - arm, y);
      ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm);
      ctx.lineTo(x, y + arm);
      ctx.stroke();
      ctx.restore();
    };

    const renderFrame = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      // Subtle living nebula clouds
      const t = now * 0.00045;
      const orb1X = width * (isHero ? 0.72 + Math.sin(t) * 0.06 : 0.78 + Math.sin(t) * 0.08);
      const orb1Y = height * (isHero ? 0.38 + Math.cos(t * 0.8) * 0.08 : 0.5);
      const grad1 = ctx.createRadialGradient(
        orb1X,
        orb1Y,
        0,
        orb1X,
        orb1Y,
        isHero ? Math.max(width, height) * 0.45 : width * 0.35
      );
      grad1.addColorStop(0, "rgba(230, 184, 92, 0.14)");
      grad1.addColorStop(0.45, "rgba(84, 134, 196, 0.09)");
      grad1.addColorStop(1, "rgba(16, 27, 51, 0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      if (pointer.active) {
        const cursorGlow = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          isHero ? 210 : 140
        );
        cursorGlow.addColorStop(0, "rgba(230, 184, 92, 0.16)");
        cursorGlow.addColorStop(0.5, "rgba(119, 182, 233, 0.07)");
        cursorGlow.addColorStop(1, "rgba(16, 27, 51, 0)");
        ctx.fillStyle = cursorGlow;
        ctx.fillRect(0, 0, width, height);
      }

      const linkDist = isHero ? 132 : 105;
      const linkDistSq = linkDist * linkDist;
      const cursorDist = isHero ? 195 : 145;
      const cursorDistSq = cursorDist * cursorDist;

      // Update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!prefersReducedMotion) {
          p.twinklePhase += p.twinkleSpeed;

          if (pointer.active) {
            const dx = pointer.x - p.x;
            const dy = pointer.y - p.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < cursorDistSq && distSq > 1) {
              const dist = Math.sqrt(distSq);
              const force = (1 - dist / cursorDist) * (p.tier === 0 ? 0.025 : 0.065);
              if (dist > 46) {
                // Gentle magnetic attraction + orbital swirl
                p.vx += (dx / dist) * force - (dy / dist) * force * 0.45;
                p.vy += (dy / dist) * force + (dx / dist) * force * 0.45;
              } else {
                // Soft inner cushion so stars dance around cursor
                p.vx -= (dx / dist) * force * 1.1;
                p.vy -= (dy / dist) * force * 1.1;
              }
            }
          }

          // Damping back to smooth drift speed
          const maxSpeed = isHero ? 1.55 : 1.1;
          const speedSq = p.vx * p.vx + p.vy * p.vy;
          if (speedSq > maxSpeed * maxSpeed) {
            const s = Math.sqrt(speedSq);
            p.vx = (p.vx / s) * maxSpeed;
            p.vy = (p.vy / s) * maxSpeed;
          } else {
            p.vx *= 0.992;
            p.vy *= 0.992;
            if (speedSq < 0.04) {
              p.vx += (Math.random() - 0.5) * 0.04;
              p.vy += (Math.random() - 0.5) * 0.04;
            }
          }

          p.x += p.vx;
          p.y += p.vy;

          if (p.x < -12) p.x = width + 12;
          if (p.x > width + 12) p.x = -12;
          if (p.y < -12) p.y = height + 12;
          if (p.y > height + 12) p.y = -12;
        }
      }

      // Draw constellation connections between nearby nodes
      ctx.lineWidth = 0.85;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (a.tier === 0) continue;

        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if (b.tier === 0) continue;

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < linkDistSq) {
            const dist = Math.sqrt(distSq);
            let alpha = (1 - dist / linkDist) * (isHero ? 0.34 : 0.28);

            // Boost lines illuminated near cursor
            if (pointer.active) {
              const mx = (a.x + b.x) * 0.5 - pointer.x;
              const my = (a.y + b.y) * 0.5 - pointer.y;
              const mDistSq = mx * mx + my * my;
              if (mDistSq < cursorDistSq) {
                const boost = 1 - Math.sqrt(mDistSq) / cursorDist;
                alpha += boost * 0.45;
              }
            }

            ctx.strokeStyle = `rgba(230, 184, 92, ${Math.min(0.82, alpha)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw magnetic lines from cursor to nearby stars
      if (pointer.active) {
        ctx.lineWidth = 1.05;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < cursorDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / cursorDist) * (p.tier === 0 ? 0.24 : 0.62);
            ctx.strokeStyle =
              p.tier === 2
                ? `rgba(248, 226, 163, ${alpha})`
                : `rgba(159, 208, 255, ${alpha * 0.85})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles & star flares
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const twinkle = 0.65 + 0.35 * Math.sin(p.twinklePhase);
        let boost = 0;

        if (pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < cursorDistSq) {
            boost = 1 - Math.sqrt(distSq) / cursorDist;
          }
        }

        const r = p.baseRadius * (0.85 + twinkle * 0.25 + boost * 0.55);
        const alpha = Math.min(1, (p.tier === 0 ? 0.48 : 0.8) * twinkle + boost * 0.35);

        ctx.save();
        ctx.globalAlpha = alpha;
        if (p.tier > 0) {
          ctx.shadowBlur = 8 + boost * 10;
          ctx.shadowColor = p.glowColor;
        }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.isStarFlare && (twinkle > 0.78 || boost > 0.3)) {
          drawStarFlare(p.x, p.y, r, alpha * 0.75, p.color);
        }
      }

      // Shooting stars
      if (!prefersReducedMotion && now >= nextShootingStarAt) {
        spawnShootingStar();
        nextShootingStarAt = now + (isHero ? 2000 + Math.random() * 2400 : 3800 + Math.random() * 3500);
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life += 1;

        const progress = s.life / s.maxLife;
        const alpha = progress < 0.2 ? progress / 0.2 : Math.max(0, 1 - (progress - 0.2) / 0.8);
        const tailNorm = Math.hypot(s.vx, s.vy) || 1;
        const tx = s.x - (s.vx / tailNorm) * s.length;
        const ty = s.y - (s.vy / tailNorm) * s.length;

        const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
        grad.addColorStop(0, `rgba(255, 248, 224, ${alpha})`);
        grad.addColorStop(0.35, `rgba(230, 184, 92, ${alpha * 0.65})`);
        grad.addColorStop(1, "rgba(230, 184, 92, 0)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = isHero ? 2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 252, 235, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, isHero ? 2.1 : 1.5, 0, Math.PI * 2);
        ctx.fill();

        if (s.life >= s.maxLife) {
          shootingStars.splice(i, 1);
        }
      }

      // Cursor trail & click burst sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.96;
        sp.vy *= 0.96;
        sp.life += 1;

        const alpha = Math.max(0, 1 - sp.life / sp.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(230, 184, 92, 0.9)";
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (sp.life >= sp.maxLife) {
          sparks.splice(i, 1);
        }
      }

      // Pulse waves on click
      for (let i = pulseWaves.length - 1; i >= 0; i--) {
        const wv = pulseWaves[i];
        wv.radius += (wv.maxRadius - wv.radius) * 0.12;
        wv.alpha *= 0.91;

        ctx.strokeStyle = `rgba(230, 184, 92, ${wv.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(wv.x, wv.y, wv.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (wv.alpha < 0.02) {
          pulseWaves.splice(i, 1);
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
      }
    };

    resize();

    const parent = canvas.parentElement;
    const resizeObserver = parent ? new ResizeObserver(() => resize()) : null;
    if (parent && resizeObserver) {
      resizeObserver.observe(parent);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    animationFrameId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [variant]);

  return <canvas ref={canvasRef} className="constellationCanvas" aria-hidden="true" />;
}
