import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

// Dev/demo only: signs in as the seeded demo user without Google OAuth.
// Disabled (404) unless DEMO_MODE=true. Never enable in production.
export async function GET(req: NextRequest) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectDB();
  const db = mongoose.connection.db!;
  const email = process.env.DEMO_USER_EMAIL ?? "aarav@example.com";
  const user = await db.collection("users").findOne({ email });
  if (!user) {
    return NextResponse.json(
      { error: `Demo user ${email} not found. Run: node scripts/seed-demo.mjs` },
      { status: 404 }
    );
  }

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.collection("sessions").insertOne({ sessionToken, userId: user._id, expires });

  const secure = req.nextUrl.protocol === "https:";
  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires,
  });
  return res;
}
