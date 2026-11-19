import { cn } from "@/lib/utils";

/** The restaurant's logo, or its first letter on a board tile. */
export function RestaurantAvatar({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl: string | null;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- restaurant logos are external URLs
      <img
        src={logoUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("size-10 shrink-0 rounded-lg bg-white object-cover ring-1 ring-black/5", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "bg-board text-board-foreground font-heading flex size-10 shrink-0 items-center justify-center rounded-lg text-base font-semibold",
        className,
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}
