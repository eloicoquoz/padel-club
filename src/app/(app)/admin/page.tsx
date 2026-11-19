import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { listUsersAdmin, recentMatchesAdmin } from "@/lib/services/admin";
import { formatSets } from "@/lib/elo";
import { PageHeader } from "@/components/ui";
import { AdminPanel } from "@/components/admin-panel";

export default async function AdminPage() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  const { t } = await getT();
  const [users, matches] = await Promise.all([listUsersAdmin(), recentMatchesAdmin(30)]);
  return (
    <>
      <PageHeader tone="ink" icon="settings" title={t.admin.title} back="/profile" />
      <AdminPanel
        users={users}
        matches={matches.map((m) => ({ id: m.id, playedAt: m.playedAt, score: formatSets(m.sets), winner: m.winner, names: m.names }))}
        meId={user.id}
      />
    </>
  );
}
