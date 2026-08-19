import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { getAttempt } from '../api';
import { ApiError } from '../api/client';
import { Spinner } from '../components/Spinner';
import { formatDuration, verdictFor } from '../lib/format';
import { useAuth } from '../context/AuthContext';

export default function Results() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [result, setResult] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (result) return;
    getAttempt(attemptId)
      .then((data) => setResult(data.result))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load result'))
      .finally(() => setLoading(false));
  }, [attemptId, result]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="text-slate-600">{error || 'No results to display'}</p>
          <button onClick={() => navigate('/')} className="mt-3 text-emerald-600 hover:underline text-sm">
            Go home
          </button>
        </div>
      </div>
    );
  }

  const verdict = verdictFor(result.percentage);
  const review = result.review || [];
  const marks = result.score || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(isAdmin ? -1 : '/')} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-900 truncate">{result.examTitle}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {result.status === 'expired' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
            ⏱ Time ran out — this attempt was auto-submitted.
          </div>
        )}

        {/* Score summary */}
        <div className={`rounded-xl border p-6 mb-6 ${verdict.bg} border-slate-200`}>
          <div className="text-center mb-4">
            <span className="text-4xl">{verdict.icon}</span>
            <h2 className={`text-xl font-bold mt-2 ${verdict.color}`}>{verdict.label}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <Stat value={marks.correct ?? 0} label="Correct" tone="text-slate-900" />
            <Stat value={marks.wrong ?? 0} label="Wrong" tone="text-red-500" />
            <Stat value={marks.unanswered ?? 0} label="Skipped" tone="text-slate-400" />
            <Stat value={`${result.percentage}%`} label="Score" tone="text-slate-900" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <span>Marks: {marks.marksObtained ?? 0}/{marks.totalMarks ?? 0}</span>
            <span>Time taken: {formatDuration(result.timeTakenSec)}</span>
            <span>Total: {result.totalQuestions} questions</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium text-slate-700">Score</span>
            <span className="font-semibold text-slate-900">
              {marks.correct ?? 0}/{result.totalQuestions} ({result.percentage}%)
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${result.percentage}%` }} />
          </div>
        </div>

        {/* Review */}
        <h3 className="font-bold text-slate-900 mb-4">Question Review</h3>
        <div className="space-y-4">
          {review.map((q, idx) => {
            const isSkipped = q.selected == null;
            return (
              <div key={q.qid} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isSkipped ? 'bg-slate-100 text-slate-400' : q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isSkipped ? '—' : q.isCorrect ? '✓' : '✗'}
                  </span>
                  <p className="text-slate-900 leading-relaxed pt-1">
                    <span className="text-slate-400 font-medium mr-1">{idx + 1}.</span>
                    {q.question}
                  </p>
                </div>
                <div className="space-y-2 pl-11">
                  {q.options.map((opt) => {
                    const isUserChoice = q.selected === opt.key;
                    const isCorrectOption = q.correctAnswer === opt.key;
                    let optionStyle = 'border-slate-200';
                    if (isCorrectOption) optionStyle = 'border-emerald-400 bg-emerald-50';
                    else if (isUserChoice && !q.isCorrect) optionStyle = 'border-red-300 bg-red-50';

                    return (
                      <div key={opt.key} className={`flex items-center gap-3 p-3 rounded-lg border ${optionStyle}`}>
                        <span
                          className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                            isCorrectOption
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : isUserChoice && !q.isCorrect
                                ? 'border-red-400 bg-red-400 text-white'
                                : 'border-slate-300 text-slate-400'
                          }`}
                        >
                          {isCorrectOption ? '✓' : isUserChoice && !q.isCorrect ? '✗' : opt.key}
                        </span>
                        <span
                          className={`text-sm flex-1 ${
                            isCorrectOption ? 'text-emerald-800 font-medium' : isUserChoice && !q.isCorrect ? 'text-red-700' : 'text-slate-600'
                          }`}
                        >
                          {opt.text}
                        </span>
                        {isUserChoice && !isCorrectOption && <span className="text-xs text-red-500 font-medium shrink-0">Your answer</span>}
                        {isCorrectOption && !isUserChoice && <span className="text-xs text-emerald-600 font-medium shrink-0">Correct</span>}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="mt-4 pl-11">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-700 mb-1">Explanation</p>
                      <p className="text-sm text-blue-800">{q.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        {!isAdmin && (
          <div className="mt-8 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to={`/exam/${result.examSlug}/start`}
              className="text-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-lg transition-colors"
            >
              Retake Exam
            </Link>
            <Link
              to="/me"
              className="text-center bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3.5 rounded-lg transition-colors"
            >
              View My History
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ value, label, tone }) {
  return (
    <div>
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
