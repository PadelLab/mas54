import { NewUserCreateView } from "../_components/new-user-create-view";
import { parseNewUserSource } from "../_components/new-user-source";

export default async function AdminNewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string | string[]; origem?: string | string[] }>;
}) {
  const sp = await searchParams;
  const source = parseNewUserSource(sp.source) ?? parseNewUserSource(sp.origem);

  return <NewUserCreateView source={source} />;
}
