import type { Locale } from "@dawry/shared";
import type { Messages } from "../../translation/ar";

// Typed translation keys: t("app.nmae") fails typecheck.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
