"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

/** A password field with a show/hide button. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} dir="ltr" className={cn("pe-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/60 absolute end-1 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-3"
      >
        {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  );
}
