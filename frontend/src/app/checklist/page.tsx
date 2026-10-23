"use client";

// Feature: ayasib-frontend-redesign
// Checklist landing (Pangandam tab). Always opens with Aya asking which document the user is
// working on, plus a type-ahead picker. Choosing a service opens its checklist (/andam/[id]/checklist).
import { Shell } from "@/components/Shell";
import { ChecklistPicker } from "@/components/ChecklistPicker";
import { FooterNote } from "@/components/FooterNote";
import { t } from "@/lib/strings";

export default function ChecklistLandingPage() {
  return (
    <Shell title={t.checklistLanding.title}>
      <main>
        <span className="muted-kicker">{t.checklistLanding.kicker}</span>
        <h1 className="page-title">{t.checklistLanding.title}</h1>
        <p className="muted" style={{ margin: "0 0 4px" }}>
          {t.checklistLanding.subtitle}
        </p>
        <ChecklistPicker />
        <FooterNote />
      </main>
    </Shell>
  );
}
