import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { listUsers } from "@/lib/services/users";
import { PageHeader } from "@/components/ui";
import { ChallengeForm } from "@/components/forms";

export default async function NewChallengePage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const sp = await searchParams;
  const players = await listUsers();
  const presetTo = (sp.to ?? "").split(",").filter(Boolean).slice(0, 2);
  return (
    <>
      <PageHeader title={t.challenges.new} back="/challenges" />
      <ChallengeForm players={players} meId={user.id} presetTo={presetTo} />
    </>
  );
}
