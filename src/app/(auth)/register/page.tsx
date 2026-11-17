import { BrandHeader } from "@/components/brand";
import { RegisterForm } from "@/components/auth-forms";
import { LangSwitch } from "@/components/lang-switch";
import { getT } from "@/lib/i18n/server";

export default async function RegisterPage() {
  const { t } = await getT();
  return (
    <>
      <div className="absolute top-0 right-0">
        <LangSwitch compact />
      </div>
      <BrandHeader club={t.app.club} big={false} />
      <div className="mt-8 flex-1 flex flex-col">
        <RegisterForm />
      </div>
    </>
  );
}
