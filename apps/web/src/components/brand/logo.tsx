import { cn } from "@/lib/utils";

/**
 * The Dawry mark: a saffron queue ticket with its tear-off stub.
 * The dot is "your place in line".
 */
export function DawryMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 26" aria-hidden className={cn("h-6 w-auto", className)}>
      <defs>
        <mask id="dawry-notch">
          <rect width="36" height="26" fill="#fff" />
          <circle cx="0" cy="13" r="4.5" fill="#000" />
          <circle cx="36" cy="13" r="4.5" fill="#000" />
        </mask>
      </defs>
      <rect width="36" height="26" rx="5" fill="var(--brand)" mask="url(#dawry-notch)" />
      <path d="M12 4.5v17" stroke="#16233f" strokeWidth="1.6" strokeDasharray="2.2 2.4" strokeLinecap="round" opacity=".55" />
      <circle cx="23.5" cy="13" r="4.2" fill="#16233f" />
    </svg>
  );
}

export function DawryLogo({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DawryMark />
      <span className="text-xl font-bold tracking-tight">{name}</span>
    </span>
  );
}
