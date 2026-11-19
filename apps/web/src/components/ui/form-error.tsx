import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** A form's error message: announced, with what went wrong in plain words. */
export function FormError({ children, className }: { children: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        "bg-destructive-soft text-destructive flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
        className,
      )}
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
