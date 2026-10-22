// Feature: ayasib-andam-na
// Freshness + information-status display. Thin wrapper over Notice. Mounted only on the readiness
// view; the Ask path keeps its own refusal/not-confident behavior and never mounts this.
import { t } from "@/lib/strings";
import type { KbEntry } from "@/lib/types";
import { evaluate, informationStatus } from "@/lib/freshness";
import { Notice } from "@/components/Notice";

export function FreshnessNotice({ entry }: { entry: KbEntry }) {
  const status = informationStatus(entry);
  const fresh = evaluate(entry.last_verified);

  if (status === "unavailable") {
    // Distinct notice: never shows a date, never implies freshness.
    return <Notice kind="error" text={`${t.freshness.unavailable} ${t.freshness.clarifier}`} />;
  }

  // A valid, non-future date exists for verified/needs_review classifications.
  const dateLine = fresh.kind !== "unavailable" ? `${t.freshness.verifiedOn}: ${fresh.verified}` : "";
  const label =
    status === "verified"
      ? t.freshness.statusVerified
      : status === "needs_review"
        ? t.freshness.statusNeedsReview
        : t.freshness.statusUnconfirmed;

  if (status === "unconfirmed") {
    return <Notice kind="error" text={`${label}. ${t.freshness.clarifier}`} />;
  }

  if (status === "needs_review") {
    return (
      <>
        {dateLine && (
          <p className="small muted" style={{ margin: 0 }}>
            {dateLine} · {label}
          </p>
        )}
        <Notice kind="error" text={`${t.freshness.stale} ${t.freshness.clarifier}`} />
      </>
    );
  }

  // verified
  return (
    <div className="source" role="status">
      <div>
        {dateLine} · {label}
      </div>
      <div className="small muted">{t.freshness.clarifier}</div>
    </div>
  );
}
