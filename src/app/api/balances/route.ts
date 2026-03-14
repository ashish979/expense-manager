import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import Settlement from "@/models/Settlement";
import { calculateBalances } from "@/lib/balance-calculator";
import { simplifyDebts } from "@/lib/debt-simplification";
import User from "@/models/User";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groupId = req.nextUrl.searchParams.get("groupId");
  await connectDB();

  const userId = new Types.ObjectId(session.user.id);

  const expenseQuery: Record<string, unknown> = {
    isDeleted: false,
    $or: [{ paidBy: userId }, { "splits.userId": userId }],
  };
  if (groupId) expenseQuery.groupId = new Types.ObjectId(groupId);

  const settlementQuery: Record<string, unknown> = {
    $or: [{ paidBy: userId }, { paidTo: userId }],
  };
  if (groupId) settlementQuery.groupId = new Types.ObjectId(groupId);

  const [expenses, settlements] = await Promise.all([
    Expense.find(expenseQuery).lean(),
    Settlement.find(settlementQuery).lean(),
  ]);

  const { totalOwed, totalOwe, net, debts } = calculateBalances(
    expenses.map((e) => ({
      paidBy: e.paidBy.toString(),
      splits: e.splits.map((s) => ({ userId: s.userId.toString(), amount: s.amount })),
      isDeleted: e.isDeleted,
    })),
    settlements.map((s) => ({
      paidBy: s.paidBy.toString(),
      paidTo: s.paidTo.toString(),
      amount: s.amount,
    })),
    session.user.id
  );

  // Get simplified debts if groupId provided
  let simplified = null;
  if (groupId) {
    const allExpenses = await Expense.find({ groupId: new Types.ObjectId(groupId), isDeleted: false }).lean();
    const allSettlements = await Settlement.find({ groupId: new Types.ObjectId(groupId) }).lean();

    const allUserIds = new Set<string>();
    for (const e of allExpenses) {
      allUserIds.add(e.paidBy.toString());
      e.splits.forEach((s) => allUserIds.add(s.userId.toString()));
    }

    // Build full balance for group
    const groupBalance = new Map<string, Map<string, number>>();
    const ensure = (a: string, b: string) => {
      if (!groupBalance.has(a)) groupBalance.set(a, new Map());
      if (!groupBalance.get(a)!.has(b)) groupBalance.get(a)!.set(b, 0);
    };

    for (const e of allExpenses) {
      const payer = e.paidBy.toString();
      for (const split of e.splits) {
        const debtor = split.userId.toString();
        if (debtor === payer) continue;
        ensure(payer, debtor);
        ensure(debtor, payer);
        groupBalance.get(payer)!.set(debtor, groupBalance.get(payer)!.get(debtor)! + split.amount);
        groupBalance.get(debtor)!.set(payer, groupBalance.get(debtor)!.get(payer)! - split.amount);
      }
    }

    for (const s of allSettlements) {
      const payer = s.paidBy.toString();
      const receiver = s.paidTo.toString();
      ensure(payer, receiver);
      ensure(receiver, payer);
      groupBalance.get(receiver)!.set(payer, (groupBalance.get(receiver)!.get(payer) ?? 0) - s.amount);
      groupBalance.get(payer)!.set(receiver, (groupBalance.get(payer)!.get(receiver) ?? 0) + s.amount);
    }

    const rawDebts: { from: string; to: string; amount: number }[] = [];
    const processed = new Set<string>();
    for (const [a, bMap] of groupBalance) {
      for (const [b, diff] of bMap) {
        const key = [a, b].sort().join("|");
        if (processed.has(key)) continue;
        processed.add(key);
        if (diff > 0) rawDebts.push({ from: b, to: a, amount: diff });
        else if (diff < 0) rawDebts.push({ from: a, to: b, amount: -diff });
      }
    }

    simplified = simplifyDebts(rawDebts);

    // Enrich with user info
    const involvedIds = [...new Set(simplified.flatMap((d) => [d.from, d.to]))];
    const users = await User.find({ _id: { $in: involvedIds } }).lean();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), { id: u._id.toString(), name: u.name, email: u.email, image: u.image }]));

    simplified = simplified.map((d) => ({
      ...d,
      fromUser: userMap[d.from],
      toUser: userMap[d.to],
    }));
  }

  // Enrich debts with user info
  const debtUserIds = [...new Set(debts.flatMap((d) => [d.from, d.to]))];
  const debtUsers = await User.find({ _id: { $in: debtUserIds } }).lean();
  const debtUserMap = Object.fromEntries(debtUsers.map((u) => [u._id.toString(), { id: u._id.toString(), name: u.name, email: u.email, image: u.image }]));

  return NextResponse.json({
    totalOwed,
    totalOwe,
    net,
    debts: debts.map((d) => ({ ...d, fromUser: debtUserMap[d.from], toUser: debtUserMap[d.to] })),
    simplified,
  });
}
