import React from 'react';

const steps = [
  { label: 'Input', icon: '📋' },
  { label: 'Assessment', icon: '💬' },
  { label: 'Analysis', icon: '📊' },
  { label: 'Plan', icon: '🗺️' },
];

export default function ProgressStepper({ currentStep }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '0', padding: '32px 0 24px', flexWrap: 'wrap',
    }}>
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        return (
          <React.Fragment key={step.label}>
            {i > 0 && (
              <div style={{
                width: '60px', height: '2px',
                background: isDone ? 'var(--accent-blue)' : 'var(--border-glass)',
                transition: 'var(--transition)',
              }}/>
            )}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              opacity: isActive || isDone ? 1 : 0.4,
              transition: 'var(--transition)',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
                background: isActive ? 'var(--gradient-primary)' : isDone ? 'rgba(59,130,246,0.2)' : 'var(--bg-card)',
                border: `2px solid ${isActive ? 'var(--accent-blue)' : isDone ? 'var(--accent-blue)' : 'var(--border-glass)'}`,
                boxShadow: isActive ? '0 0 20px rgba(59,130,246,0.3)' : 'none',
                transition: 'var(--transition)',
              }}>
                {isDone ? '✓' : step.icon}
              </div>
              <span style={{
                fontSize: '0.8rem', fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
