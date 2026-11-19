import type { ReactNode } from "react";

/** Title + one-line explanation at the top of each owner page. */
export function PageSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
