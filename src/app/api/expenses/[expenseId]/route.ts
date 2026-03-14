import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import Activity from "@/models/Activity";
import { calculateSplits } from "@/lib/split-calculator";
import { serializeExpense } from "../route";
import { Types } from "mongoose";
import { z } from "zod";

const UpdateExpenseSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  amount: z.number().int().positive().optional(),
  category: z.enum(["food", "transport", "accommodation", "entertainment", "utilities", "shopping", "health", "other"]).optional(),
  date: z.string().datetime().optional(),
  paidBy: z.string().optional(),
  splitType: z.enum(["equal", "unequal", "percentage", "shares"]).optional(),
  participants: z.array(z.object({
    userId: z.string(),
    amount: z.number().int().positive().optional(),
    percentage: z.number().positive().optional(),
    shares: z.number().positive().optional(),
  })).min(1).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { expenseId } = await params;
  await connectDB();

  const expense = await Expense.findOne({ _id: expenseId, isDeleted: false })
    .populate("paidBy", "name email image")
    .populate("splits.userId", "name email image")
    .lean();

  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id;
  const isInvolved =
    expense.paidBy._id?.toString() === userId ||
    expense.splits.some((s: any) => s.userId?._id?.toString() === userId);

  if (!isInvolved) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(serializeExpense(expense));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { expenseId } = await params;
  const body = await req.json();
  const parsed = UpdateExpenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectDB();
  const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (expense.createdBy.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const d = parsed.data;

  if (d.description) expense.description = d.description;
  if (d.category) expense.category = d.category as any;
  if (d.date) expense.date = new Date(d.date);
  if (d.notes !== undefined) expense.notes = d.notes;

  if (d.participants && (d.amount || d.splitType || d.paidBy)) {
    const amount = d.amount ?? expense.amount;
    const splitType = d.splitType ?? expense.splitType;
    const paidBy = d.paidBy ?? expense.paidBy.toString();

    let splits;
    try {
      splits = calculateSplits(amount, splitType, d.participants, paidBy);
    } catch (err: unknown) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    expense.amount = amount;
    expense.splitType = splitType;
    if (d.paidBy) expense.paidBy = new Types.ObjectId(d.paidBy);
    expense.splits = splits.map((s) => ({
      userId: new Types.ObjectId(s.userId),
      amount: s.amount,
      percentage: s.percentage,
      shares: s.shares,
    })) as any;
  }

  await expense.save();

  await Activity.create({
    actorId: session.user.id,
    type: "expense_updated",
    entityType: "expense",
    entityId: expense._id,
    groupId: expense.groupId,
    involvedUsers: expense.splits.map((s) => s.userId),
    metadata: { description: expense.description, amount: expense.amount },
  });

  return NextResponse.json({ id: expense._id.toString() });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { expenseId } = await params;
  await connectDB();

  const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (expense.createdBy.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  expense.isDeleted = true;
  await expense.save();

  await Activity.create({
    actorId: session.user.id,
    type: "expense_deleted",
    entityType: "expense",
    entityId: expense._id,
    groupId: expense.groupId,
    involvedUsers: expense.splits.map((s) => s.userId),
    metadata: { description: expense.description, amount: expense.amount },
  });

  return NextResponse.json({ success: true });
}
