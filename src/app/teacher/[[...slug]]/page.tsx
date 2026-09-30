import { redirect } from "next/navigation";

/** Compatibility: `/teacher/*` → `/coach/*`. */
export default async function TeacherToCoachRedirect({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const rest = slug?.length ? `/${slug.join("/")}` : "";
  redirect(`/coach${rest || "/home"}`);
}
