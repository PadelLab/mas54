import { redirect } from "next/navigation";

type Props = { params: Promise<{ categoryId: string }> };

/** Legacy URL `/coach/activities/:id` → `/coach/activities/categories/:id`. */
export default async function ProfessorCategoriaLegacyRedirectPage({ params }: Props) {
  const { categoryId } = await params;
  redirect(`/coach/activities/categories/${categoryId}`);
}
