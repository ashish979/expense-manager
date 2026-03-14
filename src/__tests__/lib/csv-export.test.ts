import { toCSV, formatCents } from "@/lib/csv-export";

describe("formatCents", () => {
  it("formats 0 cents as 0.00", () => {
    expect(formatCents(0)).toBe("0.00");
  });

  it("formats 100 cents as 1.00", () => {
    expect(formatCents(100)).toBe("1.00");
  });

  it("formats 1250 cents as 12.50", () => {
    expect(formatCents(1250)).toBe("12.50");
  });

  it("formats 1 cent as 0.01", () => {
    expect(formatCents(1)).toBe("0.01");
  });

  it("formats 99 cents as 0.99", () => {
    expect(formatCents(99)).toBe("0.99");
  });

  it("formats negative cents correctly", () => {
    expect(formatCents(-500)).toBe("-5.00");
  });

  it("formats large amounts", () => {
    expect(formatCents(1000000)).toBe("10000.00");
  });
});

describe("toCSV", () => {
  const columns = [
    { key: "name", header: "Name" },
    { key: "amount", header: "Amount" },
    { key: "date", header: "Date" },
  ];

  it("returns only header row for empty rows array", () => {
    const result = toCSV([], columns);
    expect(result).toBe('"Name","Amount","Date"');
  });

  it("generates correct CSV for a single row with all fields", () => {
    const rows = [{ name: "Dinner", amount: 2500, date: "2024-01-15" }];
    const result = toCSV(rows, columns);
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('"Name","Amount","Date"');
    expect(lines[1]).toBe('"Dinner","2500","2024-01-15"');
  });

  it("renders null values as empty strings", () => {
    const rows = [{ name: "Lunch", amount: null, date: "2024-01-15" }];
    const result = toCSV(rows, columns);
    const lines = result.split("\n");
    expect(lines[1]).toBe('"Lunch",,"2024-01-15"');
  });

  it("renders undefined (missing key) values as empty strings", () => {
    const rows = [{ name: "Coffee" }]; // amount and date missing
    const result = toCSV(rows, columns);
    const lines = result.split("\n");
    expect(lines[1]).toBe('"Coffee",,');
  });

  it("handles values containing commas via JSON.stringify escaping", () => {
    const rows = [{ name: "Dinner, drinks", amount: 5000, date: "2024-01-15" }];
    const result = toCSV(rows, columns);
    const lines = result.split("\n");
    // JSON.stringify wraps in quotes and the value already contains a comma
    expect(lines[1]).toContain('"Dinner, drinks"');
  });

  it("handles values containing double quotes via JSON.stringify escaping", () => {
    const rows = [{ name: 'The "Grand" Hotel', amount: 10000, date: "2024-01-15" }];
    const result = toCSV(rows, columns);
    const lines = result.split("\n");
    // JSON.stringify escapes internal quotes: "The \"Grand\" Hotel"
    expect(lines[1]).toContain('\\"Grand\\"');
  });

  it("generates multiple rows correctly", () => {
    const rows = [
      { name: "Dinner", amount: 2500, date: "2024-01-15" },
      { name: "Taxi", amount: 1200, date: "2024-01-16" },
      { name: "Groceries", amount: 4500, date: "2024-01-17" },
    ];
    const result = toCSV(rows, columns);
    const lines = result.split("\n");
    expect(lines).toHaveLength(4); // 1 header + 3 data rows
  });

  it("converts non-string values to strings", () => {
    const rows = [{ name: 123, amount: true, date: "2024-01-15" }];
    const result = toCSV(rows, columns);
    const lines = result.split("\n");
    expect(lines[1]).toBe('"123","true","2024-01-15"');
  });

  it("handles headers with special characters", () => {
    const specialColumns = [
      { key: "a", header: 'Col "A"' },
      { key: "b", header: "Col, B" },
    ];
    const rows = [{ a: "x", b: "y" }];
    const result = toCSV(rows, specialColumns);
    const header = result.split("\n")[0];
    // Headers are JSON.stringify'd so quotes and commas are escaped
    expect(header).toContain('\\"A\\"');
    expect(header).toContain("Col, B");
  });
});
