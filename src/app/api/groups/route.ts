import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import Activity from "@/models/Activity";
import { Types } from "mongoose";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["home", "trip", "couple", "work", "other"]).default("other"),
  memberIds: z.array(z.string()).optional(),
  simplifyDebts: z.boolean().default(false),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = new Types.ObjectId(session.user.id);

  const groups = await Group.find({ "members.userId": userId })
    .populate("members.userId", "name email image")
    .lean();

  return NextResponse.json(
    groups.map((g) => ({
      id: g._id.toString(),
      name: g.name,
      category: g.category,
      simplifyDebts: g.simplifyDebts,
      createdBy: g.createdBy.toString(),
      createdAt: (g as any).createdAt,
      members: g.members.map((m) => ({
        userId: (m.userId as any)._id?.toString() ?? m.userId.toString(),
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.userId && typeof m.userId === "object" && "_id" in m.userId
          ? {
              id: (m.userId as any)._id.toString(),
              name: (m.userId as any).name,
              email: (m.userId as any).email,
              image: (m.userId as any).image,
            }
          : undefined,
      })),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const creatorId = new Types.ObjectId(session.user.id);

  const members = [
    { userId: creatorId, role: "admin" as const, joinedAt: new Date() },
    ...(parsed.data.memberIds ?? []).map((id) => ({
      userId: new Types.ObjectId(id),
      role: "member" as const,
      joinedAt: new Date(),
    })),
  ];

  const group = await Group.create({
    name: parsed.data.name,
    category: parsed.data.category,
    simplifyDebts: parsed.data.simplifyDebts,
    createdBy: creatorId,
    members,
  });

  await Activity.create({
    actorId: creatorId,
    type: "group_created",
    entityType: "group",
    entityId: group._id,
    involvedUsers: members.map((m) => m.userId),
    metadata: { groupName: group.name },
  });

  return NextResponse.json({ id: group._id.toString(), name: group.name }, { status: 201 });
}
