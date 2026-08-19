import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExams } from '../api';
import { ApiError } from '../api/client';
import Header from '../components/Header';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorBanner, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { isStudent } = useAuth();

  useEffect(() => {
    listExams()
      .then((data) => setExams(data.exams || []))
      .catch((err) => setError(err instanceof ApiError ? err : new ApiError('Failed to load exams', 0)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Available Exams</h2>
        <p className="text-slate-500 mb-6">
          {isStudent ? 'Select an exam to begin. Your results are saved to your profile.' : 'Select an exam to begin practicing.'}
        </p>

        {error && <div className="mb-6"><ErrorBanner message={error.message} /></div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : exams.length === 0 ? (
          <EmptyState title="No exams available yet" subtitle="Check back later — an admin needs to publish an exam." />
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => navigate(`/exam/${exam.slug}/start`)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">{exam.title}</h3>
                    {(exam.subject || exam.grade) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {exam.subject && <Badge color="emerald">{exam.subject}</Badge>}
                        {exam.grade && <Badge color="slate">{exam.grade}</Badge>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 00-2 2" />
                        </svg>
                        {exam.questionCount} Questions
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {exam.durationMinutes} min
                      </span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
