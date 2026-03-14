import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import FriendRequest from "@/models/FriendRequest";
import { Types } from "mongoose";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = new Types.ObjectId(session.user.id);

  const requests = await FriendRequest.find({
    $or: [{ from: userId }, { to: userId }],
    status: "pending",
  })
    .populate("from", "name email image")
    .populate("to", "name email image")
    .lean();

  return NextResponse.json(
    requests.map((r) => ({
      id: r._id.toString(),
      from: { id: (r.from as any)._id.toString(), name: (r.from as any).name, email: (r.from as any).email, image: (r.from as any).image },
      to: { id: (r.to as any)._id.toString(), name: (r.to as any).name, email: (r.to as any).email, image: (r.to as any).image },
      status: r.status,
      createdAt: r.createdAt,
    }))
  );
}
