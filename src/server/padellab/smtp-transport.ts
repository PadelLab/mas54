import "server-only";
import nodemailer from "nodemailer";
import type { SendMailOptions, SentMessageInfo, Transporter } from "nodemailer";

function env(name: string): string {
  let v = process.env[name]?.trim() ?? "";
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

export function smtpFrom(): string | undefined {
  const v = env("SMTP_FROM") || env("EMAIL_FROM");
  return v || undefined;
}

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export function readSmtpConfig(): SmtpConfig | null {
  const host = env("SMTP_HOST");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  const from = smtpFrom();
  if (!host || !user || !pass || !from) return null;
  const port = Number(env("SMTP_PORT") || "587");
  const secFlag = env("SMTP_SECURE").toLowerCase();
  const secure = secFlag === "1" || secFlag === "true" || port === 465;
  return { host, port, secure, user, pass, from };
}

export function isSmtpConfigured(): boolean {
  return readSmtpConfig() != null;
}

const TRANSIENT_SMTP =
  /connection closed|econnreset|econnrefused|etimedout|socket hang up|unexpectedly|greeting never received|connection ended|broken pipe/i;

function createTransporter(cfg: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: !cfg.secure && cfg.port === 587,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 25_000,
    pool: false,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendSmtpMailOnce(cfg: SmtpConfig, mail: SendMailOptions): Promise<SentMessageInfo> {
  const transporter = createTransporter(cfg);
  try {
    return await transporter.sendMail({ from: cfg.from, ...mail });
  } finally {
    transporter.close();
  }
}

let sendQueue: Promise<unknown> = Promise.resolve();

/**
 * Fresh SMTP connection per send (Gmail drops idle sockets on Vercel).
 * Retries once on a dropped connection, and serializes sends in this isolate.
 */
export async function sendSmtpMail(mail: SendMailOptions): Promise<SentMessageInfo | null> {
  const cfg = readSmtpConfig();
  if (!cfg) return null;

  const run = sendQueue.then(
    () => sendSmtpMailWithRetry(cfg, mail),
    () => sendSmtpMailWithRetry(cfg, mail),
  );
  sendQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function sendSmtpMailWithRetry(cfg: SmtpConfig, mail: SendMailOptions): Promise<SentMessageInfo> {
  try {
    return await sendSmtpMailOnce(cfg, mail);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    if (!TRANSIENT_SMTP.test(detail)) throw err;
    await sleep(500);
    return await sendSmtpMailOnce(cfg, mail);
  }
}

/** Adapter so existing mailers keep calling `transporter.sendMail`. */
export function getSmtpTransporter(): { sendMail: (mail: SendMailOptions) => Promise<SentMessageInfo> } | null {
  if (!readSmtpConfig()) return null;
  return {
    sendMail: async (mail) => {
      const info = await sendSmtpMail(mail);
      if (!info) throw new Error("SMTP not configured");
      return info;
    },
  };
}
