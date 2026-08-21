import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { Category } from '../models/Category.js';

const router = Router();

// GET /api/categories — active categories (for Home tabs, onboarding, dropdowns)
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await Category.find({ active: true }).sort({ order: 1, name: 1 });
    res.json({ categories: categories.map((c) => c.toClientJSON()) });
  })
);

export default router;
