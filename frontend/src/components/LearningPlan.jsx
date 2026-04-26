import React, { useState } from 'react';

const diffColors = {
  beginner: { bg: 'rgba(16,185,129,0.12)', color: 'var(--accent-green)', label: 'Beginner' },
  intermediate: { bg: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)', label: 'Intermediate' },
  advanced: { bg: 'rgba(139,92,246,0.12)', color: 'var(--accent-purple)', label: 'Advanced' },
};

const typeIcons = { course: '🎓', tutorial: '📖', documentation: '📚', project: '🛠️', book: '📕' };

function ResourceCard({ resource }) {
  return (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{
      display: 'flex', gap: '12px', padding: '12px', borderRadius: 'var(--radius-sm)',
      background: 'rgba(10,15,30,0.5)', border: '1px solid var(--border-glass)',
      textDecoration: 'none', transition: 'var(--transition)', cursor: 'pointer',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}
    >
      <span style={{ fontSize: '1.3rem' }}>{typeIcons[resource.resource_type] || '📎'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--accent-blue)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resource.title}</div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span>{resource.platform}</span>
          {resource.estimated_hours > 0 && <span>~{resource.estimated_hours}h</span>}
          <span style={{ color: resource.is_free ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
            {resource.is_free ? 'Free' : 'Paid'}
          </span>
        </div>
      </div>
    </a>
  );
}

function LearningItemCard({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const dc = diffColors[item.difficulty] || diffColors.intermediate;

  return (
    <div className="glass-card" style={{
      padding: '20px', cursor: 'pointer',
      animation: `fadeIn 0.4s ${index * 0.08}s ease-out both`,
    }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            {item.is_quick_win && <span title="Quick Win">⚡</span>}
            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{item.skill_name}</h4>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: dc.bg, color: dc.color }}>{dc.label}</span>
            <span className="badge badge-cyan">📅 {item.estimated_weeks}w</span>
            <span className="badge badge-purple">⏱️ {item.estimated_hours}h</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          <span>Lvl {item.current_level}</span>
          <span style={{ color: 'var(--accent-blue)' }}>→</span>
          <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{item.target_level}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(0,0,0,0.3)', marginBottom: expanded ? '16px' : '0' }}>
        <div style={{ height: '100%', borderRadius: '2px', background: 'var(--gradient-primary)', width: `${(item.current_level / item.target_level) * 100}%` }}/>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', animation: 'fadeIn 0.3s ease-out' }}>
          {item.learning_approach && (
            <div style={{ marginBottom: '16px', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              💡 <strong style={{ color: 'var(--text-primary)' }}>Strategy:</strong> {item.learning_approach}
            </div>
          )}

          {item.adjacent_skills_to_leverage?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Build on your:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {item.adjacent_skills_to_leverage.map((s, i) => (
                  <span key={i} className="badge badge-blue">{s}</span>
                ))}
              </div>
            </div>
          )}

          {item.resources?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Resources:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {item.resources.map((r, i) => <ResourceCard key={i} resource={r}/>)}
              </div>
            </div>
          )}

          {item.milestones?.length > 0 && (
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Milestones:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {item.milestones.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <span style={{ color: 'var(--text-secondary)' }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: 'right', marginTop: '8px' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{expanded ? 'Click to collapse ▲' : 'Click for details ▼'}</span>
      </div>
    </div>
  );
}

export default function LearningPlan({ plan, isLoading }) {
  if (isLoading) {
    return (
      <div className="animate-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🗺️</div>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border-glass)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}/>
        <p style={{ color: 'var(--text-secondary)' }}>Creating your personalized learning plan...</p>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="animate-in" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px', textAlign: 'center',
        background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>Your Learning Roadmap</h2>
      {plan.candidate_summary && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '650px', marginLeft: 'auto', marginRight: 'auto', fontSize: '0.95rem' }}>
          {plan.candidate_summary}
        </p>
      )}

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{plan.total_estimated_weeks || '—'}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Weeks Total</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{plan.total_estimated_hours || '—'}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Hours Total</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green)' }}>{plan.quick_wins?.length || 0}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Quick Wins</div>
        </div>
      </div>

      {plan.weekly_schedule_suggestion && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px', background: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.15)' }}>
          <span style={{ fontSize: '0.85rem' }}>📅 <strong>Suggested Schedule:</strong> <span style={{ color: 'var(--text-secondary)' }}>{plan.weekly_schedule_suggestion}</span></span>
        </div>
      )}

      {/* Quick Wins */}
      {plan.quick_wins?.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ Quick Wins <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 400 }}>— achievable in {'<'} 1 week</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {plan.quick_wins.map((item, i) => <LearningItemCard key={i} item={item} index={i}/>)}
          </div>
        </div>
      )}

      {/* Core Learning */}
      {plan.core_learning?.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📚 Core Learning Path
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {plan.core_learning.map((item, i) => <LearningItemCard key={i} item={item} index={i}/>)}
          </div>
        </div>
      )}

      {/* Stretch Goals */}
      {plan.stretch_goals?.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🚀 Stretch Goals
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {plan.stretch_goals.map((item, i) => <LearningItemCard key={i} item={item} index={i}/>)}
          </div>
        </div>
      )}
    </div>
  );
}
