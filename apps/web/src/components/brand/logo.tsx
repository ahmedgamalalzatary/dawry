import { cn } from "@/lib/utils";

/**
 * The Dawry mark: one split-flap tile from a departures board. Three places in
 * line; the lit one is yours ("dawry" = my turn).
 */
export function DawryMark({ className, onBoard = false }: { className?: string; onBoard?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill={onBoard ? "var(--board-raised)" : "var(--board)"} />
      <path d="M0 16h32" stroke={onBoard ? "var(--board)" : "#000"} strokeOpacity={onBoard ? 1 : 0.35} strokeWidth="1.5" />
      <circle cx="9" cy="16" r="2.6" fill="var(--board-muted)" opacity=".45" />
      <circle cx="16" cy="16" r="2.6" fill="var(--board-muted)" opacity=".75" />
      <circle cx="23.5" cy="16" r="3.4" fill="#4cc898" />
    </svg>
  );
}

export function DawryLogo({
  name,
  className,
  onBoard = false,
}: {
  name: string;
  className?: string;
  onBoard?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <DawryMark onBoard={onBoard} />
      <span className="font-heading text-[1.35rem] leading-none font-bold tracking-tight">{name}</span>
    </span>
  );
}
