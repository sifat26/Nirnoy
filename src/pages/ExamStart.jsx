import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getExam } from '../api';
import { ApiError } from '../api/client';
import { Spinner } from '../components/Spinner';
import { Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function ExamStart() {
  const { examId: slug } = useParams();
  const navigate = useNavigate();
  const { isStudent } = useAuth();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getExam(slug)
      .then((data) => setExam(data.exam))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load exam'))
      .finally(() => setLoading(false));
  }, [slug]);

  function begin() {
    const takePath = `/exam/${slug}/take`;
    if (isStudent) navigate(takePath);
    else navigate(`/login?next=${encodeURIComponent(takePath)}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load exam</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-emerald-600 hover:underline text-sm">
            Go back home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-900 truncate">{exam.title}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{exam.title}</h2>
            {exam.description && <p className="text-slate-500 text-sm mt-2">{exam.description}</p>}
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {exam.subject && <Badge color="emerald">{exam.subject}</Badge>}
              {exam.grade && <Badge color="slate">{exam.grade}</Badge>}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <Row label="Questions" value={exam.questionCount} />
            <Row label="Duration" value={`${exam.durationMinutes} minutes`} />
            <Row label="Total marks" value={exam.totalMarks} />
            <Row label="Negative marking" value={exam.negativeMarking ? `−${exam.negativeMarking} per wrong` : 'None'} />
            <Row label="Format" value="Single-answer MCQ" last />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-amber-800 text-sm flex items-center gap-2 mb-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Instructions
            </h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Answer all questions within the time limit</li>
              <li>• The timer is server-controlled and auto-submits when time runs out</li>
              <li>• You can review your answers before submitting</li>
              <li>• Your result is saved to your profile</li>
            </ul>
          </div>

          {!isStudent && (
            <p className="text-center text-sm text-slate-500 mb-4">
              You'll{' '}
              <Link to={`/login?next=${encodeURIComponent(`/exam/${slug}/take`)}`} className="text-emerald-600 font-medium hover:underline">
                log in
              </Link>{' '}
              or{' '}
              <Link to={`/register?next=${encodeURIComponent(`/exam/${slug}/take`)}`} className="text-emerald-600 font-medium hover:underline">
                create an account
              </Link>{' '}
              to take this exam.
            </p>
          )}

          <button
            onClick={begin}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-lg transition-colors text-lg"
          >
            {isStudent ? 'Begin Exam' : 'Log in & Begin'}
          </button>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div className={`flex justify-between items-center py-3 ${last ? '' : 'border-b border-slate-100'}`}>
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
