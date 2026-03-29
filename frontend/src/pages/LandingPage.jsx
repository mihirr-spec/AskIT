import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black: #080808;
    --off-white: #F0EDE6;
    --cream: #E8E4DC;
    --purple: #5B4FE8;
    --purple-light: #7B72F0;
    --purple-dim: rgba(91,79,232,0.15);
    --muted: rgba(240,237,230,0.45);
    --border: rgba(240,237,230,0.1);
    --mono: 'DM Mono', monospace;
    --serif: 'DM Serif Display', serif;
    --sans: 'Syne', sans-serif;
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--black);
    color: var(--off-white);
    font-family: var(--mono);
    overflow-x: hidden;
    cursor: none;
  }

  /* ── Cursor ─────────────────────────────────── */
  #lp-cursor {
    position: fixed;
    width: 8px; height: 8px;
    background: var(--purple);
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%,-50%);
    transition: width .2s, height .2s, background .2s;
    mix-blend-mode: screen;
  }
  #lp-cursor-ring {
    position: fixed;
    width: 32px; height: 32px;
    border: 1px solid rgba(91,79,232,0.5);
    border-radius: 50%;
    pointer-events: none;
    z-index: 9998;
    transform: translate(-50%,-50%);
    transition: width .25s, height .25s;
  }

  /* ── Nav ─────────────────────────────────────── */
  .lp-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 40px;
    border-bottom: 1px solid var(--border);
    background: rgba(8,8,8,0.85);
    backdrop-filter: blur(12px);
  }
  .lp-nav-logo {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: .1em;
    color: var(--muted);
  }
  .lp-nav-right { display: flex; align-items: center; gap: 24px; }
  .lp-nav-time {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    letter-spacing: .08em;
  }
  .lp-btn-outline {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .12em;
    color: var(--off-white);
    border: 1px solid rgba(240,237,230,0.35);
    padding: 8px 20px;
    background: transparent;
    cursor: none;
    transition: background .2s, border-color .2s;
    text-transform: uppercase;
    text-decoration: none;
  }
  .lp-btn-outline:hover { background: rgba(240,237,230,0.07); border-color: var(--off-white); }
  .lp-btn-solid {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .12em;
    color: var(--black);
    border: 1px solid var(--off-white);
    padding: 8px 20px;
    background: var(--off-white);
    cursor: none;
    transition: background .2s;
    text-transform: uppercase;
    text-decoration: none;
  }
  .lp-btn-solid:hover { background: var(--cream); }

  /* ── Ticker ──────────────────────────────────── */
  .lp-ticker-wrap {
    overflow: hidden;
    border-bottom: 1px solid var(--border);
    background: rgba(91,79,232,0.04);
    margin-top: 64px;
  }
  .lp-ticker {
    display: flex;
    animation: lpTicker 28s linear infinite;
    white-space: nowrap;
  }
  .lp-ticker-item {
    padding: 10px 48px;
    font-size: 10px;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: var(--muted);
    flex-shrink: 0;
  }
  .lp-ticker-dot { color: var(--purple); margin: 0 8px; }
  @keyframes lpTicker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  /* ── Section label ───────────────────────────── */
  .lp-section-label {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: var(--muted);
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 64px;
  }
  .lp-section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* ── Hero ────────────────────────────────────── */
  #lp-hero {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    position: relative;
    overflow: hidden;
  }
  .lp-hero-left {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 60px 48px 72px;
    border-right: 1px solid var(--border);
  }
  .lp-hero-right { position: relative; overflow: hidden; }
  #lp-rag-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .lp-canvas-label {
    position: absolute;
    font-size: 9px;
    letter-spacing: .15em;
    text-transform: uppercase;
    font-family: var(--mono);
    pointer-events: none;
  }

  .lp-hero-pretitle {
    font-size: 10px;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 32px;
  }
  .lp-hero-title {
    font-family: var(--serif);
    font-size: clamp(64px,8vw,96px);
    line-height: .95;
    margin-bottom: 40px;
    color: var(--off-white);
  }
  .lp-hero-title .accent { color: var(--purple); font-style: italic; }
  .lp-hero-desc {
    font-size: 12px;
    line-height: 1.9;
    color: var(--muted);
    max-width: 360px;
    margin-bottom: 56px;
  }
  .lp-hero-cta { display: flex; gap: 12px; align-items: center; }

  /* ── Capabilities ────────────────────────────── */
  #lp-caps { padding: 120px 48px; border-top: 1px solid var(--border); }
  .lp-caps-grid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    border: 1px solid var(--border);
  }
  .lp-cap-item {
    padding: 48px 40px;
    border-right: 1px solid var(--border);
    transition: background .3s;
  }
  .lp-cap-item:last-child { border-right: none; }
  .lp-cap-item:hover { background: rgba(91,79,232,0.04); }
  .lp-cap-num {
    font-size: 10px;
    letter-spacing: .2em;
    color: var(--purple);
    margin-bottom: 32px;
    font-family: var(--mono);
  }
  .lp-cap-icon { width: 36px; height: 36px; margin-bottom: 28px; opacity: .7; }
  .lp-cap-title {
    font-family: var(--serif);
    font-size: 24px;
    margin-bottom: 16px;
    color: var(--off-white);
    line-height: 1.2;
  }
  .lp-cap-desc { font-size: 11px; line-height: 1.9; color: var(--muted); }

  /* ── How It Works ────────────────────────────── */
  #lp-how {
    padding: 120px 48px;
    border-top: 1px solid var(--border);
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .lp-how-left { padding-right: 80px; border-right: 1px solid var(--border); }
  .lp-how-right { padding-left: 80px; }
  .lp-how-big {
    font-family: var(--serif);
    font-size: clamp(40px,5vw,64px);
    line-height: 1.05;
    margin-bottom: 24px;
  }
  .lp-how-big .accent { color: var(--purple); font-style: italic; }
  .lp-how-sub { font-size: 11px; color: var(--muted); line-height: 2; margin-bottom: 40px; }
  .lp-steps { display: flex; flex-direction: column; }
  .lp-step {
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 24px;
    padding: 32px 0;
    border-bottom: 1px solid var(--border);
    align-items: start;
  }
  .lp-step:first-child { padding-top: 0; }
  .lp-step-num { font-size: 10px; color: var(--purple); letter-spacing: .1em; padding-top: 4px; font-family: var(--mono); }
  .lp-step-title { font-family: var(--serif); font-size: 20px; margin-bottom: 10px; color: var(--off-white); }
  .lp-step-desc { font-size: 11px; color: var(--muted); line-height: 1.9; }
  .lp-step-tag {
    display: inline-block;
    margin-top: 14px;
    font-size: 9px;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--purple-light);
    border: 1px solid rgba(91,79,232,0.4);
    padding: 4px 12px;
    font-family: var(--mono);
  }

  /* ── Pipeline ────────────────────────────────── */
  #lp-pipeline { padding: 0 48px 120px; border-top: 1px solid var(--border); }
  .lp-pipeline-wrap {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--border);
    overflow: hidden;
  }
  .lp-pipe-stage {
    flex: 1;
    padding: 40px 32px;
    border-right: 1px solid var(--border);
    transition: background .3s;
  }
  .lp-pipe-stage:last-child { border-right: none; }
  .lp-pipe-stage:hover { background: var(--purple-dim); }
  .lp-pipe-num { font-size: 9px; letter-spacing: .2em; color: var(--purple); margin-bottom: 20px; font-family: var(--mono); }
  .lp-pipe-bar { height: 2px; background: var(--border); margin-bottom: 20px; position: relative; overflow: hidden; }
  .lp-pipe-bar-fill {
    position: absolute;
    left: -100%; top: 0; bottom: 0; width: 100%;
    background: linear-gradient(90deg, transparent, var(--purple), transparent);
    animation: lpBarFlow 3s ease-in-out infinite;
  }
  .lp-pipe-stage:nth-child(2) .lp-pipe-bar-fill { animation-delay: .6s; }
  .lp-pipe-stage:nth-child(3) .lp-pipe-bar-fill { animation-delay: 1.2s; }
  .lp-pipe-stage:nth-child(4) .lp-pipe-bar-fill { animation-delay: 1.8s; }
  .lp-pipe-stage:nth-child(5) .lp-pipe-bar-fill { animation-delay: 2.4s; }
  @keyframes lpBarFlow {
    0%,20%  { left: -100%; }
    60%,80% { left: 100%; }
    100%    { left: -100%; }
  }
  .lp-pipe-title { font-family: var(--serif); font-size: 17px; margin-bottom: 10px; color: var(--off-white); }
  .lp-pipe-desc { font-size: 10px; color: var(--muted); line-height: 1.8; }

  /* ── CTA ─────────────────────────────────────── */
  #lp-cta {
    border-top: 1px solid var(--border);
    padding: 120px 48px;
    position: relative;
    overflow: hidden;
  }
  .lp-cta-bg {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 60% at 30% 50%, rgba(91,79,232,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .lp-cta-inner { position: relative; z-index: 1; }
  .lp-cta-num {
    font-size: 10px;
    letter-spacing: .2em;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: 48px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .lp-cta-num::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .lp-cta-title {
    font-family: var(--serif);
    font-size: clamp(48px,6vw,80px);
    line-height: 1.0;
    margin-bottom: 48px;
  }
  .lp-cta-title .accent { color: var(--purple); font-style: italic; }
  .lp-cta-btns { display: flex; gap: 12px; }

  /* ── Footer ──────────────────────────────────── */
  .lp-footer {
    border-top: 1px solid var(--border);
    padding: 24px 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .lp-footer-logo { font-size: 11px; color: var(--muted); letter-spacing: .1em; }
  .lp-footer-copy { font-size: 10px; color: rgba(240,237,230,0.2); letter-spacing: .05em; }

  /* ── Scroll reveal ───────────────────────────── */
  .lp-reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity .7s ease, transform .7s ease;
  }
  .lp-reveal.visible { opacity: 1; transform: translateY(0); }
  .lp-reveal-d1 { transition-delay: .1s; }
  .lp-reveal-d2 { transition-delay: .2s; }
  .lp-reveal-d3 { transition-delay: .3s; }

  /* ── Responsive ──────────────────────────────── */
  @media (max-width: 900px) {
    #lp-hero { grid-template-columns: 1fr; }
    .lp-hero-right { height: 320px; }
    .lp-hero-left { border-right: none; }
    #lp-how { grid-template-columns: 1fr; }
    .lp-how-left { padding-right: 0; border-right: none; border-bottom: 1px solid var(--border); padding-bottom: 60px; margin-bottom: 60px; }
    .lp-how-right { padding-left: 0; }
    .lp-caps-grid { grid-template-columns: 1fr; }
    .lp-cap-item { border-right: none; border-bottom: 1px solid var(--border); }
    .lp-pipeline-wrap { flex-direction: column; }
    .lp-pipe-stage { border-right: none; border-bottom: 1px solid var(--border); }
    .lp-nav { padding: 16px 24px; }
    #lp-caps, #lp-how, #lp-pipeline, #lp-cta { padding-left: 24px; padding-right: 24px; }
    .lp-footer { padding: 20px 24px; }
  }
`;

const tickerItems = [
  "Intelligent Retrieval", "Knowledge Graphs", "FastAPI Backend", "Agentic RAG",
  "ChromaDB", "Sentence Transformers", "PDF Ingestion", "Vector Embeddings",
  "Intelligent Retrieval", "Knowledge Graphs", "FastAPI Backend", "Agentic RAG",
  "ChromaDB", "Sentence Transformers", "PDF Ingestion", "Vector Embeddings",
];

function FadeIn({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTimeout(() => el.classList.add("visible"), delay); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={`lp-reveal ${className}`}>{children}</div>;
}

function RAGCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width;
    const H = () => canvas.height;
    const PURPLE = "rgba(91,79,232,";
    const WHITE  = "rgba(240,237,230,";

    // Doc nodes (left cluster)
    const docNodes = Array.from({ length: 6 }, () => ({
      x: 0.08 + Math.random() * 0.18,
      y: 0.25 + Math.random() * 0.55,
      r: 3 + Math.random() * 2,
      pulse: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.01,
    }));

    // Vector dots (middle)
    const vecDots = Array.from({ length: 55 }, () => ({
      x: 0.32 + Math.random() * 0.36,
      y: 0.22 + Math.random() * 0.6,
      r: 1 + Math.random() * 2,
      alpha: 0.15 + Math.random() * 0.45,
      highlighted: false,
      phase: Math.random() * Math.PI * 2,
    }));
    [3, 11, 19, 27, 36].forEach(i => { vecDots[i].highlighted = true; vecDots[i].r = 3; });

    // Answer node (right)
    const ansNode = { x: 0.88, y: 0.5, r: 14 };

    // Particles
    const particles = [];
    const spawnParticle = () => {
      const doc = docNodes[Math.floor(Math.random() * docNodes.length)];
      particles.push({
        x: doc.x, y: doc.y,
        phase: 0, progress: 0,
        speed: 0.004 + Math.random() * 0.003,
        targetVec: vecDots[Math.floor(Math.random() * vecDots.length)],
        alpha: 0.8,
        size: 1.5 + Math.random(),
      });
    };
    for (let i = 0; i < 8; i++) setTimeout(spawnParticle, i * 300);
    const spawnInterval = setInterval(spawnParticle, 500);

    const drawGrid = () => {
      ctx.save();
      ctx.strokeStyle = "rgba(91,79,232,0.04)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W(); x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H()); ctx.stroke(); }
      for (let y = 0; y < H(); y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W(), y); ctx.stroke(); }
      ctx.restore();
    };

    const drawDividers = () => {
      ctx.save();
      ctx.strokeStyle = "rgba(240,237,230,0.06)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 6]);
      [0.30, 0.70].forEach(xf => {
        ctx.beginPath(); ctx.moveTo(xf * W(), 0); ctx.lineTo(xf * W(), H()); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    };

    const drawConnections = (t) => {
      ctx.save();
      vecDots.filter(d => d.highlighted).forEach(d => {
        const x1 = d.x * W(), y1 = d.y * H();
        const x2 = ansNode.x * W(), y2 = ansNode.y * H();
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, PURPLE + "0.4)");
        grad.addColorStop(0.5, PURPLE + "0.2)");
        grad.addColorStop(1, PURPLE + "0.0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -t * 0.03;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - 30, x2, y2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    };

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      t++;
      drawGrid();
      drawDividers();

      // Faint doc→vec lines
      ctx.save();
      docNodes.forEach(doc => {
        vecDots.slice(0, 20).forEach((vec, vi) => {
          if (vi % 4 !== 0) return;
          ctx.strokeStyle = PURPLE + "0.04)";
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(doc.x * W(), doc.y * H());
          ctx.lineTo(vec.x * W(), vec.y * H());
          ctx.stroke();
        });
      });
      ctx.restore();

      drawConnections(t);

      // Vec dots
      vecDots.forEach(d => {
        const x = d.x * W(), y = d.y * H();
        const pulse = Math.sin(t * 0.03 + d.phase);
        const a = d.highlighted ? 0.75 + pulse * 0.2 : d.alpha + pulse * 0.05;
        const r = d.highlighted ? d.r + pulse * 0.8 : d.r;
        ctx.save();
        if (d.highlighted) { ctx.shadowColor = "rgba(91,79,232,0.6)"; ctx.shadowBlur = 8; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = d.highlighted ? PURPLE + a + ")" : WHITE + a + ")";
        ctx.fill();
        ctx.restore();
      });

      // Doc nodes
      docNodes.forEach(doc => {
        doc.pulse += doc.speed;
        const x = doc.x * W(), y = doc.y * H();
        const pulse = Math.sin(doc.pulse);
        ctx.save();
        ctx.shadowColor = "rgba(91,79,232,0.3)"; ctx.shadowBlur = 6;
        ctx.strokeStyle = PURPLE + (0.5 + pulse * 0.15) + ")";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(x - 10, y - 13, 20, 26, 2);
        ctx.stroke();
        ctx.strokeStyle = PURPLE + "0.25)"; ctx.lineWidth = 0.5;
        [5, 9, 13, 17].forEach(dy => {
          ctx.beginPath();
          ctx.moveTo(x - 6, y - 13 + dy);
          ctx.lineTo(x + (dy < 14 ? 6 : 3), y - 13 + dy);
          ctx.stroke();
        });
        ctx.restore();
      });

      // Answer node
      const ax = ansNode.x * W(), ay = ansNode.y * H();
      const aPulse = Math.sin(t * 0.04);
      ctx.save();
      ctx.strokeStyle = PURPLE + (0.2 + aPulse * 0.1) + ")"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(ax, ay, ansNode.r + 12 + aPulse * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = PURPLE + (0.3 + aPulse * 0.1) + ")";
      ctx.beginPath(); ctx.arc(ax, ay, ansNode.r + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowColor = "rgba(91,79,232,0.8)"; ctx.shadowBlur = 16;
      ctx.fillStyle = PURPLE + (0.7 + aPulse * 0.15) + ")";
      ctx.beginPath(); ctx.arc(ax, ay, ansNode.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.progress += p.speed;
        let x, y;
        if (p.phase === 0) {
          const tx = p.targetVec.x, ty = p.targetVec.y;
          x = p.x + (tx - p.x) * p.progress;
          y = p.y + (ty - p.y) * p.progress;
          if (p.progress >= 1) { p.phase = 1; p.x = tx; p.y = ty; p.progress = 0; }
        } else {
          x = p.x + (ansNode.x - p.x) * p.progress;
          y = p.y + (ansNode.y - p.y) * p.progress;
          p.alpha = 0.8 * (1 - p.progress * 0.7);
          if (p.progress >= 1) { particles.splice(i, 1); continue; }
        }
        ctx.save();
        ctx.shadowColor = "rgba(91,79,232,0.5)"; ctx.shadowBlur = 4;
        ctx.fillStyle = PURPLE + (p.alpha * (p.phase === 1 ? 0.9 : 0.7)) + ")";
        ctx.beginPath(); ctx.arc(x * W(), y * H(), p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(spawnInterval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="lp-rag-canvas" />;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState("");

  // Clock
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Custom cursor
  useEffect(() => {
    const dot  = document.getElementById("lp-cursor");
    const ring = document.getElementById("lp-cursor-ring");
    if (!dot || !ring) return;
    let rx = 0, ry = 0, cx = 0, cy = 0;
    const onMove = e => { cx = e.clientX; cy = e.clientY; dot.style.left = cx + "px"; dot.style.top = cy + "px"; };
    document.addEventListener("mousemove", onMove);
    let raf;
    const animRing = () => {
      rx += (cx - rx) * 0.12;
      ry += (cy - ry) * 0.12;
      ring.style.left = rx + "px";
      ring.style.top  = ry + "px";
      raf = requestAnimationFrame(animRing);
    };
    animRing();
    return () => { document.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  // Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".lp-reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{style}</style>
      <div id="lp-cursor" />
      <div id="lp-cursor-ring" />

      {/* ── NAV ── */}
      <nav className="lp-nav">
        <span className="lp-nav-logo">SKN — V1.0</span>
        <div className="lp-nav-right">
          <span className="lp-nav-time">{time} IST</span>
          <button className="lp-btn-outline" onClick={() => navigate("/login")}>Sign In →</button>
        </div>
      </nav>

      {/* ── TICKER ── */}
      <div className="lp-ticker-wrap">
        <div className="lp-ticker">
          {tickerItems.map((item, i) => (
            <span key={i} className="lp-ticker-item">
              {item} <span className="lp-ticker-dot">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section id="lp-hero">
        <div className="lp-hero-left">
          <p className="lp-hero-pretitle">001 / HERO</p>
          <h1 className="lp-hero-title">Ask<span className="accent">IT</span></h1>
          <p className="lp-hero-desc">
            An agentic RAG system that understands your documents, reasons over them,
            and delivers precise answers — not just results.
          </p>
          <div className="lp-hero-cta">
            <button className="lp-btn-solid" onClick={() => navigate("/login")}>Get Started →</button>
            <button className="lp-btn-outline"
              onClick={() => document.getElementById("lp-how").scrollIntoView({ behavior: "smooth" })}>
              See How
            </button>
          </div>
        </div>
        <div className="lp-hero-right">
          <RAGCanvas />
          <span className="lp-canvas-label" style={{ top: "18%", left: "8%", color: "rgba(91,79,232,0.7)" }}>Documents</span>
          <span className="lp-canvas-label" style={{ top: "18%", left: "42%", color: "rgba(240,237,230,0.35)" }}>Vector Space</span>
          <span className="lp-canvas-label" style={{ top: "18%", right: "6%", color: "rgba(91,79,232,0.7)" }}>Answer</span>
        </div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section id="lp-caps">
        <div className="lp-section-label">002 / CAPABILITIES</div>
        <div className="lp-caps-grid lp-reveal">
          {[
            {
              num: "01",
              title: "Vector\nEmbeddings",
              desc: "Documents are chunked and embedded using Sentence Transformers, stored in ChromaDB for millisecond-fast semantic retrieval.",
              svg: (
                <svg className="lp-cap-icon" viewBox="0 0 36 36" fill="none">
                  <polygon points="18,2 34,10 34,26 18,34 2,26 2,10" stroke="rgba(91,79,232,0.6)" strokeWidth="1"/>
                  <polygon points="18,8 28,13 28,23 18,28 8,23 8,13" stroke="rgba(91,79,232,0.4)" strokeWidth="1"/>
                  <circle cx="18" cy="18" r="3" fill="rgba(91,79,232,0.5)"/>
                </svg>
              ),
            },
            {
              num: "02",
              title: "Agentic\nPipeline",
              desc: "An autonomous agent decides when to search, re-rank, and synthesize — not just keyword match. Context-aware every step.",
              svg: (
                <svg className="lp-cap-icon" viewBox="0 0 36 36" fill="none">
                  <path d="M6 18 L18 6 L30 18 L18 30 Z" stroke="rgba(91,79,232,0.6)" strokeWidth="1"/>
                  <circle cx="6"  cy="18" r="2" fill="rgba(91,79,232,0.5)"/>
                  <circle cx="18" cy="6"  r="2" fill="rgba(91,79,232,0.5)"/>
                  <circle cx="30" cy="18" r="2" fill="rgba(91,79,232,0.5)"/>
                  <circle cx="18" cy="30" r="2" fill="rgba(91,79,232,0.5)"/>
                  <circle cx="18" cy="18" r="4" stroke="rgba(91,79,232,0.4)" strokeWidth="1"/>
                </svg>
              ),
            },
            {
              num: "03",
              title: "Multi-Source\nIngestion",
              desc: "Upload PDFs, paste URLs, or feed raw text. The pipeline handles extraction, chunking, and indexing automatically.",
              svg: (
                <svg className="lp-cap-icon" viewBox="0 0 36 36" fill="none">
                  <polygon points="18,2 34,14 28,32 8,32 2,14" stroke="rgba(91,79,232,0.6)" strokeWidth="1"/>
                  <line x1="18" y1="2"  x2="18" y2="32" stroke="rgba(91,79,232,0.25)" strokeWidth="0.5"/>
                  <line x1="2"  y1="14" x2="34" y2="14" stroke="rgba(91,79,232,0.25)" strokeWidth="0.5"/>
                  <circle cx="18" cy="18" r="5" stroke="rgba(91,79,232,0.5)" strokeWidth="1"/>
                </svg>
              ),
            },
          ].map((cap, i) => (
            <div key={i} className="lp-cap-item">
              <div className="lp-cap-num">{cap.num}</div>
              {cap.svg}
              <h3 className="lp-cap-title">{cap.title.split("\n").map((l, j) => <span key={j}>{l}{j === 0 && <br/>}</span>)}</h3>
              <p className="lp-cap-desc">{cap.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="lp-how">
        <div className="lp-how-left">
          <div className="lp-section-label">003 / HOW IT WORKS</div>
          <h2 className="lp-how-big">From document<br />to <span className="accent">answer.</span></h2>
          <p className="lp-how-sub">
            Three stages. Zero hallucination hunting.<br /><br />
            The system ingests your content, embeds it into a vector space, then an autonomous
            agent retrieves and reasons over the most relevant chunks to construct a grounded,
            citable response.
          </p>
        </div>
        <div className="lp-how-right">
          <div className="lp-steps">
            {[
              { num: "01", title: "Ingest your knowledge", desc: "Upload PDFs or URLs. The pipeline extracts, cleans, and chunks your content into semantically meaningful units.", tag: "Ingestion Layer" },
              { num: "02", title: "Embed & index",         desc: "Each chunk is converted into a high-dimensional vector and stored in ChromaDB for lightning-fast retrieval.",   tag: "Vector Store"    },
              { num: "03", title: "Query intelligently",   desc: "Ask a question. The agent retrieves the top-k relevant chunks, re-ranks them, and synthesizes a grounded answer.", tag: "Agent Loop"  },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 100} className={`lp-reveal-d${i}`}>
                <div className="lp-step">
                  <span className="lp-step-num">{s.num}</span>
                  <div>
                    <h3 className="lp-step-title">{s.title}</h3>
                    <p className="lp-step-desc">{s.desc}</p>
                    <span className="lp-step-tag">{s.tag}</span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIPELINE ── */}
      <section id="lp-pipeline">
        <div className="lp-section-label" style={{ marginBottom: 48 }}>PIPELINE STAGES</div>
        <div className="lp-pipeline-wrap lp-reveal">
          {[
            { num: "01", title: "Parse",     desc: "PDF, URL, or raw text enters the ingestion layer"          },
            { num: "02", title: "Chunk",     desc: "Semantic splitting preserves context boundaries"           },
            { num: "03", title: "Embed",     desc: "Sentence Transformers encode meaning as vectors"           },
            { num: "04", title: "Retrieve",  desc: "ANN search finds top-k semantically similar chunks"       },
            { num: "05", title: "Synthesize",desc: "Agent reasons and constructs a grounded answer"           },
          ].map((s, i) => (
            <div key={i} className="lp-pipe-stage">
              <div className="lp-pipe-num">{s.num}</div>
              <div className="lp-pipe-bar"><div className="lp-pipe-bar-fill" /></div>
              <h4 className="lp-pipe-title">{s.title}</h4>
              <p className="lp-pipe-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="lp-cta">
        <div className="lp-cta-bg" />
        <div className="lp-cta-inner">
          <div className="lp-cta-num">004 / START NOW</div>
          <h2 className="lp-cta-title">
            Your docs.<br /><span className="accent">Finally</span><br />answerable.
          </h2>
          <div className="lp-cta-btns">
            <button className="lp-btn-solid" onClick={() => navigate("/login")}>Launch the Navigator →</button>
            <button className="lp-btn-outline" onClick={() => navigate("/login")}>Create Account</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <span className="lp-footer-logo">SKN — V1.0 / AskIT</span>
        <span className="lp-footer-copy">© 2025 · Agentic RAG System</span>
      </footer>
    </>
  );
}
