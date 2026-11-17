import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt, formatDate, formatTime } from "@/lib/i18n";
import { listUsers } from "@/lib/services/users";
import { getSession } from "@/lib/services/sessions";
import { getChallenge } from "@/lib/services/challenges";
import { MatchForm } from "@/components/match-form";
import { PageHeader } from "@/components/ui";

export default async function NewMatchPage({ searchParams }: { searchParams: Promise<{ sessionId?: string; challengeId?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const sp = await searchParams;
  const players = await listUsers();
  let sessionLabel: string | null = null;
  let preset: { a1?: string; a2?: string; b1?: string; b2?: string } | undefined;
  if (sp.sessionId) {
    const s = await getSession(sp.sessionId);
    if (s) sessionLabel = fmt(t.match.sessionOf, { date: `${formatDate(s.startsAt, locale)} ${formatTime(s.startsAt, locale)}` });
  }
  if (sp.challengeId) {
    const c = await getChallenge(sp.challengeId);
    if (c) {
      const iAmChallenger = c.from.some((p) => p.id === user.id);
      const mine = iAmChallenger ? c.from : c.to;
      const other = iAmChallenger ? c.to : c.from;
      preset = { a1: mine[0]?.id, a2: mine[1]?.id, b1: other[0]?.id, b2: other[1]?.id };
    }
  }
  return (
    <>
      <PageHeader title={t.match.newTitle} back="/" />
      <MatchForm players={players} meId={user.id} sessionId={sp.sessionId ?? null} challengeId={sp.challengeId ?? null} preset={preset} sessionLabel={sessionLabel} />
    </>
  );
}
