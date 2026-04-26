import React from 'react';
import SkillRadar from './SkillRadar';

const severityConfig = {
  critical: { color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: '🔴', label: 'Critical' },
  moderate: { color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: '🟡', label: 'Moderate' },
  minor: { color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', icon: '🟢', label: 'Minor' },
};

export default function GapAnalysis({ gapReport, isLoading }) {
  if (isLoading) {
    return (
      <div className="animate-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border-glass)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}/>
        <p style={{ color: 'var(--text-secondary)' }}>Generating gap analysis...</p>
      </div>
    );
  }

  if (!gapReport) return null;

  const { overall_readiness, strengths, gaps, assessed_skills, summary } = gapReport;

  return (
    <div className="animate-in" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px', textAlign: 'center',
        background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>Gap Analysis Report</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>{summary}</p>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, background: overall_readiness >= 70 ? 'linear-gradient(135deg,#10b981,#06b6d4)' : overall_readiness >= 40 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#ef4444,#ec4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{Math.round(overall_readiness)}%</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Job Readiness</div>
        </div>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--accent-green)' }}>{strengths?.length || 0}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Strengths</div>
        </div>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{gaps?.length || 0}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Gaps Found</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Radar */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>Skill Profile</h3>
          <SkillRadar assessedSkills={assessed_skills}/>
        </div>

        {/* Strengths */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>✅ Strengths</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {strengths?.map((s, i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '0.9rem', color: 'var(--accent-green)' }}>
                {s}
              </div>
            ))}
            {(!strengths || strengths.length === 0) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No strong matches found</p>
            )}
          </div>
        </div>
      </div>

      {/* Gaps */}
      {gaps && gaps.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Skill Gaps</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {gaps.map((gap, i) => {
              const cfg = severityConfig[gap.severity] || severityConfig.moderate;
              return (
                <div key={i} className="glass-card" style={{
                  padding: '20px', background: cfg.bg, borderColor: cfg.border,
                  animation: `fadeIn 0.4s ${i * 0.1}s ease-out both`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{gap.skill_name}</h4>
                    <span className={`badge badge-${gap.severity}`}>{cfg.icon} {cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Required: </span>
                      <span style={{ fontWeight: 600 }}>{gap.required_level}/10</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Current: </span>
                      <span style={{ fontWeight: 600, color: cfg.color }}>{gap.assessed_level}/10</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Gap: </span>
                      <span style={{ fontWeight: 700, color: cfg.color }}>-{gap.gap_delta}</span>
                    </div>
                  </div>
                  {/* Level bar */}
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(0,0,0,0.3)', marginBottom: '12px', position: 'relative' }}>
                    <div style={{ position: 'absolute', height: '100%', borderRadius: '3px', background: cfg.color, width: `${(gap.assessed_level / gap.required_level) * 100}%`, transition: 'width 0.5s' }}/>
                  </div>
                  {gap.adjacent_skills?.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Adjacent skills: </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {gap.adjacent_skills.map((s, j) => (
                          <span key={j} className="badge badge-blue">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
