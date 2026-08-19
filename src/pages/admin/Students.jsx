import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminListStudents } from '../../api';
import { ApiError } from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { EmptyState, ErrorBanner } from '../../components/ui';
import { formatDate, initials } from '../../lib/format';

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    adminListStudents()
      .then((data) => setStudents(data.students || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load students'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = q
    ? students.filter((s) => `${s.name} ${s.loginId} ${s.roll}`.toLowerCase().includes(q.toLowerCase()))
    : students;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-500 text-sm">{students.length} registered</p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, roll…"
          className="px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-900 w-full sm:w-64"
        />
      </div>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title={students.length === 0 ? 'No students yet' : 'No matches'} subtitle={students.length === 0 ? 'Students appear here after they register.' : 'Try a different search.'} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left font-medium px-4 py-2.5">Student</th>
                <th className="text-right font-medium px-4 py-2.5">Attempts</th>
                <th className="text-right font-medium px-4 py-2.5 hidden sm:table-cell">Avg</th>
                <th className="text-right font-medium px-4 py-2.5 hidden sm:table-cell">Best</th>
                <th className="text-right font-medium px-4 py-2.5 hidden lg:table-cell">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} onClick={() => navigate(`/admin/students/${s.id}`)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {initials(s.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{s.name}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {s.loginId}
                          {s.grade ? ` · ${s.grade}` : ''}
                          {s.roll ? ` · Roll ${s.roll}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{s.attempts}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700 hidden sm:table-cell">{s.avgPercentage}%</td>
                  <td className="px-4 py-2.5 text-right text-slate-700 hidden sm:table-cell">{s.bestPercentage}%</td>
                  <td className="px-4 py-2.5 text-right text-slate-400 text-xs hidden lg:table-cell">{formatDate(s.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
