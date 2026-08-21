import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { Category } from '../models/Category.js';
import { Exam } from '../models/Exam.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  parseOrThrow,
  categoryCreateSchema,
  categoryUpdateSchema,
  categorySlugify,
} from '../validation/schemas.js';

// Mounted under /api/admin/categories — inherits requireAdmin from admin.js.
const router = Router();

/** Map of category slug -> number of exams using it (incl. '' = uncategorized). */
async function usageCounts() {
  const rows = await Exam.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id || '', r.count]));
}

// GET /api/admin/categories — all categories (incl. inactive) + exam usage counts
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [categories, counts] = await Promise.all([
      Category.find().sort({ order: 1, name: 1 }),
      usageCounts(),
    ]);
    res.json({
      categories: categories.map((c) => ({ ...c.toClientJSON(), examCount: counts.get(c.slug) || 0 })),
      uncategorizedCount: counts.get('') || 0,
    });
  })
);

// POST /api/admin/categories — create (slug is derived once, then immutable)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(categoryCreateSchema, req.body);
    const slug = categorySlugify(data.slug || data.name);
    if (!slug) {
      throw new ValidationError('Could not derive a URL slug from the name', [
        'Provide an English "slug" (e.g. "job-preparation") for categories with a Bengali-only name.',
      ]);
    }
    if (await Category.exists({ slug })) {
      throw new ConflictError(`A category with slug "${slug}" already exists.`);
    }
    const category = await Category.create({
      slug,
      name: data.name,
      nameBn: data.nameBn,
      order: data.order,
      active: data.active,
    });
    res.status(201).json({ category: category.toClientJSON() });
  })
);

// PATCH /api/admin/categories/:id — rename / reorder / (de)activate. Never slug.
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(categoryUpdateSchema, req.body);
    const category = await Category.findById(req.params.id);
    if (!category) throw new NotFoundError('Category not found');
    for (const key of ['name', 'nameBn', 'order', 'active']) {
      if (key in data) category[key] = data[key];
    }
    await category.save();
    res.json({ category: category.toClientJSON() });
  })
);

// DELETE /api/admin/categories/:id — blocked while exams still reference it
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new NotFoundError('Category not found');
    if (await Exam.exists({ category: category.slug })) {
      throw new ConflictError(
        'This category is used by one or more exams. Reassign those exams or deactivate the category instead.'
      );
    }
    await category.deleteOne();
    res.json({ ok: true });
  })
);

export default router;
