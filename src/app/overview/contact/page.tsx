import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactPageContent } from "@/components/contact/contact-page-content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Cobentt — support for issues and queries, product feedback, and industry-level integrations. Email support@cogerphere.com.",
};

export default function OverviewContactPage() {
  return (
    <Suspense>
      <ContactPageContent />
    </Suspense>
  );
}
