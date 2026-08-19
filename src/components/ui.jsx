/** Small shared UI primitives (kept intentionally lightweight — no UI kit). */

const ACCENTS = {
  emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  blue: 'text-blue-700 bg-blue-50 border-blue-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  red: 'text-red-700 bg-red-50 border-red-200',
  slate: 'text-slate-700 bg-slate-50 border-slate-200',
};

export function StatTile({ label, value, hint, accent = 'slate' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      <span className={`hidden ${ACCENTS[accent]}`} />
    </div>
  );
}

export function Badge({ children, color = 'slate' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ACCENTS[color]}`}>
      {children}
    </span>
  );
}

export function ErrorBanner({ message, details }) {
  if (!message && !(details && details.length)) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
      {message && <p className="text-red-700 font-medium">{message}</p>}
      {details && details.length > 0 && (
        <ul className="mt-1 list-disc list-inside text-red-600 space-y-0.5">
          {details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EmptyState({ title, subtitle, children }) {
  return (
    <div className="text-center py-12 text-slate-400">
      <p className="text-lg">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
