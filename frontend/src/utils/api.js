const API_BASE = 'http://localhost:8000';

export async function analyzeSkills(jobDescription, resumeText, resumeFile) {
  const formData = new FormData();
  formData.append('job_description', jobDescription);
  if (resumeFile) {
    formData.append('resume_file', resumeFile);
  } else {
    formData.append('resume_text', resumeText);
  }
  const res = await fetch(`${API_BASE}/api/analyze`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis failed');
  }
  return res.json();
}

export function streamChat(sessionId, endpoint = 'start') {
  const url = endpoint === 'start'
    ? `${API_BASE}/api/chat/start?session_id=${sessionId}`
    : `${API_BASE}/api/chat/next-question?session_id=${sessionId}`;
  return new EventSource(url);
}

export async function sendMessage(sessionId, message) {
  const res = await fetch(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to send message' }));
    throw new Error(err.detail || 'Failed');
  }
  return res.json();
}

export async function generateGapReport(sessionId) {
  const res = await fetch(`${API_BASE}/api/report/gaps?session_id=${sessionId}`, { method: 'POST' });
  if (!res.ok) throw new Error('Gap analysis failed');
  return res.json();
}

export async function generateLearningPlan(sessionId) {
  const res = await fetch(`${API_BASE}/api/report/learning-plan?session_id=${sessionId}`, { method: 'POST' });
  if (!res.ok) throw new Error('Learning plan generation failed');
  return res.json();
}
