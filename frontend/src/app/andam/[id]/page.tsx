"use client";

// Feature: ayasib-frontend-redesign (v2, mockup-matched)
// Service detail view (mockup 2). Read-only over the KB; links to the checklist.
import Link from "next/link";
import { useParams } from "next/navigation";
import { kb } from "@/lib/kb";
import { t } from "@/lib/strings";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { ServiceDetail } from "@/components/ServiceDetail";
import { FooterNote } from "@/components/FooterNote";
import { serviceTitle } from "@/lib/servicesDirectory";

export default function AndamPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const entry = kb.find((e) => e.id === id);

  if (!entry) {
    return (
      <Shell title={t.readiness.title}>
        <main>
          <Link href="/services" className="crumb">
            <Icon name="home" size={16} /> {t.services.title}
          </Link>
          <Notice text={t.notSure} />
          <FooterNote />
        </main>
      </Shell>
    );
  }

  return (
    <Shell title={serviceTitle(entry)}>
      <main>
        <Link href="/services" className="crumb">
          <Icon name="external" size={16} /> {t.nav.services}
        </Link>
        <h1 className="page-title">{serviceTitle(entry)}</h1>
        <ServiceDetail entry={entry} />
        <FooterNote />
      </main>
    </Shell>
  );
}
