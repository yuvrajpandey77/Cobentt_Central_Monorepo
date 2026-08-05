import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Navbar } from "@/components/overview/navbar";
import { Footer } from "@/components/layout/footer";

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
    <div className="min-h-screen bg-bg-primary text-text-primary antialiased">
      <Navbar />
      <div className="flex pt-14 lg:pt-16 mx-auto max-w-[1440px] px-6 lg:px-10">
        <SettingsNav />
        <main className="flex-1 overflow-auto min-w-0">
          <div className="mx-auto max-w-3xl py-8">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
