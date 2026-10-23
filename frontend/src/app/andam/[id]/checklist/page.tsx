"use client";

// Feature: ayasib-frontend-redesign (v2, mockup-matched)
// Checklist screen (mockup 3) for one service.
import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { kb } from "@/lib/kb";
import { t } from "@/lib/strings";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { ReadinessChecklist } from "@/components/ReadinessChecklist";
import { FooterNote } from "@/components/FooterNote";
import { serviceTitle } from "@/lib/servicesDirectory";
import { setLastService } from "@/lib/readinessStore";

export default function ChecklistPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const entry = kb.find((e) => e.id === id);

  // Remember this as the last-opened checklist so the Pangandam tab can return here.
  useEffect(() => {
    if (entry) setLastService(entry.id);
  }, [entry]);

  if (!entry) {
    return (
      <Shell title={t.readiness.title}>
        <main>
          <Notice text={t.notSure} />
          <FooterNote />
        </main>
      </Shell>
    );
  }

  return (
    <Shell title={serviceTitle(entry)}>
      <main>
        <Link href={`/andam/${entry.id}`} className="crumb">
          <Icon name="external" size={16} /> {serviceTitle(entry)}
        </Link>
        <ReadinessChecklist entry={entry} />
        <FooterNote />
      </main>
    </Shell>
  );
}
