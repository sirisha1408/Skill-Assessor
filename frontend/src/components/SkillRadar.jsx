import React, { useRef, useEffect } from 'react';

export default function SkillRadar({ assessedSkills }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !assessedSkills?.length) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = 400, H = 400;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const cx = W / 2, cy = H / 2, maxR = 150;
    const n = assessedSkills.length;
    const angleStep = (2 * Math.PI) / n;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Draw rings
    for (let r = 1; r <= 5; r++) {
      const radius = (r / 5) * maxR;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = i * angleStep - Math.PI / 2;
        const x = cx + radius * Math.cos(a);
        const y = cy + radius * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(99,140,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < n; i++) {
      const a = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(a), cy + maxR * Math.sin(a));
      ctx.strokeStyle = 'rgba(99,140,255,0.08)';
      ctx.stroke();
    }

    // Required level polygon (outline)
    ctx.beginPath();
    assessedSkills.forEach((s, i) => {
      const a = i * angleStep - Math.PI / 2;
      const r = (s.required_level / 10) * maxR;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(245,158,11,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Assessed level polygon (filled)
    ctx.beginPath();
    assessedSkills.forEach((s, i) => {
      const a = i * angleStep - Math.PI / 2;
      const r = (s.assessed_level / 10) * maxR;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(59,130,246,0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(59,130,246,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dots + Labels
    assessedSkills.forEach((s, i) => {
      const a = i * angleStep - Math.PI / 2;
      // Assessed dot
      const ar = (s.assessed_level / 10) * maxR;
      ctx.beginPath();
      ctx.arc(cx + ar * Math.cos(a), cy + ar * Math.sin(a), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();

      // Label
      const lr = maxR + 28;
      const lx = cx + lr * Math.cos(a);
      const ly = cy + lr * Math.sin(a);
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#8892a8';
      ctx.textAlign = Math.abs(a + Math.PI/2) < 0.1 ? 'center' : (Math.cos(a) < 0 ? 'right' : 'left');
      ctx.textBaseline = 'middle';
      // Truncate long names
      const label = s.name.length > 14 ? s.name.slice(0, 12) + '..' : s.name;
      ctx.fillText(label, lx, ly);
    });

  }, [assessedSkills]);

  if (!assessedSkills?.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <canvas ref={canvasRef} style={{ maxWidth: '100%' }}/>
      <div style={{ display: 'flex', gap: '24px', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '20px', height: '3px', background: '#3b82f6', borderRadius: '2px' }}/>
          <span style={{ color: 'var(--text-secondary)' }}>Assessed Level</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '20px', height: '3px', background: '#f59e0b', borderRadius: '2px', borderStyle: 'dashed', borderWidth: '1px' }}/>
          <span style={{ color: 'var(--text-secondary)' }}>Required Level</span>
        </div>
      </div>
    </div>
  );
}
