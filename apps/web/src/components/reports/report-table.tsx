"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SortHeader } from "@/components/ui/list-toolbar";
import type { Sorting } from "@/lib/list";
import { cn } from "@/lib/utils";

export type Cell = string | number | null;

/** One column of a report table: how to sort it, show it, export it and total it. */
export interface Column<R> {
  key: string;
  label: string;
  /** Sort value (nulls sort last). Also the Excel value unless `csv` is given. */
  value: (row: R) => Cell;
  /** Screen cell; defaults to the value. */
  cell?: (row: R) => ReactNode;
  csv?: (row: R) => Cell;
  /** Figures: end-aligned, tabular digits. */
  numeric?: boolean;
  /** The totals row. */
  total?: Cell;
  sortable?: boolean;
}

export interface TableSpec<R> {
  columns: Column<R>[];
  /** In the table's neutral order. */
  rows: R[];
  rowKey: (row: R) => string;
  rowHref?: (row: R) => string | undefined;
  /** Dimmed rows (days or hours without orders). */
  muted?: (row: R) => boolean;
  /** Show a totals row from each column's `total`. */
  totals?: boolean;
}

/** Rows in the column head's order; the neutral order when no head is active. */
export function sortRows<R>(spec: TableSpec<R>, sorting: Sorting): R[] {
  if (!sorting.active) return spec.rows;
  const column = spec.columns.find((c) => c.key === sorting.column);
  if (!column) return spec.rows;
  return [...spec.rows].sort((a, b) => {
    const x = column.value(a);
    const y = column.value(b);
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    return sorting.sign * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y)));
  });
}

/** Header, rows and totals as plain cells, for the Excel export. */
export function tableCells<R>(spec: TableSpec<R>, rows: R[], totalLabel: string): Cell[][] {
  const out: Cell[][] = [spec.columns.map((c) => c.label)];
  for (const row of rows) out.push(spec.columns.map((c) => (c.csv ?? c.value)(row)));
  if (spec.totals) out.push(spec.columns.map((c, i) => (i === 0 ? totalLabel : (c.total ?? null))));
  return out;
}

export function ReportTable<R>({
  spec,
  rows,
  sorting,
  totalLabel,
}: {
  spec: TableSpec<R>;
  rows: R[];
  sorting: Sorting;
  totalLabel: string;
}) {
  const align = (c: Column<R>) => (c.numeric ? "text-end" : "text-start");
  return (
    <div className="relative w-full overflow-x-auto print:overflow-visible">
      <table className="w-full text-sm print:text-[8.5pt]">
        <thead>
          <tr className="bg-subtle border-b">
            {spec.columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "text-muted-foreground h-10 px-3 align-middle text-xs font-medium whitespace-nowrap first:ps-5 last:pe-5 print:h-auto print:px-1.5 print:py-1.5 print:first:ps-1.5 print:last:pe-1.5",
                  align(c),
                )}
              >
                {c.sortable === false ? (
                  c.label
                ) : (
                  <SortHeader label={c.label} column={c.key} sorting={sorting} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = spec.rowHref?.(row);
            return (
              <tr
                key={spec.rowKey(row)}
                className={cn(
                  "border-b break-inside-avoid last:border-0",
                  href && "hover:bg-subtle relative",
                  spec.muted?.(row) && "text-muted-foreground",
                )}
              >
                {spec.columns.map((c, i) => {
                  const content = c.cell ? c.cell(row) : (c.value(row) ?? "—");
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 py-2.5 align-middle whitespace-nowrap first:ps-5 last:pe-5 print:px-1.5 print:py-1 print:first:ps-1.5 print:last:pe-1.5",
                        align(c),
                        c.numeric && "figure",
                      )}
                    >
                      {i === 0 && href ? (
                        <Link href={href} className="row-link font-medium">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        {spec.totals ? (
          <tfoot>
            <tr className="bg-subtle border-border-strong border-t-2 font-semibold">
              {spec.columns.map((c, i) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-3 py-3 align-middle whitespace-nowrap first:ps-5 last:pe-5 print:px-1.5 print:py-1.5 print:first:ps-1.5 print:last:pe-1.5",
                    align(c),
                    c.numeric && "figure",
                  )}
                >
                  {i === 0 ? totalLabel : (c.total ?? "")}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
