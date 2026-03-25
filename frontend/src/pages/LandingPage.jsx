import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Serif+Display:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black: #0a0a0a;
    --white: #f5f0e8;
    --accent: #6B5BFF;
    --mid: #1a1a1a;
    --border: #2a2a2a;
    --mono: 'Space Mono', monospace;
    --serif: 'DM Serif Display', serif;
  }

  body {
    background: var(--black);
    color: var(--white);
    font-family: var(--mono);
    overflow-x: hidden;
  }

  /* NAV */
  nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 48px;
    border-bottom: 1px solid var(--border);
    background: rgba(10,10,10,0.9);
    backdrop-filter: blur(4px);
  }
  .nav-logo {
    font-size: 13px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    opacity: 0.5;
  }
  .nav-cta {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--black);
    background: var(--white);
    border: none;
    padding: 10px 22px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .nav-cta:hover { background: var(--accent); color: var(--white); }

  /* HERO */
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0 48px 80px;
    border-bottom: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .hero-counter {
    position: absolute;
    top: 120px; right: 48px;
    font-size: 11px;
    letter-spacing: 0.2em;
    opacity: 0.3;
    text-transform: uppercase;
  }
  .hero-index {
    position: absolute;
    top: 120px; left: 48px;
    font-size: 11px;
    letter-spacing: 0.15em;
    opacity: 0.3;
    text-transform: uppercase;
  }
  .hero-grid-line {
    position: absolute;
    top: 0; bottom: 0;
    width: 1px;
    background: var(--border);
    opacity: 0.4;
  }
  .hero-title {
    font-family: var(--serif);
    font-size: clamp(56px, 9vw, 130px);
    line-height: 0.95;
    letter-spacing: -0.02em;
    max-width: 900px;
    position: relative;
    z-index: 2;
  }
  .hero-title em {
    font-style: italic;
    color: var(--accent);
  }
  .hero-sub {
    margin-top: 40px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 40px;
    position: relative;
    z-index: 2;
  }
  .hero-desc {
    font-size: 13px;
    line-height: 1.8;
    opacity: 0.55;
    max-width: 380px;
  }
  .hero-actions {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
  }
  .btn-primary {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--black);
    background: var(--white);
    border: none;
    padding: 14px 28px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .btn-primary:hover { background: var(--accent); color: var(--white); }
  .btn-ghost {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--white);
    background: transparent;
    border: 1px solid var(--border);
    padding: 14px 28px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-ghost:hover { border-color: var(--white); }

  /* TICKER */
  .ticker {
    border-bottom: 1px solid var(--border);
    padding: 14px 0;
    overflow: hidden;
    white-space: nowrap;
  }
  .ticker-inner {
    display: inline-flex;
    animation: ticker 20s linear infinite;
    gap: 0;
  }
  .ticker-item {
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    opacity: 0.3;
    padding: 0 40px;
  }
  .ticker-sep {
    opacity: 0.15;
    padding: 0 0px;
  }
  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  /* FEATURES */
  .features {
    border-bottom: 1px solid var(--border);
  }
  .section-label {
    padding: 20px 48px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .section-label span {
    font-size: 11px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    opacity: 0.35;
  }
  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
  .feature-card {
    padding: 48px;
    border-right: 1px solid var(--border);
    position: relative;
    transition: background 0.2s;
  }
  .feature-card:last-child { border-right: none; }
  .feature-card:hover { background: var(--mid); }
  .feature-num {
    font-size: 11px;
    letter-spacing: 0.2em;
    opacity: 0.25;
    margin-bottom: 32px;
  }
  .feature-icon {
    font-size: 28px;
    margin-bottom: 20px;
    display: block;
  }
  .feature-title {
    font-family: var(--serif);
    font-size: 22px;
    margin-bottom: 14px;
    line-height: 1.2;
  }
  .feature-desc {
    font-size: 12px;
    line-height: 1.9;
    opacity: 0.45;
  }

  /* HOW IT WORKS */
  .how {
    border-bottom: 1px solid var(--border);
  }
  .how-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .how-left {
    padding: 80px 48px;
    border-right: 1px solid var(--border);
  }
  .how-heading {
    font-family: var(--serif);
    font-size: clamp(36px, 4vw, 58px);
    line-height: 1.1;
    margin-bottom: 32px;
  }
  .how-heading em { font-style: italic; color: var(--accent); }
  .how-body {
    font-size: 12px;
    line-height: 2;
    opacity: 0.45;
    max-width: 360px;
  }
  .how-right {
    padding: 80px 48px;
  }
  .step {
    display: flex;
    gap: 24px;
    padding: 32px 0;
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  .step:last-child { border-bottom: none; }
  .step-num {
    font-size: 11px;
    letter-spacing: 0.2em;
    opacity: 0.25;
    flex-shrink: 0;
    padding-top: 3px;
    width: 32px;
  }
  .step-content {}
  .step-title {
    font-family: var(--serif);
    font-size: 20px;
    margin-bottom: 8px;
  }
  .step-desc {
    font-size: 12px;
    line-height: 1.9;
    opacity: 0.4;
  }
  .step-tag {
    display: inline-block;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    border: 1px solid var(--border);
    padding: 4px 10px;
    margin-top: 12px;
    opacity: 0.5;
  }

  /* CTA */
  .cta-section {
    padding: 120px 48px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 40px;
    border-bottom: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .cta-bg {
    position: absolute;
    top: -40px; right: -40px;
    width: 400px; height: 400px;
    background: var(--accent);
    opacity: 0.04;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
  }
  .cta-label {
    font-size: 11px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    opacity: 0.3;
  }
  .cta-heading {
    font-family: var(--serif);
    font-size: clamp(44px, 6vw, 88px);
    line-height: 0.95;
    letter-spacing: -0.02em;
    max-width: 700px;
  }
  .cta-heading em { font-style: italic; color: var(--accent); }
  .cta-actions { display: flex; gap: 12px; }

  /* FOOTER */
  footer {
    padding: 24px 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-text {
    font-size: 11px;
    letter-spacing: 0.1em;
    opacity: 0.2;
    text-transform: uppercase;
  }

  /* ANIMATIONS */
  .fade-in {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .fade-in.visible {
    opacity: 1;
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    nav { padding: 16px 24px; }
    .hero { padding: 0 24px 60px; }
    .hero-title { font-size: 48px; }
    .hero-sub { flex-direction: column; align-items: flex-start; }
    .features-grid { grid-template-columns: 1fr; }
    .feature-card { border-right: none; border-bottom: 1px solid var(--border); }
    .how-content { grid-template-columns: 1fr; }
    .how-left { border-right: none; border-bottom: 1px solid var(--border); }
    .section-label, .cta-section, .how-left, .how-right, footer { padding-left: 24px; padding-right: 24px; }
  }
`;

const tickerItems = [
  "Agentic RAG", "ChromaDB", "Sentence Transformers", "PDF Ingestion",
  "Intelligent Retrieval", "Knowledge Graphs", "FastAPI Backend",
  "Agentic RAG", "ChromaDB", "Sentence Transformers", "PDF Ingestion",
  "Intelligent Retrieval", "Knowledge Graphs", "FastAPI Backend",
];

const features = [
  {
    num: "01",
    icon: "⬡",
    title: "Vector Embeddings",
    desc: "Documents are chunked and embedded using Sentence Transformers, stored in ChromaDB for millisecond-fast semantic retrieval.",
  },
  {
    num: "02",
    icon: "◈",
    title: "Agentic Pipeline",
    desc: "An autonomous agent decides when to search, re-rank, and synthesize — not just keyword match. Context-aware every step.",
  },
  {
    num: "03",
    icon: "⬟",
    title: "Multi-Source Ingestion",
    desc: "Upload PDFs, paste URLs, or feed raw text. The pipeline handles extraction, chunking, and indexing automatically.",
  },
];

const steps = [
  {
    num: "01",
    title: "Ingest your knowledge",
    desc: "Upload PDFs or URLs. The pipeline extracts, cleans, and chunks your content into semantically meaningful units.",
    tag: "Ingestion Layer",
  },
  {
    num: "02",
    title: "Embed & index",
    desc: "Each chunk is converted into a high-dimensional vector and stored in ChromaDB for lightning-fast retrieval.",
    tag: "Vector Store",
  },
  {
    num: "03",
    title: "Query intelligently",
    desc: "Ask a question. The agent retrieves the top-k relevant chunks, re-ranks them, and synthesizes a grounded answer.",
    tag: "Agent Loop",
  },
];

function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeIn({ children, delay = 0, style: s }) {
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
  return <div ref={ref} className="fade-in" style={s}>{children}</div>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{style}</style>

      {/* NAV */}
      <nav>
        <span className="nav-logo">SKN — v1.0</span>
        <button className="nav-cta" onClick={() => navigate("/login")}>Sign In →</button>
      </nav>

      {/* HERO */}
      <section className="hero">
        {[25, 50, 75].map(p => (
          <div key={p} className="hero-grid-line" style={{ left: `${p}%` }} />
        ))}
        <span className="hero-index">001 / HERO</span>
        <span className="hero-counter">{time} IST</span>

        <FadeIn>
          <h1 className="hero-title">
            Smart<br /><em>Knowledge</em><br />Navigator
          </h1>
        </FadeIn>

        <FadeIn delay={120}>
          <div className="hero-sub">
            <p className="hero-desc">
              An agentic RAG system that understands your documents,<br />
              reasons over them, and delivers precise answers — not just results.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => navigate("/login")}>Get Started →</button>
              <button className="btn-ghost" onClick={() => document.getElementById('how').scrollIntoView({ behavior: 'smooth' })}>See How</button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* TICKER */}
      <div className="ticker">
        <div className="ticker-inner">
          {tickerItems.map((item, i) => (
            <span key={i} className="ticker-item">
              {item} <span className="ticker-sep">×</span>
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="features">
        <div className="section-label">
          <span>002 / Capabilities</span>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <FadeIn key={i} delay={i * 100}>
              <div className="feature-card">
                <div className="feature-num">{f.num}</div>
                <span className="feature-icon">{f.icon}</span>
                <div className="feature-title">{f.title}</div>
                <p className="feature-desc">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="section-label">
          <span>003 / How It Works</span>
        </div>
        <div className="how-content">
          <FadeIn>
            <div className="how-left">
              <h2 className="how-heading">
                From document<br />to <em>answer</em>.
              </h2>
              <p className="how-body">
                Three stages. Zero hallucination hunting.<br /><br />
                The system ingests your content, embeds it into a vector space,
                then an autonomous agent retrieves and reasons over the most
                relevant chunks to construct a grounded, citable response.
              </p>
            </div>
          </FadeIn>
          <div className="how-right">
            {steps.map((s, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="step">
                  <span className="step-num">{s.num}</span>
                  <div className="step-content">
                    <div className="step-title">{s.title}</div>
                    <p className="step-desc">{s.desc}</p>
                    <span className="step-tag">{s.tag}</span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-bg" />
        <FadeIn>
          <span className="cta-label">004 / Start Now</span>
        </FadeIn>
        <FadeIn delay={80}>
          <h2 className="cta-heading">
            Your docs.<br /><em>Finally</em><br />answerable.
          </h2>
        </FadeIn>
        <FadeIn delay={160}>
          <div className="cta-actions">
            <button className="btn-primary" onClick={() => navigate("/login")}>Launch the Navigator →</button>
            <button className="btn-ghost" onClick={() => navigate("/login")}>Create Account</button>
          </div>
        </FadeIn>
      </section>

      {/* FOOTER */}
      <footer>
        <span className="footer-text">Smart Knowledge Navigator — Hackathon Build 2026</span>
        <span className="footer-text">Built with FastAPI × ChromaDB × React</span>
      </footer>
    </>
  );
}
