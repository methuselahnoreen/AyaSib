"use client";

// Feature: ayasib-andam-na + ayasib-frontend-redesign (v2, mockup-matched)
// Checklist screen. Pure derivation + device-only persistence by stable identity (unchanged logic);
// mockup-matched presentation: progress ring, legend, 3 icon toggles per item, Aya card, Start over.
import { useEffect, useState } from "react";
import { t } from "@/lib/strings";
import type { KbEntry } from "@/lib/types";
import {
  counts,
  deriveItems,
  hasNoRequirements,
  isComplete,
  type ChecklistItem,
  type ItemState,
} from "@/lib/readiness";
import { clearStates, loadStates, saveState } from "@/lib/readinessStore";
import { Notice } from "@/components/Notice";
import { Icon, type IconName } from "@/components/Icon";

const TOGGLES: { value: ItemState; cls: string; icon: IconName; label: string }[] = [
  { value: "HAS", cls: "has", icon: "check", label: t.readinessUi.hasIt },
  { value: "STILL_NEEDS", cls: "need", icon: "box", label: t.readinessUi.stillNeed },
  { value: "NEEDS_TO_CONFIRM", cls: "confirm", icon: "question", label: t.readinessUi.needConfirm },
];

const STATE_TEXT: Record<ItemState, { cls: string; label: string }> = {
  HAS: { cls: "has", label: t.readinessUi.stateHas },
  STILL_NEEDS: { cls: "need", label: t.readinessUi.stateNeed },
  NEEDS_TO_CONFIRM: { cls: "confirm", label: t.readinessUi.stateConfirm },
};

export function ReadinessChecklist({ entry }: { entry: KbEntry }) {
  const [items, setItems] = useState<ChecklistItem[]>(() => deriveItems(entry, {}));

  useEffect(() => {
    setItems(deriveItems(entry, loadStates(entry.id)));
  }, [entry]);

  if (hasNoRequirements(entry)) {
    return <Notice text={t.readiness.noRequirements} />;
  }

  function setState(key: string, state: ItemState) {
    saveState(entry.id, key, state);
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, state } : it)));
  }

  function startOver() {
    if (typeof window !== "undefined" && !window.confirm(t.readinessUi.startOverConfirm)) return;
    clearStates(entry.id);
    setItems(deriveItems(entry, {}));
  }

  const c = counts(items);
  const total = items.length;
  const done = isComplete(items);
  const pct = total > 0 ? Math.round((c.HAS / total) * 100) : 0;
  const heading = done ? t.readinessUi.headingDone : c.HAS > 0 ? t.readinessUi.headingProgress : t.readinessUi.headingStart;
  const encouragement = done ? t.readinessUi.encourageDone : c.HAS > 0 ? t.readinessUi.encourageProgress : t.readinessUi.encourageStart;

  return (
    <>
      <span className="muted-kicker">{t.readinessUi.kicker}</span>
      <h1 className="page-title">{heading}</h1>
      <p className="muted" style={{ margin: "0 0 4px" }}>
        {entry.name_ceb || entry.name_en}
      </p>

      {/* Progress card with ring */}
      <div className="progress-card">
        <div
          className="ring"
          style={{ ["--pct" as string]: pct }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t.readinessUi.progress}
        >
          <span className="ring-hole">{pct}%</span>
        </div>
        <div className="p-text">
          <strong>{t.readinessUi.progressCount.replace("{has}", String(c.HAS)).replace("{total}", String(total))}</strong>
          <span>{encouragement}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="legend" aria-hidden="true">
        <span>
          <Icon name="check" size={16} /> {t.readinessUi.hasIt}
        </span>
        <span>
          <Icon name="box" size={16} /> {t.readinessUi.stillNeed}
        </span>
        <span>
          <Icon name="question" size={16} /> {t.readinessUi.needConfirm}
        </span>
      </div>

      {/* Items */}
      {items.map((item) => {
        const st = STATE_TEXT[item.state];
        return (
          <div className="chk-item" key={item.key}>
            <div className="c-text">
              <strong>{item.text}</strong>
              <span className={`c-state ${st.cls}`}>{st.label}</span>
            </div>
            <div className="toggles" role="radiogroup" aria-label={item.text}>
              {TOGGLES.map((tg) => (
                <button
                  key={tg.value}
                  type="button"
                  role="radio"
                  aria-checked={item.state === tg.value}
                  aria-label={tg.label}
                  title={tg.label}
                  className={`toggle ${tg.cls} ${item.state === tg.value ? "on" : ""}`}
                  onClick={() => setState(item.key, tg.value)}
                >
                  <Icon name={tg.icon} size={20} />
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <p className="muted small" style={{ margin: 0 }}>
        {t.readinessUi.deviceNote}
      </p>

      {done && <Notice text={t.readiness.complete} />}

      {/* Aya encouragement */}
      <div className="aya-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="aya-img" src="/aya.svg" alt="" aria-hidden="true" />
        <div>
          <strong>{t.readinessUi.ayaStrong}</strong>
          <span>{t.readinessUi.ayaLine}</span>
        </div>
      </div>

      <button type="button" className="btn secondary btn-block" onClick={startOver}>
        <Icon name="refresh" size={18} /> {t.readinessUi.startOver}
      </button>
    </>
  );
}
