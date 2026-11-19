import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { ProfileView } from "@/components/profile-view";
import { ProfileForm } from "@/components/profile-form";
import { cookies } from "next/headers";
import { DEFAULT_THEME, THEME_COOKIE, isTheme } from "@/lib/theme";
import { PushToggle } from "@/components/push-toggle";
import { PasswordForm } from "@/components/password-form";
import Link from "next/link";

export default async function MyProfilePage() {
  const user = await requireUser();
  const rawTheme = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(rawTheme) ? rawTheme : DEFAULT_THEME;
  const { t, locale } = await getT();
  return (
    <>
      <ProfileView p={user} t={t} locale={locale} isMe />
      <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
      <ProfileForm user={user} theme={theme} />
      <PasswordForm />
      {user.isAdmin && (
        <Link href="/admin" className="btn bg-surface border border-border-2 text-muted h-12 text-[15px]">
          {t.admin.open}
        </Link>
      )}
    </>
  );
}
