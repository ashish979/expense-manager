import { calculateBalances } from "@/lib/balance-calculator";

describe("calculateBalances", () => {
  const USER = "user1";
  const FRIEND = "friend1";

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  it("returns all zeros with no expenses or settlements", () => {
    const result = calculateBalances([], [], USER);
    expect(result).toEqual({
      totalOwed: 0,
      totalOwe: 0,
      net: 0,
      debts: [],
    });
  });

  // ---------------------------------------------------------------------------
  // Single expense — user paid
  // ---------------------------------------------------------------------------
  it("shows friend owes user when user paid and split equally", () => {
    const result = calculateBalances(
      [
        {
          paidBy: USER,
          splits: [
            { userId: USER, amount: 500 },
            { userId: FRIEND, amount: 500 },
          ],
        },
      ],
      [],
      USER
    );
    // FRIEND owes USER 500 (the friend's share)
    expect(result.totalOwed).toBe(500);
    expect(result.totalOwe).toBe(0);
    expect(result.net).toBe(500);
    expect(result.debts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: FRIEND, to: USER, amount: 500 }),
      ])
    );
  });

  // ---------------------------------------------------------------------------
  // Single expense — friend paid
  // ---------------------------------------------------------------------------
  it("shows user owes friend when friend paid and user is in split", () => {
    const result = calculateBalances(
      [
        {
          paidBy: FRIEND,
          splits: [
            { userId: USER, amount: 300 },
            { userId: FRIEND, amount: 700 },
          ],
        },
      ],
      [],
      USER
    );
    // USER owes FRIEND 300 (user's share of expense friend paid)
    expect(result.totalOwe).toBe(300);
    expect(result.totalOwed).toBe(0);
    expect(result.net).toBe(-300);
  });

  // ---------------------------------------------------------------------------
  // Deleted expense
  // ---------------------------------------------------------------------------
  it("ignores deleted expenses", () => {
    const result = calculateBalances(
      [
        {
          paidBy: USER,
          splits: [
            { userId: USER, amount: 500 },
            { userId: FRIEND, amount: 500 },
          ],
          isDeleted: true,
        },
      ],
      [],
      USER
    );
    expect(result.totalOwed).toBe(0);
    expect(result.totalOwe).toBe(0);
    expect(result.net).toBe(0);
    expect(result.debts).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Settlements
  // ---------------------------------------------------------------------------
  it("settlement reduces outstanding debt", () => {
    const result = calculateBalances(
      [
        {
          paidBy: USER,
          splits: [
            { userId: USER, amount: 500 },
            { userId: FRIEND, amount: 500 },
          ],
        },
      ],
      [{ paidBy: FRIEND, paidTo: USER, amount: 200 }],
      USER
    );
    // Friend owed 500, settled 200 => still owes 300
    expect(result.totalOwed).toBe(300);
    expect(result.totalOwe).toBe(0);
    expect(result.net).toBe(300);
  });

  it("settlement fully clears debt", () => {
    const result = calculateBalances(
      [
        {
          paidBy: USER,
          splits: [
            { userId: USER, amount: 500 },
            { userId: FRIEND, amount: 500 },
          ],
        },
      ],
      [{ paidBy: FRIEND, paidTo: USER, amount: 500 }],
      USER
    );
    expect(result.totalOwed).toBe(0);
    expect(result.totalOwe).toBe(0);
    expect(result.net).toBe(0);
    expect(result.debts).toEqual([]);
  });

  it("overpayment settlement reverses debt direction", () => {
    const result = calculateBalances(
      [
        {
          paidBy: USER,
          splits: [
            { userId: USER, amount: 500 },
            { userId: FRIEND, amount: 500 },
          ],
        },
      ],
      [{ paidBy: FRIEND, paidTo: USER, amount: 700 }],
      USER
    );
    // Friend owed 500 but paid 700 => user now owes friend 200
    expect(result.totalOwe).toBe(200);
    expect(result.totalOwed).toBe(0);
    expect(result.net).toBe(-200);
  });

  // ---------------------------------------------------------------------------
  // Multiple expenses between same users
  // ---------------------------------------------------------------------------
  it("nets multiple expenses between the same two users", () => {
    const result = calculateBalances(
      [
        {
          paidBy: USER,
          splits: [
            { userId: USER, amount: 400 },
            { userId: FRIEND, amount: 600 },
          ],
        },
        {
          paidBy: FRIEND,
          splits: [
            { userId: USER, amount: 200 },
            { userId: FRIEND, amount: 300 },
          ],
        },
      ],
      [],
      USER
    );
    // Expense 1: FRIEND owes USER 600
    // Expense 2: USER owes FRIEND 200
    // Net: FRIEND owes USER 400
    expect(result.totalOwed).toBe(400);
    expect(result.totalOwe).toBe(0);
    expect(result.net).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // net = totalOwed - totalOwe
  // ---------------------------------------------------------------------------
  it("net always equals totalOwed - totalOwe", () => {
    const FRIEND2 = "friend2";
    const result = calculateBalances(
      [
        {
          paidBy: USER,
          splits: [
            { userId: USER, amount: 300 },
            { userId: FRIEND, amount: 700 },
          ],
        },
        {
          paidBy: FRIEND2,
          splits: [
            { userId: USER, amount: 400 },
            { userId: FRIEND2, amount: 600 },
          ],
        },
      ],
      [],
      USER
    );
    // FRIEND owes USER 700
    // USER owes FRIEND2 400
    expect(result.totalOwed).toBe(700);
    expect(result.totalOwe).toBe(400);
    expect(result.net).toBe(result.totalOwed - result.totalOwe);
    expect(result.net).toBe(300);
  });

  // ---------------------------------------------------------------------------
  // Three-person scenario
  // ---------------------------------------------------------------------------
  it("handles three-person expense correctly", () => {
    const FRIEND2 = "friend2";
    const result = calculateBalances(
      [
        {
          paidBy: USER,
          splits: [
            { userId: USER, amount: 100 },
            { userId: FRIEND, amount: 100 },
            { userId: FRIEND2, amount: 100 },
          ],
        },
      ],
      [],
      USER
    );
    // FRIEND owes USER 100, FRIEND2 owes USER 100
    expect(result.totalOwed).toBe(200);
    expect(result.totalOwe).toBe(0);
    expect(result.net).toBe(200);
    expect(result.debts).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // Payer's own split is not a debt
  // ---------------------------------------------------------------------------
  it("does not count payer's own split as a debt", () => {
    const result = calculateBalances(
      [
        {
          paidBy: USER,
          splits: [{ userId: USER, amount: 1000 }],
        },
      ],
      [],
      USER
    );
    expect(result.totalOwed).toBe(0);
    expect(result.totalOwe).toBe(0);
    expect(result.debts).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Debts only include pairs involving the requesting user
  // ---------------------------------------------------------------------------
  it("excludes debts between other users and nets one entry per person", () => {
    const F2 = "friend2";
    const result = calculateBalances(
      [
        // Two separate expenses (e.g. different groups) with the same friend
        { paidBy: USER, splits: [{ userId: USER, amount: 500 }, { userId: FRIEND, amount: 500 }] },
        { paidBy: USER, splits: [{ userId: USER, amount: 300 }, { userId: FRIEND, amount: 300 }] },
        // Unrelated to USER: FRIEND owes F2
        { paidBy: F2, splits: [{ userId: F2, amount: 700 }, { userId: FRIEND, amount: 700 }] },
      ],
      [],
      USER
    );
    expect(result.debts).toEqual([{ from: FRIEND, to: USER, amount: 800 }]);
    expect(result.totalOwed).toBe(800);
    expect(result.totalOwe).toBe(0);
  });
});
