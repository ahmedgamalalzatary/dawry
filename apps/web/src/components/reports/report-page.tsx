"use client";

import type { ReportData } from "@dawry/shared";
import { ReportView } from "./report-view";

/** Binds each scope's detail links on the client (functions can't cross from a server page). */
export function ReportPage({ data, scope, subject }: { data: ReportData; scope: "restaurant" | "platform"; subject: string }) {
  return (
    <ReportView
      data={data}
      scope={scope}
      subject={subject}
      links={
        scope === "restaurant"
          ? { order: (id) => `/dashboard/orders/${id}`, person: (id) => `/dashboard/staff/${id}` }
          : { restaurant: (id) => `/admin/restaurants/${id}` }
      }
    />
  );
}
