import "server-only";
import type { AbstractIntlMessages } from "next-intl";

import messagesCa from "./ca.json";
import messagesDe from "./de.json";
import messagesEn from "./en.json";
import messagesEs from "./es.json";
import messagesFr from "./fr.json";
import messagesIt from "./it.json";
import messagesJa from "./ja.json";
import messagesKo from "./ko.json";
import messagesNl from "./nl.json";
import messagesPl from "./pl.json";
import messagesPt from "./pt.json";
import messagesRu from "./ru.json";
import messagesSv from "./sv.json";
import messagesTr from "./tr.json";
import messagesZh from "./zh.json";

import type { AppLocale } from "@/lib/app-locale";

/** i18n catalog per locale (JSON in `src/messages`). */
export const sourceMessages = messagesEn;

export const caMessages = messagesCa;
export const deMessages = messagesDe;
export const esMessages = messagesEs;
export const frMessages = messagesFr;
export const itMessages = messagesIt;
export const jaMessages = messagesJa;
export const koMessages = messagesKo;
export const nlMessages = messagesNl;
export const plMessages = messagesPl;
export const ptMessages = messagesPt;
export const ruMessages = messagesRu;
export const svMessages = messagesSv;
export const trMessages = messagesTr;
export const zhMessages = messagesZh;

export type MessagesByLocale = Record<AppLocale, AbstractIntlMessages>;

export const messagesByLocale: MessagesByLocale = {
  en: messagesEn as unknown as AbstractIntlMessages,
  es: messagesEs as unknown as AbstractIntlMessages,
  pt: messagesPt as unknown as AbstractIntlMessages,
  fr: messagesFr as unknown as AbstractIntlMessages,
  it: messagesIt as unknown as AbstractIntlMessages,
  de: messagesDe as unknown as AbstractIntlMessages,
  ru: messagesRu as unknown as AbstractIntlMessages,
  nl: messagesNl as unknown as AbstractIntlMessages,
  pl: messagesPl as unknown as AbstractIntlMessages,
  zh: messagesZh as unknown as AbstractIntlMessages,
  ja: messagesJa as unknown as AbstractIntlMessages,
  ko: messagesKo as unknown as AbstractIntlMessages,
  ca: messagesCa as unknown as AbstractIntlMessages,
  sv: messagesSv as unknown as AbstractIntlMessages,
  tr: messagesTr as unknown as AbstractIntlMessages,
};
