export interface SimplifiedDebt {
  from: string;
  to: string;
  amount: number; // cents
}

/**
 * Greedy min-cash-flow algorithm to minimize the number of transactions.
 * Time complexity: O(n log n) per iteration, overall O(n² log n) worst case.
 */
export function simplifyDebts(
  debts: Array<{ from: string; to: string; amount: number }>
): SimplifiedDebt[] {
  // Build net balance map
  const balance: Record<string, number> = {};

  for (const debt of debts) {
    balance[debt.from] = (balance[debt.from] ?? 0) - debt.amount;
    balance[debt.to] = (balance[debt.to] ?? 0) + debt.amount;
  }

  const result: SimplifiedDebt[] = [];

  // Split into creditors (positive) and debtors (negative)
  const getCreditors = () =>
    Object.entries(balance)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

  const getDebtors = () =>
    Object.entries(balance)
      .filter(([, v]) => v < 0)
      .sort((a, b) => a[1] - b[1]);

  let creditors = getCreditors();
  let debtors = getDebtors();

  while (creditors.length > 0 && debtors.length > 0) {
    const [creditor, credit] = creditors[0];
    const [debtor, debit] = debtors[0];

    const amount = Math.min(credit, -debit);
    result.push({ from: debtor, to: creditor, amount });

    balance[creditor] -= amount;
    balance[debtor] += amount;

    creditors = getCreditors();
    debtors = getDebtors();
  }

  return result;
}
