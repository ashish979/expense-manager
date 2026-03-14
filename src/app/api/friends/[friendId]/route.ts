import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Friendship from "@/models/Friendship";
import { Types } from "mongoose";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendId } = await params;
  await connectDB();

  const friendship = await Friendship.findById(friendId);
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = new Types.ObjectId(session.user.id);
  if (!friendship.users.some((u) => u.equals(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await friendship.deleteOne();
  return NextResponse.json({ success: true });
}
