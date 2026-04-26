import React, { useState } from 'react';
import Header from './components/Header';
import ProgressStepper from './components/ProgressStepper';
import InputPanel from './components/InputPanel';
import ChatInterface from './components/ChatInterface';
import GapAnalysis from './components/GapAnalysis';
import LearningPlanView from './components/LearningPlan';
import { analyzeSkills, generateGapReport, generateLearningPlan } from './utils/api';

export default function App() {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Data state
  const [sessionId, setSessionId] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [gapReport, setGapReport] = useState(null);
  const [learningPlan, setLearningPlan] = useState(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);

  const handleAnalyze = async (jd, resumeText, resumeFile) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await analyzeSkills(jd, resumeText, resumeFile);
      setSessionId(data.session_id);
      setAnalysisData(data);
      setStep(1);
    } catch (err) {
      setError(err.message || 'Analysis failed. Check your inputs and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssessmentComplete = async () => {
    setStep(2);
    setGapLoading(true);
    try {
      const report = await generateGapReport(sessionId);
      setGapReport(report);
      setGapLoading(false);

      setPlanLoading(true);
      const plan = await generateLearningPlan(sessionId);
      setLearningPlan(plan);
      setPlanLoading(false);
    } catch (err) {
      setError(err.message || 'Report generation failed');
      setGapLoading(false);
      setPlanLoading(false);
    }
  };

  const handleViewPlan = () => setStep(3);

  const handleRestart = () => {
    setStep(0);
    setSessionId('');
    setAnalysisData(null);
    setGapReport(null);
    setLearningPlan(null);
    setError('');
  };

  return (
    <>
      <Header />
      <main style={{ flex: 1, padding: '0 24px 60px' }}>
        <div className="container">
          <ProgressStepper currentStep={step} />

          {error && (
            <div style={{
              maxWidth: '600px', margin: '0 auto 24px', padding: '14px 20px',
              borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red)',
              fontSize: '0.9rem', textAlign: 'center',
            }}>
              ⚠️ {error}
              <button className="btn btn-ghost" onClick={() => setError('')} style={{ marginLeft: '12px', color: 'var(--accent-red)', padding: '4px 8px', fontSize: '0.8rem' }}>Dismiss</button>
            </div>
          )}

          {step === 0 && (
            <InputPanel onAnalyze={handleAnalyze} isLoading={isLoading} />
          )}

          {step === 1 && (
            <ChatInterface
              sessionId={sessionId}
              analysisData={analysisData}
              onComplete={handleAssessmentComplete}
            />
          )}

          {step === 2 && (
            <div>
              <GapAnalysis gapReport={gapReport} isLoading={gapLoading} />
              {gapReport && !planLoading && learningPlan && (
                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                  <button className="btn btn-primary" onClick={handleViewPlan} style={{ padding: '14px 40px' }}>
                    🗺️ View Learning Plan
                  </button>
                </div>
              )}
              {planLoading && (
                <div style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid var(--border-glass)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '8px', verticalAlign: 'middle' }}/>
                  Preparing learning plan...
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <LearningPlanView plan={learningPlan} isLoading={planLoading} />
              <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>
                  ← Back to Analysis
                </button>
                <button className="btn btn-primary" onClick={handleRestart}>
                  🔄 Start New Assessment
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
