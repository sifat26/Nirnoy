/** Category display helpers shared by Home, Profile, and admin screens. */

/** Title-case a slug as a fallback label: "job-preparation" -> "Job Preparation". */
export function slugToLabel(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Human label for a category slug. Prefers the admin-set English name, then the
 * Bengali label, then a title-cased slug (so exams pointing at a deleted/inactive
 * category still show a sane badge instead of a raw slug).
 */
export function categoryLabel(slug, categories = []) {
  if (!slug) return '';
  const c = categories.find((x) => x.slug === slug);
  if (c) return c.name || c.nameBn || slugToLabel(slug);
  return slugToLabel(slug);
}
