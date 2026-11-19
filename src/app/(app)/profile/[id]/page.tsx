import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { publicColumns } from "@/lib/services/users";
import { ProfileView } from "@/components/profile-view";

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { t, locale } = await getT();
  const { id } = await params;
  if (id === me.id) redirect("/profile");
  const db = await getDb();
  const [p] = await db.select(publicColumns).from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!p) notFound();
  return (
    <>
      <ProfileView p={p} t={t} locale={locale} isMe={false} back="/ranking" />
    </>
  );
}
