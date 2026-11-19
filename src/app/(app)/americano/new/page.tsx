import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { listUsers } from "@/lib/services/users";
import { PageHeader } from "@/components/ui";
import { TournamentForm } from "@/components/forms";

export default async function NewTournamentPage() {
  const user = await requireUser();
  const { t } = await getT();
  const players = await listUsers();
  return (
    <>
      <PageHeader tone="gold" icon="shuffle" title={t.americano.newTitle} back="/americano" />
      <TournamentForm players={players} meId={user.id} />
    </>
  );
}
