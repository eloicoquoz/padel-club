import Link from "next/link";
import { BrandHeader } from "@/components/brand";
import { ResetForm } from "@/components/auth-forms";
import { getT } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { getResetUser } from "@/lib/services/admin";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { t } = await getT();
  const { token } = await searchParams;
  const target = token ? await getResetUser(token) : null;
  return (
    <>
      <BrandHeader club={t.app.club} big={false} />
      <div className="mt-8 flex flex-col gap-4">
        <h2 className="text-2xl font-black">{t.account.resetTitle}</h2>
        {target && token ? (
          <>
            <p className="text-sm text-muted">{fmt(t.account.resetFor, { name: target.name })}</p>
            <ResetForm token={token} />
          </>
        ) : (
          <>
            <p className="text-[15px] text-muted">{t.account.resetInvalid}</p>
            <Link href="/login" className="btn bg-surface border border-border-2 text-text h-13 text-[15px] mt-4">
              {t.common.back}
            </Link>
          </>
        )}
      </div>
    </>
  );
}
