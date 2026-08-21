import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminExamAttempts, adminExportAttempts } from '../../api';
import { ApiError } from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { StatTile, EmptyState, ErrorBanner, Badge } from '../../components/ui';
import { formatDate, formatDuration } from '../../lib/format';

export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    adminExamAttempts(id)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load exam'))
      .finally(() => setLoading(false));
  }, [id]);

  async function exportCsv() {
    setExporting(true);
    try {
      await adminExportAttempts(id, `${data.summary.exam.slug}-results.csv`);
    } catch {
      setError('Export failed');
    } finally {
      setExporting(false);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/exam/${data.summary.exam.slug}/start`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }
  if (error) return <ErrorBanner message={error} />;

  const { summary, leaderboard, questionStats } = data;
  const exam = summary.exam;

  return (
    <div>
      <button onClick={() => navigate('/admin/exams')} className="text-sm text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to exams
      </button>

      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
            {exam.published ? <Badge color="emerald">Published</Badge> : <Badge color="amber">Draft</Badge>}
          </div>
          <p className="text-slate-500 text-sm mt-0.5 font-mono">/{exam.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/admin/exams/${id}/edit`}
            className="text-sm font-medium px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            Edit exam
          </Link>
          <button onClick={copyLink} className="text-sm font-medium px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            onClick={exportCsv}
            disabled={exporting || leaderboard.length === 0}
            className="text-sm font-medium px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {exporting && <Spinner className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatTile label="Attempts" value={summary.totalAttempts} />
        <StatTile label="Avg score" value={`${summary.avgPercentage}%`} />
        <StatTile label="Highest" value={`${summary.highest}%`} />
        <StatTile label="Questions" value={exam.questionCount} />
      </div>

      {/* Leaderboard */}
      <h2 className="font-bold text-slate-900 mb-3">Leaderboard</h2>
      {leaderboard.length === 0 ? (
        <EmptyState title="No attempts yet" subtitle="Share the link to collect results." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left font-medium px-4 py-2.5">#</th>
                <th className="text-left font-medium px-4 py-2.5">Student</th>
                <th className="text-right font-medium px-4 py-2.5">Score</th>
                <th className="text-right font-medium px-4 py-2.5 hidden sm:table-cell">Correct</th>
                <th className="text-right font-medium px-4 py-2.5 hidden md:table-cell">Time</th>
                <th className="text-right font-medium px-4 py-2.5 hidden lg:table-cell">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.map((row) => (
                <tr
                  key={row.attemptId}
                  onClick={() => navigate(`/results/${row.attemptId}`)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-2.5 text-slate-400 font-medium">{row.rank}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900">{row.studentName}</div>
                    <div className="text-xs text-slate-400">
                      {row.loginId}
                      {row.roll ? ` · Roll ${row.roll}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{row.percentage}%</td>
                  <td className="px-4 py-2.5 text-right text-slate-600 hidden sm:table-cell">
                    {row.correct}/{row.correct + row.wrong + row.unanswered}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 hidden md:table-cell">{formatDuration(row.timeTakenSec)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400 text-xs hidden lg:table-cell">{formatDate(row.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Question difficulty */}
      <h2 className="font-bold text-slate-900 mb-3">Question difficulty</h2>
      <div className="space-y-2">
        {questionStats.map((q, idx) => (
          <div key={q.qid} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-slate-800 min-w-0">
                <span className="text-slate-400 font-medium mr-1">{idx + 1}.</span>
                {q.question}
              </p>
              <span className="text-sm font-semibold text-slate-900 shrink-0">{q.accuracy}%</span>
            </div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${q.accuracy >= 60 ? 'bg-emerald-500' : q.accuracy >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${q.accuracy}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span className="text-emerald-600">{q.correct} correct</span>
              <span className="text-red-500">{q.wrong} wrong</span>
              <span>{q.unanswered} skipped</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-6">
        Tip: manage publish state and delete from the{' '}
        <Link to="/admin/exams" className="text-emerald-600 hover:underline">
          exams list
        </Link>
        .
      </p>
    </div>
  );
}
