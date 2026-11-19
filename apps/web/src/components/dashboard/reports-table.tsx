import type { RestaurantReport } from "@dawry/shared";
import { BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Average of a per-day value, weighted by how many orders went out that day. */
function weighted(days: RestaurantReport["days"], key: "avgPrepMinutes" | "avgDelayMinutes") {
  let sum = 0;
  let weight = 0;
  for (const d of days) {
    const value = d[key];
    if (value === null) continue;
    sum += value * Math.max(1, d.delivered);
    weight += Math.max(1, d.delivered);
  }
  return weight === 0 ? null : Math.round(sum / weight);
}

export async function ReportsTable({ report }: { report: RestaurantReport }) {
  const t = await getTranslations("reports");
  if (report.days.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
        <BarChart3 aria-hidden className="size-9 opacity-50" />
        <p>{t("empty")}</p>
      </div>
    );
  }

  const total = report.days.reduce((n, d) => n + d.orders, 0);
  const delivered = report.days.reduce((n, d) => n + d.delivered, 0);
  const prep = weighted(report.days, "avgPrepMinutes");
  const delay = weighted(report.days, "avgDelayMinutes");
  const busiest = Math.max(...report.days.map((d) => d.orders), 1);

  // dir="ltr" keeps the minus sign of early (negative) delays in front in RTL.
  const minutes = (n: number | null) => (n === null ? "—" : <span dir="ltr">{n}</span>);

  const tiles = [
    { label: t("totalOrders"), value: total },
    { label: t("deliveredRate"), value: total ? `${Math.round((delivered / total) * 100)}%` : "—" },
    { label: t("avgPrep"), value: minutes(prep) },
    { label: t("avgDelay"), value: minutes(delay), tone: delay !== null && delay > 0 ? "text-chili" : "" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-card flex flex-col gap-1 rounded-2xl border p-4">
            <dt className="text-muted-foreground text-sm">{tile.label}</dt>
            <dd className={cn("text-3xl font-bold tabular-nums", tile.tone)}>{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div className="bg-card overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="ps-4">{t("day")}</TableHead>
              <TableHead className="w-2/5">{t("orders")}</TableHead>
              <TableHead>{t("delivered")}</TableHead>
              <TableHead>{t("cancelled")}</TableHead>
              <TableHead>{t("avgPrep")}</TableHead>
              <TableHead className="pe-4">{t("avgDelay")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.days.map((d) => (
              <TableRow key={d.day}>
                <TableCell className="ps-4 font-medium tabular-nums" dir="ltr">
                  {d.day}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <span className="w-7 font-semibold tabular-nums">{d.orders}</span>
                    <span aria-hidden className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <span
                        className="bg-brand block h-full rounded-full"
                        style={{ width: `${(d.orders / busiest) * 100}%` }}
                      />
                    </span>
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">{d.delivered}</TableCell>
                <TableCell className={cn("tabular-nums", d.cancelled > 0 && "text-destructive")}>
                  {d.cancelled}
                </TableCell>
                <TableCell className="tabular-nums">{minutes(d.avgPrepMinutes)}</TableCell>
                <TableCell
                  className={cn(
                    "pe-4 tabular-nums",
                    d.avgDelayMinutes !== null && d.avgDelayMinutes > 0 && "text-chili font-semibold",
                  )}
                >
                  {minutes(d.avgDelayMinutes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
