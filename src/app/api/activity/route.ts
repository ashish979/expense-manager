import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Activity from "@/models/Activity";
import { toCSV, formatCents } from "@/lib/csv-export";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const groupId = searchParams.get("groupId");
  const exportCSV = searchParams.get("export") === "csv";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

  await connectDB();
  const userId = new Types.ObjectId(session.user.id);

  const query: Record<string, unknown> = {
    $or: [{ actorId: userId }, { involvedUsers: userId }],
  };
  if (groupId) query.groupId = new Types.ObjectId(groupId);

  const activities = await Activity.find(query)
    .sort({ createdAt: -1 })
    .skip(exportCSV ? 0 : (page - 1) * limit)
    .limit(exportCSV ? 1000 : limit)
    .populate("actorId", "name email image")
    .lean();

  if (exportCSV) {
    const rows = activities.map((a) => ({
      date: new Date((a as any).createdAt).toISOString(),
      type: a.type,
      actor: (a.actorId as any)?.name ?? "Unknown",
      entity: a.entityType,
      amount: a.metadata?.amount ? formatCents(a.metadata.amount as number) : "",
      description: a.metadata?.description ?? "",
    }));

    const csv = toCSV(rows, [
      { key: "date", header: "Date" },
      { key: "type", header: "Type" },
      { key: "actor", header: "Actor" },
      { key: "entity", header: "Entity" },
      { key: "amount", header: "Amount (₹)" },
      { key: "description", header: "Description" },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="activity-${Date.now()}.csv"`,
      },
    });
  }

  const total = await Activity.countDocuments(query);

  return NextResponse.json({
    activities: activities.map((a) => ({
      id: a._id.toString(),
      actorId: (a.actorId as any)?._id?.toString() ?? a.actorId.toString(),
      actor: (a.actorId as any)?._id ? {
        id: (a.actorId as any)._id.toString(),
        name: (a.actorId as any).name,
        email: (a.actorId as any).email,
        image: (a.actorId as any).image,
      } : undefined,
      type: a.type,
      entityType: a.entityType,
      entityId: a.entityId.toString(),
      groupId: a.groupId?.toString(),
      involvedUsers: a.involvedUsers.map((u) => u.toString()),
      metadata: a.metadata,
      createdAt: (a as any).createdAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
