import { Navbar } from "@/components/overview/navbar";
import { Footer } from "@/components/layout/footer";

export default function OverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overview-wrapper min-h-screen bg-bg-primary text-text-primary antialiased">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}