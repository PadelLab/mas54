import { redirect } from "next/navigation";

type Props = { params: Promise<{ categoryId: string }> };

/** Legacy URL for a new activity. */
export default async function ProfessorNovaAtividadeLegacyRedirectPage({ params }: Props) {
  const { categoryId } = await params;
  redirect(`/coach/activities/categories/${categoryId}/new-activity`);
}
