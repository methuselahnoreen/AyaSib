// Feature: ayasib-answer-provenance
// "Why trust this answer?" — a transparency block built ONLY from existing KB fields and the
// existing freshness logic. Invents nothing: no fabricated sources, dates, or confidence scores,
// and it never claims live verification. When the verification date is missing/invalid it says so.
import { Icon } from "@/components/Icon";
import { type InformationStatus } from "@/lib/freshness";
import { provenanceView } from "@/lib/provenance";
import { t } from "@/lib/strings";
import type { KbEntry, Source } from "@/lib/types";

const STATUS_LABEL: Record<InformationStatus, string> = {
  verified: t.freshness.statusVerified,
  needs_review: t.freshness.statusNeedsReview,
  unconfirmed: t.freshness.statusUnconfirmed,
  unavailable: t.freshness.statusUnconfirmed,
};
const STATUS_CLASS: Record<InformationStatus, string> = {
  verified: "verified",
  needs_review: "review",
  unconfirmed: "unconfirmed",
  unavailable: "unconfirmed",
};

/**
 * `entry` is the resolved KB record for the answer (or null if it couldn't be matched).
 * `source` is the answer's source descriptor (title/url/last_verified) from the API response.
 * We prefer the entry's own fields; the source is the fallback for title/url/date display.
 */
export function AnswerProvenance({ entry, source }: { entry: KbEntry | null; source: Source | undefined }) {
  const { status, dateValid, date } = provenanceView(entry, source);
  const serviceName = entry ? (entry.name_ceb || entry.name_en) : source?.title;
  const url = entry?.source_url || source?.url || "";

  return (
    <section className="provenance" aria-label={t.provenance.title}>
      <div className="prov-head">
        <Icon name="shield" size={18} />
        <strong>{t.provenance.title}</strong>
      </div>

      <p className="prov-basis small">{t.provenance.basis}</p>

      <dl className="prov-list">
        {serviceName && (
          <div>
            <dt>{t.provenance.service}</dt>
            <dd>{serviceName}</dd>
          </div>
        )}
        {url && (
          <div>
            <dt>{t.provenance.source}</dt>
            <dd>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {t.provenance.openSource} <Icon name="external" size={14} />
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt>{t.provenance.status}</dt>
          <dd>
            <span className={`status-chip ${STATUS_CLASS[status]}`}>
              <Icon name={status === "verified" ? "check" : status === "needs_review" ? "clock" : "question"} size={14} />
              {STATUS_LABEL[status]}
            </span>
          </dd>
        </div>
        <div>
          <dt>{t.provenance.verifiedOn}</dt>
          <dd>{dateValid ? date : <span className="muted">{t.provenance.noDate}</span>}</dd>
        </div>
      </dl>

      <p className="prov-note small muted">{dateValid ? t.provenance.notGuarantee : t.provenance.noDate}</p>
      <p className="prov-note small muted">{t.provenance.aiNote}</p>
    </section>
  );
}
