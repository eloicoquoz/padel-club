import Link from "next/link";
import { BrandHeader } from "@/components/brand";
import { getT } from "@/lib/i18n/server";

export default async function ForgotPage() {
  const { t } = await getT();
  return (
    <>
      <BrandHeader club={t.app.club} big={false} />
      <div className="mt-8 flex flex-col gap-4">
        <h2 className="text-2xl font-black">{t.account.forgotTitle}</h2>
        <p className="text-[15px] text-muted leading-relaxed">{t.account.forgotText}</p>
        <Link href="/login" className="btn bg-surface border border-border-2 text-text h-13 text-[15px] mt-4">
          {t.common.back}
        </Link>
      </div>
    </>
  );
}
