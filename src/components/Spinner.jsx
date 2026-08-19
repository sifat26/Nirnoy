export function Spinner({ className = 'w-8 h-8' }) {
  return <div className={`${className} border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin`} />;
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Spinner />
    </div>
  );
}
