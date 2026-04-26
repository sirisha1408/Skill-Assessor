import React from 'react';

const LOGO_SVG = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="hg" x1="0" y1="0" x2="32" y2="32">
        <stop offset="0%" stopColor="#3b82f6"/>
        <stop offset="100%" stopColor="#06b6d4"/>
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="14" stroke="url(#hg)" strokeWidth="2.5" fill="none"/>
    <path d="M10 16 L14 20 L22 12" stroke="url(#hg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

export default function Header() {
  return (
    <header style={{
      padding: '20px 0',
      borderBottom: '1px solid var(--border-glass)',
      background: 'rgba(6,9,15,0.8)',
      backdropFilter: 'blur(20px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {LOGO_SVG}
          <h1 style={{
            fontSize: '1.4rem', fontWeight: 700,
            background: 'var(--gradient-hero)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            SkillSync
          </h1>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          AI-Powered Skill Assessment
        </span>
      </div>
    </header>
  );
}
