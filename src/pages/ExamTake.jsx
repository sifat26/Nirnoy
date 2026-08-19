import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchExamById, submitResult } from '../api';

export default function ExamTake() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const questionRefs = useRef({});
  const startTimeRef = useRef(null);

  useEffect(() => {
    fetchExamById(examId).then(data => {
      setExam(data);
      setTimeLeft(data.duration_minutes * 60);
      startTimeRef.current = Date.now();
      setLoading(false);
    }).catch(() => navigate('/'));
  }, [examId, navigate]);

  // Timer
  useEffect(() => {
    if (submitted || !exam) return;
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted, exam]);

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitted) return;
    setSubmitted(true);
    setShowConfirm(false);

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const questions = exam.questions;
    let correct = 0, wrong = 0, unanswered = 0;

    questions.forEach(q => {
      if (!answers[q.id]) unanswered++;
      else if (answers[q.id] === q.correct_answer) correct++;
      else wrong++;
    });

    const result = {
      examId,
      examTitle: exam.examTitle,
      answers: { ...answers },
      timeTaken,
      totalQuestions: questions.length,
      score: { correct, wrong, unanswered, total: correct },
      percentage: Math.round((correct / questions.length) * 100),
    };

    await submitResult(result);
    navigate(`/exam/${examId}/results`, { state: result });
  }, [submitted, answers, exam, examId, navigate]);

  const selectAnswer = (questionId, option) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const scrollToQuestion = (id) => {
    questionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = exam?.questions.length || 0;
  const unansweredCount = totalQuestions - answeredCount;
  const isTimeLow = timeLeft <= 60 && timeLeft > 0;
  const isTimeCritical = timeLeft <= 30 && timeLeft > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Timer Bar */}
      <div className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        isTimeCritical ? 'bg-red-600 border-red-700' : isTimeLow ? 'bg-amber-500 border-amber-600' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfirm(true)}
              className={`p-1.5 rounded-lg transition-colors ${
                isTimeCritical ? 'text-white hover:bg-red-700' : isTimeLow ? 'text-white hover:bg-amber-600' : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className={`font-medium text-sm truncate max-w-[200px] sm:max-w-none ${
              isTimeCritical || isTimeLow ? 'text-white' : 'text-slate-700'
            }`}>{exam.examTitle}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-medium ${
              isTimeCritical || isTimeLow ? 'text-white/80' : 'text-slate-500'
            }`}>{answeredCount}/{totalQuestions} answered</span>
            <div className={`flex items-center gap-1.5 font-mono text-lg font-bold ${
              isTimeCritical ? 'text-white' : isTimeLow ? 'text-white' : 'text-slate-900'
            }`}>
              {isTimeCritical && <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.126 2.962-1.126 3.727 0 .318.472.118.98-.285 1.21l-3.51 2.07c-.746.44-1.712-.12-1.712-.95V4.07c0-.83.966-1.39 1.712-.95l3.51 2.07c.403.23.603.738.285 1.21z" clipRule="evenodd" /></svg>}
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 flex gap-4">
        {/* Question Navigation Sidebar (desktop) */}
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-20 bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {exam.questions.map(q => (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(q.id)}
                  className={`w-8 h-8 rounded-md text-xs font-medium transition-all ${
                    answers[q.id]
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-150'
                  }`}
                >
                  {q.id}
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
              <div className="flex justify-between"><span>Answered</span><span className="font-medium text-emerald-600">{answeredCount}</span></div>
              <div className="flex justify-between"><span>Remaining</span><span className="font-medium text-slate-700">{unansweredCount}</span></div>
            </div>
          </div>
        </aside>

        {/* Questions List */}
        <div className="flex-1 min-w-0 space-y-4 pb-24">
          {exam.questions.map((q, idx) => (
            <div
              key={q.id}
              ref={el => questionRefs.current[q.id] = el}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                  {q.id}
                </span>
                <p className="text-slate-900 leading-relaxed pt-1">{q.question}</p>
              </div>
              <div className="space-y-2 pl-11">
                {Object.entries(q.options).map(([key, value]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      answers[q.id] === key
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={key}
                      checked={answers[q.id] === key}
                      onChange={() => selectAnswer(q.id, key)}
                      className="sr-only"
                    />
                    <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                      answers[q.id] === key
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 text-slate-400'
                    }`}>
                      {answers[q.id] === key ? '✓' : key}
                    </span>
                    <span className={`text-sm ${answers[q.id] === key ? 'text-emerald-800 font-medium' : 'text-slate-700'}`}>{value}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Question Nav (floating) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              const aside = document.getElementById('mobile-question-nav');
              aside.classList.toggle('hidden');
            }}
            className="text-sm text-slate-600 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            Questions
          </button>
          <span className="text-sm text-slate-500">{answeredCount}/{totalQuestions}</span>
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Submit
          </button>
        </div>
        <div id="mobile-question-nav" className="hidden border-t border-slate-100 px-4 py-3 max-h-40 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {exam.questions.map(q => (
              <button
                key={q.id}
                onClick={() => { scrollToQuestion(q.id); document.getElementById('mobile-question-nav').classList.add('hidden'); }}
                className={`w-8 h-8 rounded-md text-xs font-medium ${
                  answers[q.id]
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {q.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Submit Button (floating) */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          Submit Exam
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Submit Exam?</h3>
            {unansweredCount > 0 && (
              <p className="text-amber-600 text-sm mb-3">
                ⚠ You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.
              </p>
            )}
            <p className="text-slate-600 text-sm mb-6">
              This action cannot be undone. Your answers will be finalized.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(false)}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
