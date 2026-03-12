export type DiffLine = {
  type: "add" | "remove" | "same";
  line: string;
};

export interface DiffResult {
  lines: DiffLine[];
  unified: string;
}

function lcsTable(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  return table;
}

function backtrackDiff(a: string[], b: string[], table: number[][]): DiffLine[] {
  const lines: DiffLine[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lines.push({ type: "same", line: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      lines.push({ type: "remove", line: a[i - 1] });
      i -= 1;
    } else {
      lines.push({ type: "add", line: b[j - 1] });
      j -= 1;
    }
  }

  while (i > 0) {
    lines.push({ type: "remove", line: a[i - 1] });
    i -= 1;
  }

  while (j > 0) {
    lines.push({ type: "add", line: b[j - 1] });
    j -= 1;
  }

  return lines.reverse();
}

function formatUnified(lines: DiffLine[]): string {
  return lines
    .map((entry) => {
      const prefix = entry.type === "add" ? "+" : entry.type === "remove" ? "-" : " ";
      return `${prefix}${entry.line}`;
    })
    .join("\n");
}

export function diffPrompt(original: string, updated: string): DiffResult {
  const a = original.split(/\r?\n/);
  const b = updated.split(/\r?\n/);
  const table = lcsTable(a, b);
  const lines = backtrackDiff(a, b, table);
  return {
    lines,
    unified: formatUnified(lines)
  };
}
