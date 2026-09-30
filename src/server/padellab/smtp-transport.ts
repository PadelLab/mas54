import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

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

let cached: Transporter | null = null;
let cachedKey = "";

export function getSmtpTransporter(): Transporter | null {
  const cfg = readSmtpConfig();
  if (!cfg) return null;
  const key = `${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}`;
  if (cached && cachedKey === key) return cached;
  cached = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: !cfg.secure && cfg.port === 587,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  cachedKey = key;
  return cached;
}
