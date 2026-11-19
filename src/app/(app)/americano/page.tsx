import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n";
import { listTournaments } from "@/lib/services/tournaments";
import { Empty, Icon, PageHeader, Pill } from "@/components/ui";

export default async function AmericanoListPage() {
  await requireUser();
  const { t, locale } = await getT();
  const list = await listTournaments(20);
  return (
    <>
      <PageHeader
        tone="gold"
        icon="shuffle"
        title={t.americano.title}
        back="/sessions"
        right={
          <Link href="/americano/new" className="btn btn-sm bg-[#111214] text-white">
            <Icon name="plus" size={16} />
            {t.americano.newTitle}
          </Link>
        }
      />
      <p className="text-sm text-muted -mt-2">{t.americano.howItWorks}</p>
      {list.length === 0 && <Empty>{t.americano.none}</Empty>}
      {list.map((x) => (
        <Link key={x.id} href={`/americano/${x.id}`} className="card flex items-center gap-3">
          <Icon name="trophy" size={22} className={x.status === "finished" ? "text-muted" : "text-gold"} />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-extrabold truncate">{x.name}</div>
            <div className="text-xs text-muted">{formatDate(x.createdAt, locale)}</div>
          </div>
          <Pill tone={x.status === "running" ? "red" : x.status === "finished" ? "muted" : "amber"}>
            {x.status === "running" ? t.americano.running : x.status === "finished" ? t.americano.finished : t.americano.draft}
          </Pill>
        </Link>
      ))}
    </>
  );
}
