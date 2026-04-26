import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000';

export default function ChatInterface({ sessionId, analysisData, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentSkill, setCurrentSkill] = useState('');
  const [assessed, setAssessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [started, setStarted] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isStreaming]);

  const connectSSE = (url) => {
    return new Promise((resolve, reject) => {
      setIsStreaming(true);
      let accumulated = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

      const source = new EventSource(url);
      source.addEventListener('chunk', (e) => {
        const { text } = JSON.parse(e.data);
        accumulated += text;
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: accumulated, streaming: true };
          return copy;
        });
      });
      source.addEventListener('done', (e) => {
        const meta = JSON.parse(e.data);
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: accumulated, streaming: false };
          return copy;
        });
        setCurrentSkill(meta.current_skill || '');
        setAssessed(meta.skills_assessed || 0);
        setTotal(meta.total_skills || 0);
        setIsStreaming(false);
        source.close();
        if (meta.is_complete) {
          setIsComplete(true);
        }
        resolve(meta);
      });
      source.onerror = () => {
        setIsStreaming(false);
        source.close();
        setMessages(prev => {
          const copy = [...prev];
          if (copy.length > 0 && copy[copy.length - 1].streaming) {
            copy[copy.length - 1].streaming = false;
            if (!copy[copy.length - 1].content) copy[copy.length - 1].content = 'Connection issue. Please try again.';
          }
          return copy;
        });
        reject(new Error('SSE failed'));
      };
    });
  };

  const startAssessment = async () => {
    setStarted(true);
    setTotal(analysisData?.required_skills?.length || 0);
    try {
      await connectSSE(`${API_BASE}/api/chat/start?session_id=${sessionId}`);
    } catch { /* handled in SSE */ }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || isSending) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: msg }),
      });
      const data = await res.json();
      setAssessed(data.skills_assessed || assessed);

      if (data.is_complete) {
        setIsComplete(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '✅ **Assessment complete!** I\'ve evaluated all the required skills. Click the button below to see your gap analysis and personalized learning plan.',
        }]);
        setIsSending(false);
        return;
      }

      setIsSending(false);
      // Stream next question
      await connectSSE(`${API_BASE}/api/chat/next-question?session_id=${sessionId}`);
    } catch (err) {
      setIsSending(false);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Skills sidebar
  const skills = analysisData?.required_skills || [];

  return (
    <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', maxWidth: '1100px', margin: '0 auto', width: '100%', minHeight: '500px' }}>
      {/* Skills sidebar */}
      <div className="glass-card" style={{ padding: '20px', height: 'fit-content', position: 'sticky', top: '100px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>Skills to Assess</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {skills.map((skill, i) => {
            const isDone = i < assessed;
            const isActive = skill.name === currentSkill;
            return (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                background: isActive ? 'rgba(59,130,246,0.15)' : isDone ? 'rgba(16,185,129,0.08)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--accent-blue)' : isDone ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'var(--transition)', fontSize: '0.85rem',
              }}>
                <span style={{ fontSize: '0.9rem' }}>
                  {isDone ? '✅' : isActive ? '💬' : '⬜'}
                </span>
                <span style={{ color: isDone ? 'var(--accent-green)' : isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                  {skill.name}
                </span>
              </div>
            );
          })}
        </div>
        {total > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(59,130,246,0.08)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Progress</div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px', background: 'var(--gradient-primary)',
                width: `${(assessed / total) * 100}%`, transition: 'width 0.5s ease',
              }}/>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{assessed}/{total} skills</div>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
        {/* Chat header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>SkillSync Assessor</div>
            <div style={{ fontSize: '0.8rem', color: isStreaming ? 'var(--accent-green)' : 'var(--text-muted)' }}>
              {isStreaming ? 'typing...' : currentSkill ? `Assessing: ${currentSkill}` : 'Ready'}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '450px' }}>
          {!started ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem' }}>💬</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Ready to assess {skills.length} skills</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
                I'll ask you targeted questions about each required skill. Answer honestly — this helps build an accurate learning plan.
              </p>
              <button className="btn btn-primary" onClick={startAssessment} style={{ marginTop: '8px' }}>
                🚀 Begin Assessment
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadeIn 0.3s ease-out',
                }}>
                  <div style={{
                    maxWidth: '75%', padding: '14px 18px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? 'var(--gradient-primary)' : 'var(--bg-card)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border-glass)',
                    fontSize: '0.92rem', lineHeight: '1.6',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  }}>
                    {msg.content}
                    {msg.streaming && (
                      <span style={{ display: 'inline-flex', gap: '3px', marginLeft: '6px', verticalAlign: 'middle' }}>
                        {[0,1,2].map(j => (
                          <span key={j} style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: 'var(--accent-blue)',
                            animation: `typing 1.2s ${j * 0.2}s infinite`,
                          }}/>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef}/>
            </>
          )}
        </div>

        {/* Input bar */}
        {started && !isComplete && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '12px' }}>
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              disabled={isStreaming || isSending}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || isSending}
              style={{ padding: '12px 24px' }}
            >
              {isSending ? '...' : 'Send'}
            </button>
          </div>
        )}

        {isComplete && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={onComplete} style={{ padding: '14px 40px' }}>
              📊 View Gap Analysis & Learning Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
