import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { ProfileView } from "@/components/profile-view";
import { ProfileForm } from "@/components/profile-form";
import { Eyebrow } from "@/components/ui";
import { PushToggle } from "@/components/push-toggle";
import { PasswordForm } from "@/components/password-form";
import Link from "next/link";

export default async function MyProfilePage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  return (
    <>
      <div className="text-center">
        <Eyebrow>{t.profile.title}</Eyebrow>
      </div>
      <ProfileView p={user} t={t} locale={locale} isMe />
      <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
      <ProfileForm user={user} />
      <PasswordForm />
      {user.isAdmin && (
        <Link href="/admin" className="btn bg-surface border border-border-2 text-muted h-12 text-[15px]">
          {t.admin.open}
        </Link>
      )}
    </>
  );
}
