export function toCSV(
  rows: Record<string, unknown>[],
  columns: { key: string; header: string }[]
): string {
  const header = columns.map((c) => JSON.stringify(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return "";
        return JSON.stringify(String(val));
      })
      .join(",")
  );
  return [header, ...body].join("\n");
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
