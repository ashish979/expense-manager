import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import Activity from "@/models/Activity";
import { calculateSplits } from "@/lib/split-calculator";
import { Types } from "mongoose";
import { z } from "zod";

const SplitInputSchema = z.object({
  userId: z.string(),
  amount: z.number().int().positive().optional(),
  percentage: z.number().positive().optional(),
  shares: z.number().positive().optional(),
});

const CreateExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(), // cents
  category: z.enum(["food", "transport", "accommodation", "entertainment", "utilities", "shopping", "health", "other"]).default("other"),
  date: z.string().datetime().optional(),
  groupId: z.string().optional(),
  paidBy: z.string(),
  splitType: z.enum(["equal", "unequal", "percentage", "shares"]),
  participants: z.array(SplitInputSchema).min(1),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const groupId = searchParams.get("groupId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  await connectDB();
  const userId = new Types.ObjectId(session.user.id);

  const query: Record<string, unknown> = {
    isDeleted: false,
    $or: [{ paidBy: userId }, { "splits.userId": userId }],
  };
  if (groupId) query.groupId = new Types.ObjectId(groupId);

  const [expenses, total] = await Promise.all([
    Expense.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("paidBy", "name email image")
      .populate("splits.userId", "name email image")
      .lean(),
    Expense.countDocuments(query),
  ]);

  return NextResponse.json({
    expenses: expenses.map(serializeExpense),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateExpenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  let splits;
  try {
    splits = calculateSplits(d.amount, d.splitType, d.participants, d.paidBy);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  await connectDB();

  const expense = await Expense.create({
    description: d.description,
    amount: d.amount,
    category: d.category,
    date: d.date ? new Date(d.date) : new Date(),
    groupId: d.groupId ? new Types.ObjectId(d.groupId) : undefined,
    paidBy: new Types.ObjectId(d.paidBy),
    splitType: d.splitType,
    splits: splits.map((s) => ({
      userId: new Types.ObjectId(s.userId),
      amount: s.amount,
      percentage: s.percentage,
      shares: s.shares,
    })),
    notes: d.notes,
    createdBy: new Types.ObjectId(session.user.id),
  });

  await Activity.create({
    actorId: session.user.id,
    type: "expense_created",
    entityType: "expense",
    entityId: expense._id,
    groupId: d.groupId ? new Types.ObjectId(d.groupId) : undefined,
    involvedUsers: splits.map((s) => new Types.ObjectId(s.userId)),
    metadata: { description: d.description, amount: d.amount },
  });

  return NextResponse.json({ id: expense._id.toString() }, { status: 201 });
}

export function serializeExpense(e: any) {
  return {
    id: e._id.toString(),
    description: e.description,
    amount: e.amount,
    category: e.category,
    date: e.date,
    groupId: e.groupId?.toString(),
    paidBy: e.paidBy?._id?.toString() ?? e.paidBy?.toString(),
    paidByUser: e.paidBy?._id ? {
      id: e.paidBy._id.toString(),
      name: e.paidBy.name,
      email: e.paidBy.email,
      image: e.paidBy.image,
    } : undefined,
    splitType: e.splitType,
    splits: e.splits.map((s: any) => ({
      userId: s.userId?._id?.toString() ?? s.userId?.toString(),
      amount: s.amount,
      percentage: s.percentage,
      shares: s.shares,
      user: s.userId?._id ? {
        id: s.userId._id.toString(),
        name: s.userId.name,
        email: s.userId.email,
        image: s.userId.image,
      } : undefined,
    })),
    notes: e.notes,
    isDeleted: e.isDeleted,
    createdBy: e.createdBy?.toString(),
    createdAt: e.createdAt,
  };
}
