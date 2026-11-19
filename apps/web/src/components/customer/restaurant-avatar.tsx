import { cn } from "@/lib/utils";

/** The restaurant's logo, or its first letter on an ink tile. */
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
        className={cn("size-11 shrink-0 rounded-xl object-cover ring-1 ring-black/5", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "bg-ink text-brand flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold dark:bg-[#1d2a45]",
        className,
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}
