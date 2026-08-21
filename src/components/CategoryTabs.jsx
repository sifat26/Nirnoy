/**
 * Horizontal, scrollable category tab row. Controlled: parent owns the selected
 * slug ('all' = show everything). Renders nothing when there are no categories.
 */
export default function CategoryTabs({ categories = [], value = 'all', onChange }) {
  if (!categories.length) return null;

  const tabs = [{ slug: 'all', label: 'All' }, ...categories.map((c) => ({ slug: c.slug, label: c.name || c.slug }))];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 mb-5" role="tablist" aria-label="Exam categories">
      {tabs.map((t) => {
        const active = value === t.slug;
        return (
          <button
            key={t.slug}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(t.slug)}
            className={`shrink-0 text-sm font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
              active
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
