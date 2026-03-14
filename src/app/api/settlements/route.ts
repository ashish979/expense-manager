import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Settlement from "@/models/Settlement";
import Activity from "@/models/Activity";
import { Types } from "mongoose";
import { z } from "zod";

const CreateSettlementSchema = z.object({
  paidTo: z.string(),
  amount: z.number().int().positive(),
  groupId: z.string().optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groupId = req.nextUrl.searchParams.get("groupId");
  await connectDB();

  const userId = new Types.ObjectId(session.user.id);
  const query: Record<string, unknown> = {
    $or: [{ paidBy: userId }, { paidTo: userId }],
  };
  if (groupId) query.groupId = new Types.ObjectId(groupId);

  const settlements = await Settlement.find(query)
    .sort({ date: -1 })
    .populate("paidBy", "name email image")
    .populate("paidTo", "name email image")
    .lean();

  return NextResponse.json(
    settlements.map((s) => ({
      id: s._id.toString(),
      paidBy: (s.paidBy as any)._id?.toString() ?? s.paidBy.toString(),
      paidByUser: (s.paidBy as any)._id ? { id: (s.paidBy as any)._id.toString(), name: (s.paidBy as any).name, email: (s.paidBy as any).email, image: (s.paidBy as any).image } : undefined,
      paidTo: (s.paidTo as any)._id?.toString() ?? s.paidTo.toString(),
      paidToUser: (s.paidTo as any)._id ? { id: (s.paidTo as any)._id.toString(), name: (s.paidTo as any).name, email: (s.paidTo as any).email, image: (s.paidTo as any).image } : undefined,
      amount: s.amount,
      groupId: s.groupId?.toString(),
      date: s.date,
      notes: s.notes,
      createdAt: (s as any).createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSettlementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectDB();
  const d = parsed.data;

  const settlement = await Settlement.create({
    paidBy: new Types.ObjectId(session.user.id),
    paidTo: new Types.ObjectId(d.paidTo),
    amount: d.amount,
    groupId: d.groupId ? new Types.ObjectId(d.groupId) : undefined,
    date: d.date ? new Date(d.date) : new Date(),
    notes: d.notes,
  });

  await Activity.create({
    actorId: session.user.id,
    type: "settlement_created",
    entityType: "settlement",
    entityId: settlement._id,
    groupId: d.groupId ? new Types.ObjectId(d.groupId) : undefined,
    involvedUsers: [session.user.id, d.paidTo],
    metadata: { amount: d.amount },
  });

  return NextResponse.json({ id: settlement._id.toString() }, { status: 201 });
}
