import React, { useState, useRef } from 'react';

export default function InputPanel({ onAnalyze, isLoading }) {
  const [jd, setJd] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [mode, setMode] = useState('text'); // 'text' | 'file'
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleSubmit = () => {
    if (!jd.trim() || (!resumeText.trim() && !resumeFile)) return;
    onAnalyze(jd, resumeText, resumeFile);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') setResumeFile(file);
  };

  const canSubmit = jd.trim().length >= 50 && (resumeText.trim() || resumeFile);

  return (
    <div className="animate-in" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{
          fontSize: '2rem', fontWeight: 800, marginBottom: '12px',
          background: 'var(--gradient-hero)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Start Your Skill Assessment
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          Paste a job description and your resume. Our AI will identify required skills, assess your proficiency, and create a personalized learning plan.
        </p>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* JD Panel */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Job Description</h3>
          </div>
          <textarea
            className="textarea"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here...&#10;&#10;Include responsibilities, requirements, qualifications, and any technical skills mentioned."
            style={{ minHeight: '320px' }}
          />
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: jd.length >= 50 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {jd.length} characters {jd.length < 50 ? '(min 50)' : '✓'}
          </div>
        </div>

        {/* Resume Panel */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>📄</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Resume</h3>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className={mode === 'text' ? 'btn btn-primary' : 'btn btn-ghost'}
                onClick={() => setMode('text')}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >Text</button>
              <button
                className={mode === 'file' ? 'btn btn-primary' : 'btn btn-ghost'}
                onClick={() => setMode('file')}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >PDF Upload</button>
            </div>
          </div>

          {mode === 'text' ? (
            <textarea
              className="textarea"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume content here...&#10;&#10;Include your experience, skills, education, and certifications."
              style={{ minHeight: '320px' }}
            />
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                minHeight: '320px',
                border: `2px dashed ${dragOver ? 'var(--accent-blue)' : 'var(--border-glass)'}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '16px',
                cursor: 'pointer',
                background: dragOver ? 'rgba(59,130,246,0.05)' : 'transparent',
                transition: 'var(--transition)',
              }}
            >
              <input
                ref={fileRef} type="file" accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => setResumeFile(e.target.files[0])}
              />
              <div style={{ fontSize: '3rem', opacity: 0.6 }}>
                {resumeFile ? '📎' : '☁️'}
              </div>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                {resumeFile ? (
                  <><strong>{resumeFile.name}</strong><br/>
                  <span style={{ fontSize: '0.85rem' }}>{(resumeFile.size / 1024).toFixed(1)} KB — Click to change</span></>
                ) : (
                  <>Drag & drop your PDF here<br/>
                  <span style={{ fontSize: '0.85rem' }}>or click to browse</span></>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading}
          style={{ padding: '16px 48px', fontSize: '1.05rem' }}
        >
          {isLoading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}/>
              Analyzing Skills...
            </>
          ) : (
            <>🔍 Analyze & Start Assessment</>
          )}
        </button>
      </div>
    </div>
  );
}
