import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchExams } from '../api';

export default function Home() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams()
      .then(setExams)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">Q</div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 leading-tight">MCQ Exam Platform</h1>
            <p className="text-xs text-slate-500">SSC &amp; HSC Practice Exams</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Available Exams</h2>
        <p className="text-slate-500 mb-6">Select an exam to begin practicing</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">No exams available</p>
            <p className="text-sm mt-1">Check back later or add exam JSON files</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map(exam => (
              <button
                key={exam.id}
                onClick={() => navigate(`/exam/${exam.id}/start`)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                      {exam.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 00-2 2" /></svg>
                        {exam.questionCount} Questions
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {exam.duration} min
                      </span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
