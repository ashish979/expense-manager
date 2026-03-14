import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type SplitType = "equal" | "unequal" | "percentage" | "shares";
export type ExpenseCategory =
  | "food"
  | "transport"
  | "accommodation"
  | "entertainment"
  | "utilities"
  | "shopping"
  | "health"
  | "other";

export interface ExpenseSplit {
  userId: Types.ObjectId;
  amount: number; // cents
  percentage?: number;
  shares?: number;
}

export interface IExpense extends Document {
  description: string;
  amount: number; // cents
  category: ExpenseCategory;
  date: Date;
  groupId?: Types.ObjectId;
  paidBy: Types.ObjectId;
  splitType: SplitType;
  splits: ExpenseSplit[];
  notes?: string;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 }, // cents
    category: {
      type: String,
      enum: ["food", "transport", "accommodation", "entertainment", "utilities", "shopping", "health", "other"],
      default: "other",
    },
    date: { type: Date, required: true, default: Date.now },
    groupId: { type: Schema.Types.ObjectId, ref: "Group" },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    splitType: {
      type: String,
      enum: ["equal", "unequal", "percentage", "shares"],
      required: true,
    },
    splits: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
        percentage: { type: Number },
        shares: { type: Number },
      },
    ],
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ paidBy: 1, date: -1 });
ExpenseSchema.index({ groupId: 1, date: -1 });
ExpenseSchema.index({ "splits.userId": 1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense ?? mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
