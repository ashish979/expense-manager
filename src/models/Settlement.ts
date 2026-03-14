import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISettlement extends Document {
  paidBy: Types.ObjectId;
  paidTo: Types.ObjectId;
  amount: number; // cents
  groupId?: Types.ObjectId;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paidTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    groupId: { type: Schema.Types.ObjectId, ref: "Group" },
    date: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

SettlementSchema.index({ paidBy: 1 });
SettlementSchema.index({ paidTo: 1 });

const Settlement: Model<ISettlement> =
  mongoose.models.Settlement ??
  mongoose.model<ISettlement>("Settlement", SettlementSchema);

export default Settlement;
