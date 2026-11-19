import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTournament } from "@/lib/services/tournaments";
import { PageHeader } from "@/components/ui";
import { AmericanoBoard } from "@/components/americano-board";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const { id } = await params;
  const tour = await getTournament(id);
  if (!tour) notFound();
  const { users, ...rest } = tour;
  const plain = { ...rest, users: Object.fromEntries(users) };
  // Tout participant peut saisir les scores / tirer les tours : c'est un jeu entre collègues.
  const canManage = tour.createdBy === user.id || user.isAdmin || tour.players.some((p) => p.id === user.id);
  return (
    <>
      <PageHeader tone="gold" icon="trophy" title={tour.name} back="/americano" eyebrow={t.americano.title} />
      <AmericanoBoard t0={plain} meId={user.id} canManage={canManage} />
    </>
  );
}
