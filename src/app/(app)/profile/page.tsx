import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { ProfileView } from "@/components/profile-view";
import { ProfileForm } from "@/components/profile-form";
import { Eyebrow } from "@/components/ui";

export default async function MyProfilePage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  return (
    <>
      <div className="text-center">
        <Eyebrow>{t.profile.title}</Eyebrow>
      </div>
      <ProfileView p={user} t={t} locale={locale} isMe />
      <ProfileForm user={user} />
    </>
  );
}
