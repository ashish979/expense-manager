import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import { Types } from "mongoose";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.enum(["home", "trip", "couple", "work", "other"]).optional(),
  simplifyDebts: z.boolean().optional(),
});

async function getGroup(groupId: string, userId: string) {
  await connectDB();
  const group = await Group.findById(groupId)
    .populate("members.userId", "name email image")
    .lean();
  if (!group) return null;

  const isMember = group.members.some(
    (m) => m.userId._id?.toString() === userId || m.userId.toString() === userId
  );
  return isMember ? group : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const group = await getGroup(groupId, session.user.id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: group._id.toString(),
    name: group.name,
    category: group.category,
    simplifyDebts: group.simplifyDebts,
    createdBy: group.createdBy.toString(),
    createdAt: (group as any).createdAt,
    members: group.members.map((m) => ({
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
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  await connectDB();

  const group = await Group.findById(groupId);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = group.members.find((m) => m.userId.toString() === session.user!.id);
  if (!member || member.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  Object.assign(group, parsed.data);
  await group.save();

  return NextResponse.json({ id: group._id.toString(), name: group.name });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  await connectDB();

  const group = await Group.findById(groupId);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = group.members.find((m) => m.userId.toString() === session.user!.id);
  if (!member || member.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await group.deleteOne();
  return NextResponse.json({ success: true });
}
