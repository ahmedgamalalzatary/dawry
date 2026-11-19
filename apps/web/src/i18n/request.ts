import { DEFAULT_TIME_ZONE } from "@dawry/shared";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import ar from "../../translation/ar";
import en from "../../translation/en";
import { LOCALE_COOKIE, resolveLocale } from "./config";

const messages = { ar, en };

export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, messages: messages[locale], timeZone: process.env.APP_TIME_ZONE ?? DEFAULT_TIME_ZONE };
});
