import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

adminSchema.methods.toPublicJSON = function toPublicJSON() {
  return { id: this._id.toString(), username: this.username, role: this.role };
};

export const Admin = mongoose.model('Admin', adminSchema);
