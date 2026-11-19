import type { RestaurantReport } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function ReportsTable({ report }: { report: RestaurantReport }) {
  const t = await getTranslations("reports");
  if (report.days.length === 0) return <p className="text-muted-foreground">{t("empty")}</p>;

  // dir="ltr" keeps the minus sign of early (negative) delays in front in RTL.
  const dash = (n: number | null) => (n === null ? "—" : <span dir="ltr">{n}</span>);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("day")}</TableHead>
          <TableHead>{t("orders")}</TableHead>
          <TableHead>{t("delivered")}</TableHead>
          <TableHead>{t("cancelled")}</TableHead>
          <TableHead>{t("avgPrep")}</TableHead>
          <TableHead>{t("avgDelay")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.days.map((d) => (
          <TableRow key={d.day}>
            <TableCell dir="ltr">{d.day}</TableCell>
            <TableCell>{d.orders}</TableCell>
            <TableCell>{d.delivered}</TableCell>
            <TableCell>{d.cancelled}</TableCell>
            <TableCell>{dash(d.avgPrepMinutes)}</TableCell>
            <TableCell>{dash(d.avgDelayMinutes)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
