import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LeadSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, // email 唯一
      lowercase: true,
      trim: true,
    },
    answers: { type: [Schema.Types.Mixed], default: [] }, // 問卷答案陣列
    result: { type: String, required: true }, // 分析全文
    resultType: { type: String, required: true }, // 風格代號
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export type LeadDoc = InferSchemaType<typeof LeadSchema>;

// 熱重載時避免重複註冊 model
const Lead: Model<LeadDoc> =
  (mongoose.models.Lead as Model<LeadDoc>) ||
  mongoose.model<LeadDoc>("Lead", LeadSchema);

export default Lead;
