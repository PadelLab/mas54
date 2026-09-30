const base = process.env.PREVIEW_URL ?? "http://localhost:3000";
const to = process.argv[2] ? `?to=${encodeURIComponent(process.argv[2])}` : "";
const res = await fetch(`${base}/api/dev/preview-auth-mail${to}`);
const body = await res.json().catch(() => ({}));
console.log(res.status, body);
if (!res.ok) process.exit(1);
