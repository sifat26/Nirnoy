import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startAttempt, submitAttempt } from '../api';
import { ApiError } from '../api/client';
import { Spinner } from '../components/Spinner';
import { formatClock } from '../lib/format';

export default function ExamTake() {
  const { examId: slug } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [attemptId, setAttemptId] = useState(null);
  const [examMeta, setExamMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startedRef = useRef(false);
  const deadlineRef = useRef(null);
  const answersRef = useRef({});
  const submittedRef = useRef(false);
  const questionRefs = useRef({});

  // Start the attempt exactly once (guarded against StrictMode double-invoke).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startAttempt(slug)
      .then((data) => {
        setAttemptId(data.attemptId);
        setExamMeta(data.exam);
        setQuestions(data.questions || []);
        deadlineRef.current = new Date(data.serverDeadline).getTime();
        setRemaining(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)));
        setStatus('ready');
      })
      .catch((err) => {
        setErrorMsg(err instanceof ApiError ? err.message : 'Could not start the exam');
        setStatus('error');
      });
  }, [slug]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current || !attemptId) return;
    submittedRef.current = true;
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const { result } = await submitAttempt(attemptId, answersRef.current);
      navigate(`/results/${attemptId}`, { replace: true, state: { result } });
    } catch (err) {
      // Let the student retry.
      submittedRef.current = false;
      setSubmitting(false);
      setErrorMsg(err instanceof ApiError ? err.message : 'Submit failed. Please try again.');
    }
  }, [attemptId, navigate]);

  // Countdown driven by the absolute server deadline (robust to tab throttling).
  useEffect(() => {
    if (status !== 'ready') return undefined;
    const tick = () => {
      const secs = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) doSubmit();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, doSubmit]);

  const selectAnswer = (qid, key) => {
    if (submittedRef.current) return;
    setAnswers((prev) => {
      const next = { ...prev, [qid]: key };
      answersRef.current = next;
      return next;
    });
  };

  const scrollToQuestion = (qid) => {
    questionRefs.current[qid]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium">Could not start the exam</p>
          <p className="text-slate-500 text-sm mt-1">{errorMsg}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-emerald-600 hover:underline text-sm">
            Go back home
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const unansweredCount = totalQuestions - answeredCount;
  const isTimeLow = remaining <= 60 && remaining > 30;
  const isTimeCritical = remaining <= 30;
  const barTone = isTimeCritical ? 'bg-red-600 border-red-700' : isTimeLow ? 'bg-amber-500 border-amber-600' : 'bg-white border-slate-200';
  const barText = isTimeCritical || isTimeLow ? 'text-white' : 'text-slate-700';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Timer Bar */}
      <div className={`sticky top-0 z-40 border-b transition-colors duration-300 ${barTone}`}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className={`font-medium text-sm truncate max-w-50 sm:max-w-none ${barText}`}>{examMeta?.title}</span>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-medium ${isTimeCritical || isTimeLow ? 'text-white/80' : 'text-slate-500'}`}>
              {answeredCount}/{totalQuestions} answered
            </span>
            <div className={`flex items-center gap-1.5 font-mono text-lg font-bold ${isTimeCritical || isTimeLow ? 'text-white' : 'text-slate-900'}`}>
              <svg className={`w-4 h-4 ${isTimeCritical ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatClock(remaining)}
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
              {questions.map((q, idx) => (
                <button
                  key={q.qid}
                  onClick={() => scrollToQuestion(q.qid)}
                  className={`w-8 h-8 rounded-md text-xs font-medium transition-all ${
                    answers[q.qid]
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
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
          {questions.map((q, idx) => (
            <div
              key={q.qid}
              ref={(el) => (questionRefs.current[q.qid] = el)}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                  {idx + 1}
                </span>
                <p className="text-slate-900 leading-relaxed pt-1">{q.question}</p>
              </div>
              <div className="space-y-2 pl-11">
                {q.options.map((opt) => {
                  const selected = answers[q.qid] === opt.key;
                  return (
                    <label
                      key={opt.key}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.qid}`}
                        value={opt.key}
                        checked={selected}
                        onChange={() => selectAnswer(q.qid, opt.key)}
                        className="sr-only"
                      />
                      <span
                        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                          selected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-400'
                        }`}
                      >
                        {selected ? '✓' : opt.key}
                      </span>
                      <span className={`text-sm ${selected ? 'text-emerald-800 font-medium' : 'text-slate-700'}`}>{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">{answeredCount}/{totalQuestions} answered</span>
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Desktop floating submit */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          Submit Exam
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Submit Exam?</h3>
            {unansweredCount > 0 && (
              <p className="text-amber-600 text-sm mb-3">
                ⚠ You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.
              </p>
            )}
            <p className="text-slate-600 text-sm mb-6">This action cannot be undone. Your answers will be finalized and graded.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <Spinner className="w-4 h-4" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-submit overlay */}
      {submitting && !showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-5 shadow-xl flex items-center gap-3">
            <Spinner className="w-5 h-5" />
            <span className="text-slate-700 font-medium">Submitting…</span>
          </div>
        </div>
      )}
    </div>
  );
}
