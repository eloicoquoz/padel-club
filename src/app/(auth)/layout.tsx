import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect("/");
  return (
    <main className="relative mx-auto w-full max-w-md min-h-dvh flex flex-col px-7 pt-16 pb-10 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-36 w-[360px] h-[360px] rounded-full bg-red opacity-[0.18]" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 w-[320px] h-[320px] rounded-full bg-blue opacity-[0.14]" />
      <div className="relative flex-1 flex flex-col">{children}</div>
    </main>
  );
}
