import { requireUser } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <main className="mx-auto w-full max-w-md px-5 pt-14 pb-32 flex flex-col gap-4">{children}</main>
      <BottomNav />
    </>
  );
}
