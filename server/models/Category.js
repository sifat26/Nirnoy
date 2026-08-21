import mongoose from 'mongoose';

/**
 * An admin-managed exam category (e.g. SSC, HSC, Job Preparation).
 *
 * The `slug` is the stable, immutable identifier — Exam.category and
 * Student.category store this string, not an ObjectId. Keeping it immutable is
 * what makes renames safe (name/nameBn/order/active can change freely) and lets
 * exams survive category-doc edits. Deleting a category that exams point at is
 * blocked by the admin route; deactivating (active:false) hides it instead.
 */
const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, immutable: true },
    name: { type: String, required: true, trim: true }, // English/display name
    nameBn: { type: String, default: '', trim: true }, // Bengali label (shown to students)
    order: { type: Number, default: 0 }, // ascending sort for tabs/lists
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Shape sent to clients (tabs, onboarding, admin screens). */
categorySchema.methods.toClientJSON = function toClientJSON() {
  return {
    id: this._id.toString(),
    slug: this.slug,
    name: this.name,
    nameBn: this.nameBn || '',
    order: this.order ?? 0,
    active: this.active,
  };
};

export const Category = mongoose.model('Category', categorySchema);
