/**
 * Minimal markdown renderer for AI assistant output.
 *
 * Supports:
 *   - **bold** inline
 *   - - / * bullet lists
 *   - 1. numbered lists
 *   - ## / ### headings
 *   - | pipe tables (with separator row)
 *   - Empty lines as vertical spacers
 *
 * No external dependency. No em dashes pass through (safety-net replace).
 * No dangerouslySetInnerHTML. All output is React nodes.
 */

import { Fragment } from "react";

function renderInline(text: string): React.ReactNode {
  // Strip em dashes (safety net in case the model ignores the system prompt)
  const safe = text.replace(/—/g, ", ");
  const parts = safe.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      // biome-ignore lint/suspicious/noArrayIndexKey: inline split is stable
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // biome-ignore lint/suspicious/noArrayIndexKey: inline split is stable
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function renderTable(lines: string[]): React.ReactNode {
  if (lines.length < 3) return null; // need header + separator + at least one data row

  const parseRow = (line: string): string[] =>
    line
      .split("|")
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      .map((c) => c.trim());

  const headerLine = lines[0] ?? "";
  const headers = parseRow(headerLine);
  // lines[1] is the separator row; skip it
  const rows = lines.slice(2).map((l) => parseRow(l));

  return (
    <div className="my-2 overflow-x-auto rounded border border-border text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-muted">
            {headers.map((h, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: table column order is static
              <th key={i} className="border-b border-border px-3 py-1.5 text-left font-semibold text-foreground">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: table row order is static
            <tr key={ri} className="border-b border-border/50 last:border-0 hover:bg-surface-muted/50">
              {row.map((cell, ci) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: table cell order is static
                <td key={ci} className="px-3 py-1.5 text-muted-foreground">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarkdownContent({ content }: { content: string }) {
  // Safety net: strip em dashes before splitting lines
  const safe = content.replace(/—/g, ", ");
  const lines = safe.split("\n");
  const nodes: React.ReactNode[] = [];
  const total = lines.length;

  let i = 0;
  while (i < total) {
    const line = lines[i] ?? "";
    const nextLine = lines[i + 1] ?? "";

    // Pipe table: current line starts with | and next line is a separator
    if (line.startsWith("|") && /^\|[\s\-:|]+\|/.test(nextLine)) {
      const tableLines: string[] = [];
      while (i < total) {
        const tl = lines[i] ?? "";
        if (!tl.startsWith("|")) break;
        tableLines.push(tl);
        i++;
      }
      nodes.push(
        <Fragment key={`table-${i}`}>{renderTable(tableLines)}</Fragment>,
      );
      continue;
    }

    // Bullet list (- or *)
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < total) {
        const bl = lines[i] ?? "";
        if (!/^[-*] /.test(bl)) break;
        items.push(bl.slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1.5 list-disc space-y-0.5 pl-4">
          {items.map((item, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: list item order is stable
            <li key={j} className="text-sm leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < total) {
        const nl = lines[i] ?? "";
        if (!/^\d+\. /.test(nl)) break;
        items.push(nl.replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="my-1.5 list-decimal space-y-0.5 pl-4">
          {items.map((item, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: list item order is stable
            <li key={j} className="text-sm leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Headings (# / ## / ###)
    if (/^#{1,3} /.test(line)) {
      const level = (line.match(/^#+/) ?? [""])[0].length;
      const text = line.replace(/^#+\s/, "");
      const cls =
        level === 1
          ? "text-base font-bold mt-3 mb-1 text-foreground"
          : level === 2
            ? "text-sm font-semibold mt-2.5 mb-1 text-foreground"
            : "text-sm font-medium mt-2 mb-0.5 text-foreground";
      nodes.push(
        <p key={`h-${i}`} className={cls}>
          {renderInline(text)}
        </p>,
      );
      i++;
      continue;
    }

    // Empty line
    if (!line.trim()) {
      nodes.push(<div key={`sp-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Regular paragraph line
    nodes.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>,
    );
    i++;
  }

  return <>{nodes}</>;
}
