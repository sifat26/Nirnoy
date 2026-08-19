import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchExamById } from '../api';
import { useState, useEffect } from 'react';

export default function Results() {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state;
  const [exam, setExam] = useState(null);

  useEffect(() => {
    if (result?.examId) {
      fetchExamById(result.examId).then(setExam);
    }
  }, [result]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="text-slate-600">No results to display</p>
          <button onClick={() => navigate('/')} className="mt-3 text-emerald-600 hover:underline text-sm">Go home</button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getVerdict = (percentage) => {
    if (percentage >= 80) return { label: 'Excellent!', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🏆' };
    if (percentage >= 60) return { label: 'Good Job!', color: 'text-blue-600', bg: 'bg-blue-50', icon: '👍' };
    if (percentage >= 40) return { label: 'Keep Practicing', color: 'text-amber-600', bg: 'bg-amber-50', icon: '📚' };
    return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50', icon: '💪' };
  };

  const verdict = getVerdict(result.percentage);
  const questions = exam?.questions || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Exam Results</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Score Summary Card */}
        <div className={`rounded-xl border p-6 mb-6 ${verdict.bg} border-slate-200`}>
          <div className="text-center mb-4">
            <span className="text-4xl">{verdict.icon}</span>
            <h2 className={`text-xl font-bold mt-2 ${verdict.color}`}>{verdict.label}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-slate-900">{result.score.correct}</p>
              <p className="text-xs text-slate-500 mt-0.5">Correct</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-500">{result.score.wrong}</p>
              <p className="text-xs text-slate-500 mt-0.5">Wrong</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-400">{result.score.unanswered}</p>
              <p className="text-xs text-slate-500 mt-0.5">Skipped</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{result.percentage}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Score</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between text-sm text-slate-600">
            <span>Time taken: {formatTime(result.timeTaken)}</span>
            <span>Total: {result.totalQuestions} questions</span>
          </div>
        </div>

        {/* Score Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium text-slate-700">Score</span>
            <span className="font-semibold text-slate-900">{result.score.correct}/{result.totalQuestions} ({result.percentage}%)</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${result.percentage}%` }} />
          </div>
        </div>

        {/* Question Review */}
        <h3 className="font-bold text-slate-900 mb-4">Question Review</h3>
        <div className="space-y-4">
          {questions.map(q => {
            const userAnswer = result.answers[q.id];
            const isCorrect = userAnswer === q.correct_answer;
            const isSkipped = !userAnswer;

            return (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    isSkipped ? 'bg-slate-100 text-slate-400' : isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {isSkipped ? '—' : isCorrect ? '✓' : '✗'}
                  </span>
                  <p className="text-slate-900 leading-relaxed pt-1">{q.question}</p>
                </div>
                <div className="space-y-2 pl-11">
                  {Object.entries(q.options).map(([key, value]) => {
                    const isUserChoice = userAnswer === key;
                    const isCorrectOption = q.correct_answer === key;

                    let optionStyle = 'border-slate-200';
                    if (isCorrectOption) optionStyle = 'border-emerald-400 bg-emerald-50';
                    else if (isUserChoice && !isCorrect) optionStyle = 'border-red-300 bg-red-50';

                    return (
                      <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border ${optionStyle}`}>
                        <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          isCorrectOption
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : isUserChoice && !isCorrect
                              ? 'border-red-400 bg-red-400 text-white'
                              : 'border-slate-300 text-slate-400'
                        }`}>
                          {isCorrectOption ? '✓' : isUserChoice && !isCorrect ? '✗' : key}
                        </span>
                        <span className={`text-sm flex-1 ${
                          isCorrectOption ? 'text-emerald-800 font-medium' : isUserChoice && !isCorrect ? 'text-red-700' : 'text-slate-600'
                        }`}>{value}</span>
                        {isUserChoice && !isCorrect && !isCorrectOption && (
                          <span className="text-xs text-red-500 font-medium shrink-0">Your answer</span>
                        )}
                        {isCorrectOption && !isUserChoice && (
                          <span className="text-xs text-emerald-600 font-medium shrink-0">Correct</span>
                        )}
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

        {/* Retake Button */}
        <div className="mt-8 mb-8">
          <button
            onClick={() => navigate(`/exam/${examId}/start`)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-lg transition-colors text-lg"
          >
            Retake Exam
          </button>
        </div>
      </main>
    </div>
  );
}
