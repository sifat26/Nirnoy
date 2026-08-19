import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // phone or email, normalized to lowercase; unique login handle
    loginId: { type: String, required: true, unique: true, lowercase: true, trim: true },
    loginType: { type: String, enum: ['email', 'phone'], required: true },
    pinHash: { type: String, required: true },
    grade: { type: String, trim: true, default: '' }, // class/grade, e.g. "SSC"
    roll: { type: String, trim: true, default: '' },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/** Safe representation — never includes pinHash. */
studentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    loginId: this.loginId,
    loginType: this.loginType,
    grade: this.grade,
    roll: this.roll,
    createdAt: this.createdAt,
    lastActiveAt: this.lastActiveAt,
  };
};

export const Student = mongoose.model('Student', studentSchema);
