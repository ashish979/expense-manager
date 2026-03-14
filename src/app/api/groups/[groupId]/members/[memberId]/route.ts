import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import Activity from "@/models/Activity";
import { Types } from "mongoose";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, memberId } = await params;
  await connectDB();

  const group = await Group.findById(groupId);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const requester = group.members.find((m) => m.userId.toString() === session.user!.id);
  if (!requester || requester.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const alreadyMember = group.members.some((m) => m.userId.toString() === memberId);
  if (alreadyMember) return NextResponse.json({ error: "Already a member" }, { status: 400 });

  group.members.push({
    userId: new Types.ObjectId(memberId),
    role: "member",
    joinedAt: new Date(),
  });
  await group.save();

  await Activity.create({
    actorId: session.user.id,
    type: "group_member_added",
    entityType: "group",
    entityId: group._id,
    groupId: group._id,
    involvedUsers: [session.user.id, memberId],
    metadata: { groupName: group.name },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, memberId } = await params;
  await connectDB();

  const group = await Group.findById(groupId);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const requester = group.members.find((m) => m.userId.toString() === session.user!.id);
  // Admin can remove anyone; members can remove themselves
  if (!requester || (requester.role !== "admin" && session.user.id !== memberId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  group.members = group.members.filter((m) => m.userId.toString() !== memberId) as typeof group.members;
  await group.save();

  await Activity.create({
    actorId: session.user.id,
    type: "group_member_removed",
    entityType: "group",
    entityId: group._id,
    groupId: group._id,
    involvedUsers: [session.user.id, memberId],
    metadata: { groupName: group.name },
  });

  return NextResponse.json({ success: true });
}
