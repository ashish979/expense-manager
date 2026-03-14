import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Friendship from "@/models/Friendship";
import User from "@/models/User";
import Activity from "@/models/Activity";
import { Types } from "mongoose";
import { z } from "zod";

const AddFriendSchema = z.object({
  email: z.string().email(),
});

// GET /api/friends — list current user's friends
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = new Types.ObjectId(session.user.id);

  const friendships = await Friendship.find({ users: userId })
    .populate("users", "name email image currency")
    .lean();

  const friends = friendships.map((f) => {
    const other = f.users.find((u) => u._id.toString() !== session.user!.id) as any;
    return {
      id: f._id.toString(),
      user: {
        id: other._id.toString(),
        name: other.name,
        email: other.email,
        image: other.image,
        currency: other.currency,
      },
      createdAt: (f as any).createdAt,
    };
  });

  return NextResponse.json(friends);
}

// POST /api/friends — directly add a friend by email
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = AddFriendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const currentUserId = new Types.ObjectId(session.user.id);
  const targetUser = await User.findOne({ email: parsed.data.email.toLowerCase() }).lean();
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const targetUserId = targetUser._id as Types.ObjectId;
  if (currentUserId.equals(targetUserId)) {
    return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  // Check already friends
  const existing = await Friendship.findOne({ users: { $all: [currentUserId, targetUserId] } }).lean();
  if (existing) return NextResponse.json({ error: "Already friends" }, { status: 400 });

  // Sort user IDs for consistent storage
  const sortedUsers = [currentUserId, targetUserId].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  ) as [Types.ObjectId, Types.ObjectId];

  const friendship = await Friendship.create({ users: sortedUsers });

  // Create activity entry
  await Activity.create({
    actorId: currentUserId,
    type: "friend_added",
    entityType: "friendship",
    entityId: friendship._id,
    involvedUsers: [currentUserId, targetUserId],
    metadata: { friendEmail: parsed.data.email.toLowerCase() },
  });

  return NextResponse.json(
    {
      id: friendship._id.toString(),
      user: {
        id: (targetUser._id as Types.ObjectId).toString(),
        name: (targetUser as any).name,
        email: (targetUser as any).email,
        image: (targetUser as any).image,
        currency: (targetUser as any).currency,
      },
      createdAt: (friendship as any).createdAt,
    },
    { status: 201 }
  );
}
