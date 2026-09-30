import type { AbstractIntlMessages } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { sourceMessages } from "@/messages/source";

/**
 * SSR/build: English catalog. On the client, `IntlAppProvider` applies the active locale (static files).
 */
export default getRequestConfig(async () => ({
  locale: "en",
  messages: sourceMessages as AbstractIntlMessages,
}));
