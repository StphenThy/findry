import { Schema, model, Document, Types } from 'mongoose';

/**
 * Messages are scoped to an Application: the only place the seeker and
 * employer flows meet. Employers can only message candidates who applied.
 */
export interface IMessage extends Document<Types.ObjectId> {
  applicationId: Types.ObjectId;
  fromUserId: Types.ObjectId;
  toUserId: Types.ObjectId;
  body: string;
  readAt?: Date;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MessageSchema.set('toJSON', {
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    delete ret.__v;
    return ret;
  },
});

export const Message = model<IMessage>('Message', MessageSchema);
