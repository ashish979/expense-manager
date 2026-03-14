import { simplifyDebts } from "@/lib/debt-simplification";

describe("simplifyDebts", () => {
  // ---------------------------------------------------------------------------
  // Basic cases
  // ---------------------------------------------------------------------------
  it("returns empty array for empty input", () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it("keeps a single debt unchanged", () => {
    const result = simplifyDebts([{ from: "A", to: "B", amount: 100 }]);
    expect(result).toEqual([{ from: "A", to: "B", amount: 100 }]);
  });

  // ---------------------------------------------------------------------------
  // Opposing debts
  // ---------------------------------------------------------------------------
  it("cancels two equal opposing debts", () => {
    const result = simplifyDebts([
      { from: "A", to: "B", amount: 100 },
      { from: "B", to: "A", amount: 100 },
    ]);
    expect(result).toEqual([]);
  });

  it("nets two opposing debts with different amounts", () => {
    const result = simplifyDebts([
      { from: "A", to: "B", amount: 100 },
      { from: "B", to: "A", amount: 60 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(40);
    expect(result[0].from).toBe("A");
    expect(result[0].to).toBe("B");
  });

  // ---------------------------------------------------------------------------
  // Triangle / cycle
  // ---------------------------------------------------------------------------
  it("cancels a perfect triangle (A->B, B->C, C->A all equal)", () => {
    const result = simplifyDebts([
      { from: "A", to: "B", amount: 100 },
      { from: "B", to: "C", amount: 100 },
      { from: "C", to: "A", amount: 100 },
    ]);
    expect(result).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Chain simplification
  // ---------------------------------------------------------------------------
  it("simplifies A->B->C chain to A->C", () => {
    const result = simplifyDebts([
      { from: "A", to: "B", amount: 100 },
      { from: "B", to: "C", amount: 100 },
    ]);
    // Net: A owes 100, B net 0, C is owed 100
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: "A", to: "C", amount: 100 });
  });

  // ---------------------------------------------------------------------------
  // Complex 4-person scenario
  // ---------------------------------------------------------------------------
  it("produces fewer transactions than input for 4-person scenario", () => {
    const input = [
      { from: "A", to: "B", amount: 100 },
      { from: "B", to: "C", amount: 50 },
      { from: "C", to: "D", amount: 200 },
      { from: "D", to: "A", amount: 80 },
      { from: "A", to: "C", amount: 30 },
    ];
    const result = simplifyDebts(input);
    expect(result.length).toBeLessThan(input.length);
  });

  // ---------------------------------------------------------------------------
  // Invariants
  // ---------------------------------------------------------------------------
  it("preserves net balances (all balances sum to zero)", () => {
    const input = [
      { from: "A", to: "B", amount: 300 },
      { from: "B", to: "C", amount: 150 },
      { from: "C", to: "A", amount: 50 },
      { from: "D", to: "B", amount: 200 },
    ];
    const result = simplifyDebts(input);

    // Compute net balances from result
    const balance: Record<string, number> = {};
    for (const d of result) {
      balance[d.from] = (balance[d.from] ?? 0) - d.amount;
      balance[d.to] = (balance[d.to] ?? 0) + d.amount;
    }

    // Compute expected net balances from input
    const expected: Record<string, number> = {};
    for (const d of input) {
      expected[d.from] = (expected[d.from] ?? 0) - d.amount;
      expected[d.to] = (expected[d.to] ?? 0) + d.amount;
    }

    // Net balances should match
    const allPeople = new Set([...Object.keys(balance), ...Object.keys(expected)]);
    for (const person of allPeople) {
      expect(balance[person] ?? 0).toBe(expected[person] ?? 0);
    }
  });

  it("produces at most n-1 transactions for n people", () => {
    const input = [
      { from: "A", to: "B", amount: 100 },
      { from: "B", to: "C", amount: 200 },
      { from: "C", to: "D", amount: 300 },
      { from: "D", to: "E", amount: 400 },
      { from: "E", to: "A", amount: 150 },
    ];
    const result = simplifyDebts(input);
    const people = new Set<string>();
    for (const d of input) {
      people.add(d.from);
      people.add(d.to);
    }
    // At most n-1 transactions
    expect(result.length).toBeLessThanOrEqual(people.size - 1);
  });

  it("all output amounts are positive", () => {
    const input = [
      { from: "A", to: "B", amount: 500 },
      { from: "C", to: "A", amount: 200 },
      { from: "B", to: "C", amount: 100 },
    ];
    const result = simplifyDebts(input);
    for (const d of result) {
      expect(d.amount).toBeGreaterThan(0);
    }
  });

  it("total money flowing equals sum of absolute net balances / 2", () => {
    const input = [
      { from: "A", to: "B", amount: 100 },
      { from: "B", to: "C", amount: 200 },
      { from: "C", to: "A", amount: 50 },
    ];
    const result = simplifyDebts(input);

    // Net balances from input
    const balance: Record<string, number> = {};
    for (const d of input) {
      balance[d.from] = (balance[d.from] ?? 0) - d.amount;
      balance[d.to] = (balance[d.to] ?? 0) + d.amount;
    }

    const totalAbsBalance = Object.values(balance).reduce(
      (sum, v) => sum + Math.abs(v),
      0
    );
    const totalFlowing = result.reduce((sum, d) => sum + d.amount, 0);
    // Total flowing should equal half the sum of absolute balances
    expect(totalFlowing).toBe(totalAbsBalance / 2);
  });
});
