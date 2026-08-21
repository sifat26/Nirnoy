import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // phone or email, normalized to lowercase; unique login handle
    loginId: { type: String, required: true, unique: true, lowercase: true, trim: true },
    loginType: { type: String, enum: ['email', 'phone', 'google'], required: true },
    // Only local (PIN) accounts carry a pinHash. Social accounts (Google) have none.
    pinHash: { type: String },
    // How the account signs in: 'local' = email/phone + PIN; 'google' = Google Sign-In.
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    // Google's stable subject id. Sparse + unique so many local accounts (no
    // googleId) don't collide on null while google accounts stay unique.
    googleId: { type: String, index: { unique: true, sparse: true } },
    email: { type: String, lowercase: true, trim: true, default: '' },
    avatarUrl: { type: String, default: '' },
    grade: { type: String, trim: true, default: '' }, // class/grade, e.g. "SSC"
    roll: { type: String, trim: true, default: '' },
    // Preferred exam category slug (see Category model). Chosen at onboarding,
    // editable from Profile. '' = not chosen yet (triggers the /welcome step).
    category: { type: String, trim: true, lowercase: true, default: '' },
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
    provider: this.provider || 'local',
    email: this.email || '',
    avatarUrl: this.avatarUrl || '',
    grade: this.grade,
    roll: this.roll,
    category: this.category || '',
    createdAt: this.createdAt,
    lastActiveAt: this.lastActiveAt,
  };
};

export const Student = mongoose.model('Student', studentSchema);
