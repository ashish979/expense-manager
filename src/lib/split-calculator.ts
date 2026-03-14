export interface SplitInput {
  userId: string;
  amount?: number;      // for unequal (cents)
  percentage?: number;  // for percentage
  shares?: number;      // for shares
}

export interface SplitResult {
  userId: string;
  amount: number;       // cents
  percentage?: number;
  shares?: number;
}

export function calculateSplits(
  totalCents: number,
  splitType: "equal" | "unequal" | "percentage" | "shares",
  participants: SplitInput[],
  payerId: string
): SplitResult[] {
  if (participants.length === 0) throw new Error("No participants");

  switch (splitType) {
    case "equal": {
      const base = Math.floor(totalCents / participants.length);
      const remainder = totalCents - base * participants.length;
      return participants.map((p, i) => ({
        userId: p.userId,
        amount: i === 0 && p.userId === payerId ? base + remainder : base,
      }));
    }

    case "unequal": {
      const sum = participants.reduce((acc, p) => acc + (p.amount ?? 0), 0);
      if (sum !== totalCents) throw new Error(`Unequal splits sum (${sum}) must equal total (${totalCents})`);
      return participants.map((p) => ({ userId: p.userId, amount: p.amount! }));
    }

    case "percentage": {
      const totalPct = participants.reduce((acc, p) => acc + (p.percentage ?? 0), 0);
      if (Math.abs(totalPct - 100) > 0.01) throw new Error(`Percentages must sum to 100 (got ${totalPct})`);

      const results: SplitResult[] = participants.map((p) => ({
        userId: p.userId,
        amount: Math.floor((p.percentage! / 100) * totalCents),
        percentage: p.percentage,
      }));

      // Add remainder to payer
      const distributed = results.reduce((acc, r) => acc + r.amount, 0);
      const remainder = totalCents - distributed;
      const payerResult = results.find((r) => r.userId === payerId) ?? results[0];
      payerResult.amount += remainder;

      return results;
    }

    case "shares": {
      const totalShares = participants.reduce((acc, p) => acc + (p.shares ?? 0), 0);
      if (totalShares === 0) throw new Error("Total shares cannot be zero");

      const results: SplitResult[] = participants.map((p) => ({
        userId: p.userId,
        amount: Math.floor(((p.shares ?? 0) / totalShares) * totalCents),
        shares: p.shares,
      }));

      const distributed = results.reduce((acc, r) => acc + r.amount, 0);
      const remainder = totalCents - distributed;
      const payerResult = results.find((r) => r.userId === payerId) ?? results[0];
      payerResult.amount += remainder;

      return results;
    }
  }
}
