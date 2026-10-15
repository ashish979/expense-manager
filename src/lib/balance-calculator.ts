import { Types } from "mongoose";

export interface Balance {
  userId: string;
  owes: Record<string, number>; // userId -> cents owed to them
  owed: Record<string, number>; // userId -> cents they owe you
  net: number; // positive = you are owed, negative = you owe
}

export interface DebtEntry {
  from: string;
  to: string;
  amount: number; // cents
}

export function calculateBalances(
  expenses: Array<{
    paidBy: string;
    splits: Array<{ userId: string; amount: number }>;
    isDeleted?: boolean;
  }>,
  settlements: Array<{
    paidBy: string;
    paidTo: string;
    amount: number;
  }>,
  userId: string
): { totalOwed: number; totalOwe: number; net: number; debts: DebtEntry[] } {
  // net[A][B] > 0 means B owes A that many cents
  const net: Record<string, Record<string, number>> = {};

  const ensure = (a: string, b: string) => {
    net[a] = net[a] ?? {};
    net[a][b] = net[a][b] ?? 0;
    net[b] = net[b] ?? {};
    net[b][a] = net[b][a] ?? 0;
  };

  for (const expense of expenses) {
    if (expense.isDeleted) continue;
    const payer = expense.paidBy.toString();
    for (const split of expense.splits) {
      const debtor = split.userId.toString();
      if (debtor === payer) continue;
      ensure(payer, debtor);
      net[payer][debtor] += split.amount;
      net[debtor][payer] -= split.amount;
    }
  }

  for (const settlement of settlements) {
    const payer = settlement.paidBy.toString();
    const receiver = settlement.paidTo.toString();
    ensure(payer, receiver);
    // payer settled debt to receiver
    net[receiver][payer] -= settlement.amount;
    net[payer][receiver] += settlement.amount;
  }

  const debts: DebtEntry[] = [];
  let totalOwed = 0;
  let totalOwe = 0;

  const processed = new Set<string>();
  for (const a of Object.keys(net)) {
    for (const b of Object.keys(net[a])) {
      const key = [a, b].sort().join("|");
      if (processed.has(key)) continue;
      processed.add(key);

      // Only pairs involving the requesting user are relevant to them.
      if (a !== userId && b !== userId) continue;

      const diff = (net[a][b] ?? 0);
      if (diff > 0) {
        debts.push({ from: b, to: a, amount: diff });
      } else if (diff < 0) {
        debts.push({ from: a, to: b, amount: -diff });
      }
    }
  }

  for (const d of debts) {
    if (d.to === userId) totalOwed += d.amount;
    if (d.from === userId) totalOwe += d.amount;
  }

  return { totalOwed, totalOwe, net: totalOwed - totalOwe, debts };
}
