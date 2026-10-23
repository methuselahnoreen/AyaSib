// Feature: ayasib-frontend-redesign (v2, mockup-matched)
// Read-only service detail (mockup 2): status chip, freshness notice, icon-labeled sections,
// source, and a button to the checklist. Every value comes from the KB; missing values show an
// honest "not yet confirmed" line — never fabricated.
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { informationStatus } from "@/lib/freshness";
import { t } from "@/lib/strings";
import type { KbEntry } from "@/lib/types";

const STATUS_META: Record<string, { cls: string; label: string }> = {
  verified: { cls: "verified", label: t.freshness.statusVerified },
  needs_review: { cls: "review", label: t.freshness.statusNeedsReview },
  unconfirmed: { cls: "unconfirmed", label: t.freshness.statusUnconfirmed },
  unavailable: { cls: "unconfirmed", label: t.freshness.statusUnconfirmed },
};

function Row({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="ans-row">
      <Icon name={icon} size={24} className="r-icon" />
      <div>
        <strong>{title}</strong>
        <p className="r-body">{body}</p>
      </div>
    </div>
  );
}

export function ServiceDetail({ entry }: { entry: KbEntry }) {
  const status = informationStatus(entry);
  const meta = STATUS_META[status];
  const needsConfirm = status !== "verified";

  const reqList = (entry.requirements_ceb?.length ? entry.requirements_ceb : entry.requirements) ?? [];
  const reqBody = reqList.length ? reqList.join(" · ") : t.answer.confirmNotice;
  // The summary row shows the curated Cebuano summary; fall back to the name only if absent.
  const summary = (entry.summary_ceb ?? "").trim() || entry.name_ceb || entry.name_en;
  // Prefer curated Cebuano for the fact rows, falling back to the English KB fields.
  const office = (entry.office_ceb ?? "").trim() || entry.office;
  const fee = (entry.fee_ceb ?? "").trim() || entry.fee;
  const processingTime = (entry.processing_time_ceb ?? "").trim() || entry.processing_time;

  return (
    <>
      <div className={`status-chip ${meta.cls}`}>
        <Icon name="info" size={16} />
        {meta.label}
      </div>

      {needsConfirm && (
        <div className="notice" role="status">
          <Icon name="info" size={20} className="icon" />
          <div>{t.answer.confirmNotice}</div>
        </div>
      )}

      <div className="ans-card">
        <Row icon="doc" title={t.answer.summary} body={summary} />
        <Row icon="pin" title={t.answer.requirements} body={reqBody} />
        <Row icon="building" title={t.answer.office} body={office || t.answer.confirmNotice} />
        <Row icon="money" title={t.answer.fee} body={fee || t.answer.unavailableValue} />
        <Row icon="clock" title={t.answer.time} body={processingTime || t.answer.unavailableTime} />
      </div>

      <div className="ans-card">
        <div className="source-row">
          <a href={entry.source_url} target="_blank" rel="noopener noreferrer">
            <Icon name="link" size={18} /> {t.answer.source} <Icon name="external" size={16} />
          </a>
          <span className="muted small">{t.answer.sourceNote}</span>
        </div>
      </div>

      <Link href={`/andam/${entry.id}/checklist`} className="btn btn-block">
        <Icon name="checklist" size={20} /> {t.answer.openChecklist}
      </Link>
    </>
  );
}
