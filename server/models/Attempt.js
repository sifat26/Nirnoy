import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    examTitle: { type: String, default: '' }, // snapshot for history display
    answers: { type: Map, of: String, default: {} }, // qid -> selected option key
    questionOrder: { type: [String], default: [] }, // qids in the order shown to student
    score: {
      correct: { type: Number, default: 0 },
      wrong: { type: Number, default: 0 },
      unanswered: { type: Number, default: 0 },
      marksObtained: { type: Number, default: 0 },
      totalMarks: { type: Number, default: 0 },
    },
    percentage: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'expired'],
      default: 'in_progress',
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    serverDeadline: { type: Date, required: true }, // startedAt + duration; timer is server-authoritative
    submittedAt: { type: Date },
    timeTakenSec: { type: Number },
  },
  { timestamps: true }
);

attemptSchema.index({ student: 1, createdAt: -1 });
attemptSchema.index({ exam: 1, percentage: -1 });

export const Attempt = mongoose.model('Attempt', attemptSchema);
