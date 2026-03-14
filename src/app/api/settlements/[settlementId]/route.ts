import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Settlement from "@/models/Settlement";
import Activity from "@/models/Activity";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ settlementId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { settlementId } = await params;
  await connectDB();

  const settlement = await Settlement.findById(settlementId);
  if (!settlement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (settlement.paidBy.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Activity.create({
    actorId: session.user.id,
    type: "settlement_deleted",
    entityType: "settlement",
    entityId: settlement._id,
    groupId: settlement.groupId,
    involvedUsers: [settlement.paidBy, settlement.paidTo],
    metadata: { amount: settlement.amount },
  });

  await settlement.deleteOne();
  return NextResponse.json({ success: true });
}
