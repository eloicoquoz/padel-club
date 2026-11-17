import { BrandHeader } from "@/components/brand";
import { LoginForm } from "@/components/auth-forms";
import { LangSwitch } from "@/components/lang-switch";
import { getT } from "@/lib/i18n/server";

export default async function LoginPage() {
  const { t } = await getT();
  return (
    <>
      <div className="absolute top-0 right-0">
        <LangSwitch compact />
      </div>
      <BrandHeader club={t.app.club} tagline={t.auth.tagline} />
      <div className="mt-10 flex-1 flex flex-col">
        <LoginForm />
      </div>
    </>
  );
}
