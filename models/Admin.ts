import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AdminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }, // bcrypt 雜湊，絕不存明文
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export type AdminDoc = InferSchemaType<typeof AdminSchema>;

const Admin: Model<AdminDoc> =
  (mongoose.models.Admin as Model<AdminDoc>) ||
  mongoose.model<AdminDoc>("Admin", AdminSchema);

export default Admin;
