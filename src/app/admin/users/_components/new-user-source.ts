export type NewUserSource = "coaches" | "administrators";

export function parseNewUserSource(v: string | string[] | undefined): NewUserSource | undefined {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw === "coaches" || raw === "teachers") return "coaches";
  if (raw === "administrators") return raw;
  return undefined;
}
