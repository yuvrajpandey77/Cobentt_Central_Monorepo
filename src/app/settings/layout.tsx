import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SettingsNav />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
