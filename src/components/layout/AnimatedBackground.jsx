import React, { useEffect, useRef } from "react";

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animFrame;
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", resize);

    // === GRID ===
    const gridSize = 60;

    // === DATA STREAMS (vertical falling lines of glowing dots) ===
    const streams = Array.from({ length: 18 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      speed: Math.random() * 0.8 + 0.3,
      length: Math.floor(Math.random() * 10 + 6),
      color: Math.random() > 0.5 ? "59,130,246" : "139,92,246",
      alpha: Math.random() * 0.4 + 0.15,
    }));

    // === ENERGY ORBS ===
    const orbs = [
      { bx: w * 0.1,  by: h * 0.15, r: 420, color: "59,130,246",  speed: 0.00035, angle: 0,              ox: 100, oy: 80 },
      { bx: w * 0.85, by: h * 0.70, r: 350, color: "139,92,246",  speed: 0.00055, angle: Math.PI,        ox: 80,  oy: 100 },
      { bx: w * 0.50, by: h * 0.50, r: 260, color: "16,185,129",  speed: 0.0004,  angle: Math.PI / 3,   ox: 60,  oy: 50 },
      { bx: w * 0.75, by: h * 0.10, r: 200, color: "245,158,11",  speed: 0.0006,  angle: Math.PI * 1.5, ox: 50,  oy: 40 },
      { bx: w * 0.20, by: h * 0.80, r: 180, color: "236,72,153",  speed: 0.00045, angle: Math.PI * 0.7, ox: 40,  oy: 35 },
    ];

    // === WAVE RINGS ===
    const rings = Array.from({ length: 3 }, (_, i) => ({
      x: w * (0.2 + i * 0.3),
      y: h * 0.5,
      r: 0,
      maxR: 200 + i * 80,
      speed: 0.6 + i * 0.2,
      alpha: 0,
      color: ["59,130,246", "139,92,246", "16,185,129"][i],
      offset: i * 80,
    }));

    // === NEURAL NODES ===
    const nodes = Array.from({ length: 12 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 1,
      dx: (Math.random() - 0.5) * 0.2,
      dy: (Math.random() - 0.5) * 0.2,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 1;

      // --- Background gradient ---
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, "rgba(4,6,16,1)");
      bgGrad.addColorStop(0.5, "rgba(6,8,20,1)");
      bgGrad.addColorStop(1, "rgba(3,5,14,1)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // --- Grid ---
      ctx.strokeStyle = "rgba(255,255,255,0.022)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // --- Grid intersection sparkles ---
      const sparkleTime = t * 0.02;
      for (let x = gridSize; x < w; x += gridSize) {
        for (let y = gridSize; y < h; y += gridSize) {
          const noise = Math.sin(x * 0.01 + sparkleTime) * Math.cos(y * 0.012 + sparkleTime * 0.7);
          if (noise > 0.8) {
            const a = (noise - 0.8) * 5 * 0.15;
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(147,197,253,${a})`;
            ctx.fill();
          }
        }
      }

      // --- Energy orbs ---
      orbs.forEach((orb) => {
        orb.angle += orb.speed;
        const ox = orb.bx + Math.cos(orb.angle) * orb.ox;
        const oy = orb.by + Math.sin(orb.angle * 1.3) * orb.oy;
        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.r);
        grad.addColorStop(0,    `rgba(${orb.color}, 0.18)`);
        grad.addColorStop(0.25, `rgba(${orb.color}, 0.10)`);
        grad.addColorStop(0.55, `rgba(${orb.color}, 0.04)`);
        grad.addColorStop(0.85, `rgba(${orb.color}, 0.01)`);
        grad.addColorStop(1,    `rgba(${orb.color}, 0)`);
        ctx.beginPath();
        ctx.arc(ox, oy, orb.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // --- Wave rings ---
      rings.forEach((ring) => {
        ring.r += ring.speed;
        ring.alpha = Math.max(0, 0.3 * (1 - ring.r / ring.maxR));
        if (ring.r > ring.maxR) {
          ring.r = 0;
          ring.alpha = 0.3;
          ring.x = w * (Math.random() * 0.6 + 0.2);
          ring.y = h * (Math.random() * 0.6 + 0.2);
        }
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ring.color}, ${ring.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // --- Data streams ---
      streams.forEach((s) => {
        for (let i = 0; i < s.length; i++) {
          const dotY = s.y - i * 14;
          const a = s.alpha * (1 - i / s.length);
          const size = i === 0 ? 2 : 1;
          ctx.beginPath();
          ctx.arc(s.x, dotY, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color}, ${a})`;
          ctx.fill();
        }
        s.y += s.speed;
        if (s.y - s.length * 14 > h) {
          s.y = -20;
          s.x = Math.random() * w;
        }
      });

      // --- Neural nodes with connections ---
      nodes.forEach((n) => {
        n.x += n.dx;
        n.y += n.dy;
        if (n.x < 0 || n.x > w) n.dx *= -1;
        if (n.y < 0 || n.y > h) n.dy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 220) {
            const a = 0.07 * (1 - dist / 220);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99,155,255,${a})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n, i) => {
        const pulse = Math.sin(t * 0.04 + n.pulseOffset) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + pulse * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,155,255,${0.3 + pulse * 0.3})`;
        ctx.fill();

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 4 + pulse * 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99,155,255,${0.05 + pulse * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}