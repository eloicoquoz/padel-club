import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { SessionForm } from "@/components/forms";

export default async function NewSessionPage() {
  await requireUser();
  const { t } = await getT();
  return (
    <>
      <PageHeader tone="lime" icon="calendar" title={t.sessions.new.title} back="/sessions" />
      <SessionForm defaultLocation={process.env.DEFAULT_LOCATION ?? ""} />
    </>
  );
}
