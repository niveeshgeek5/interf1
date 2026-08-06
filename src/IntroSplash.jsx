import React, { useEffect, useRef, useState } from 'react';

export default function IntroSplash() {
  const [visible, setVisible] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return undefined;
    const ctx = canvas.getContext('2d');
    let width, height, nodes;

    const resize = () => {
      width = canvas.width = window.innerWidth * devicePixelRatio;
      height = canvas.height = window.innerHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    const NODE_COUNT = 46;
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2.8,
      vy: (Math.random() - 0.5) * 2.8,
    }));

    const cx = () => width / 2;
    const cy = () => height / 2;
    const LINK_DIST = 190 * devicePixelRatio;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.x += (cx() - n.x) * 0.006;
        n.y += (cy() - n.y) * 0.006;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DIST) {
            ctx.strokeStyle = `rgba(239,68,68,${0.22 * (1 - d / LINK_DIST)})`;
            ctx.lineWidth = 1 * devicePixelRatio;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = 'rgba(239,68,68,0.85)';
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6 * devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible]);

  useEffect(() => {
    if (!hasStarted) return undefined;
    const timer = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timer);
  }, [hasStarted]);

  const beginExperience = () => {
    const audio = audioRef.current;
    setHasStarted(true);
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 0.85;
    audio.play().catch(() => {});
  };

  if (!visible) return null;

  return (
    <>
      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}technovanza-intro-audio.mpeg`} preload="auto" />
      <div
        className={`intro-splash${hasStarted ? ' intro-splash--playing' : ' intro-splash--welcome'}`}
        aria-label="Technovanza opening animation"
      >
        <canvas ref={canvasRef} className="intro-web-canvas" />

        {!hasStarted ? (
          <div className="intro-welcome-stage">
            <p className="intro-welcome-kicker mono">AAMEC CSE SYMPOSIUM</p>
            <h1 className="glitch-tet" data-text="TECHNOVANZA 2026">
              <span>TECHNO</span>VANZA 2026
            </h1>
            <p className="intro-welcome-copy">Where Innovation Meets Intelligence.</p>
            <button className="intro-enter-button" type="button" onClick={beginExperience}>
              Launch Technovanza
            </button>
          </div>
        ) : (
          <>
            <div className="intro-scanline" />
            <div className="intro-mark">T</div>
            <div className="intro-title-text">
              <span>TECHNO</span>VANZA
            </div>
          </>
        )}
      </div>
    </>
  );
}
