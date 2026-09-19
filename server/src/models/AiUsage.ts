import { Schema, model } from 'mongoose';

/** One document per calendar day (UTC): how many real Gemini calls were made. */
export const AiUsage = model(
  'AiUsage',
  new Schema(
    {
      day: { type: String, required: true, unique: true }, // YYYY-MM-DD
      calls: { type: Number, default: 0 },
      byKind: { type: Map, of: Number, default: {} },
    },
    { timestamps: true },
  ),
);

/**
 * Memoised AI results. Identical prompts (same resume text, same job title,
 * same missing-skill set) are served from here instead of costing a Gemini
 * call. Documents expire automatically after `AI_CACHE_DAYS`.
 */
const AiCacheSchema = new Schema({
  key: { type: String, required: true, unique: true },
  kind: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});
AiCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: Number(process.env.AI_CACHE_DAYS ?? 14) * 86400 });
export const AiCache = model('AiCache', AiCacheSchema);
