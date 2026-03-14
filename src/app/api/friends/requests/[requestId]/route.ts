import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import FriendRequest from "@/models/FriendRequest";
import Friendship from "@/models/Friendship";
import Activity from "@/models/Activity";
import { Types } from "mongoose";
import { z } from "zod";

const PatchSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const request = await FriendRequest.findById(requestId);
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (request.to.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (request.status !== "pending") {
    return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  }

  if (parsed.data.action === "accept") {
    request.status = "accepted";
    await request.save();

    // Create sorted friendship
    const users = [request.from, request.to].sort() as [Types.ObjectId, Types.ObjectId];
    await Friendship.create({ users });

    // Log activity
    await Activity.create({
      actorId: session.user.id,
      type: "friend_added",
      entityType: "friendship",
      entityId: request._id,
      involvedUsers: [request.from, request.to],
      metadata: {},
    });
  } else {
    request.status = "rejected";
    await request.save();
  }

  return NextResponse.json({ status: request.status });
}
