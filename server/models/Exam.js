import mongoose from 'mongoose';

/** One selectable option. `key` is the canonical identity (e.g. "A"). */
const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    qid: { type: String, required: true }, // stable id within the exam
    question: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    correctAnswer: { type: String, required: true }, // must match an option key
    explanation: { type: String, default: '' },
    marks: { type: Number, default: 1, min: 0 },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    subject: { type: String, default: '' },
    grade: { type: String, default: '' },
    durationMinutes: { type: Number, required: true, min: 1 },
    questions: { type: [questionSchema], default: [] },
    published: { type: Boolean, default: false },
    // Anti-cheat knobs (default off so exams render in natural order)
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    negativeMarking: { type: Number, default: 0, min: 0 }, // marks deducted per wrong
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

/** Total marks available (sum of per-question marks). */
examSchema.methods.totalMarks = function totalMarks() {
  return this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
};

/** Lightweight meta for lists / start screens (no questions). */
examSchema.methods.toMetaJSON = function toMetaJSON() {
  return {
    id: this._id.toString(),
    slug: this.slug,
    title: this.title,
    description: this.description,
    subject: this.subject,
    grade: this.grade,
    durationMinutes: this.durationMinutes,
    questionCount: this.questions.length,
    totalMarks: this.totalMarks(),
    published: this.published,
    shuffleQuestions: this.shuffleQuestions,
    shuffleOptions: this.shuffleOptions,
    negativeMarking: this.negativeMarking,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Exam = mongoose.model('Exam', examSchema);
