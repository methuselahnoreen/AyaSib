"use client";

import { useState } from "react";
import { Notice } from "@/components/Notice";
import { Shell } from "@/components/Shell";
import { errorText, translateText } from "@/lib/client";
import { t } from "@/lib/strings";
import type { Lang, TranslateResponse } from "@/lib/types";

const LANGS: Lang[] = ["en", "fil", "ceb"];

export default function TranslatePage() {
  const [from, setFrom] = useState<Lang>("en");
  const [to, setTo] = useState<Lang>("ceb");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function changeFrom(v: Lang) {
    if (v === to) setTo(from);
    setFrom(v);
  }
  function changeTo(v: Lang) {
    if (v === from) setFrom(to);
    setTo(v);
  }
  function swap() {
    setFrom(to);
    setTo(from);
    if (result) setText(result.translation);
    setResult(null);
  }

  async function run() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      setResult(await translateText(text, from, to));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.translation);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Shell title={t.translate.title}>
      <main>
        <div className="langs">
          <label className="field">
            <span className="small">{t.translate.from}</span>
            <select value={from} onChange={(e) => changeFrom(e.target.value as Lang)}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {t.translate.langs[l]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn secondary" onClick={swap} aria-label={t.translate.swap}>
            ⇄
          </button>
          <label className="field">
            <span className="small">{t.translate.to}</span>
            <select value={to} onChange={(e) => changeTo(e.target.value as Lang)}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {t.translate.langs[l]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <textarea aria-label={t.translate.from} value={text} maxLength={8000} placeholder={t.translate.placeholder} onChange={(e) => setText(e.target.value)} />
        <button className="btn" onClick={run} disabled={loading || !text.trim()}>
          {loading ? t.ask.loading : t.translate.button}
        </button>

        <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <Notice kind="error" text={error} action={{ label: t.errors.retry, onClick: run }} />}
          {result && (
            <article className="card">
              <div className="card-head">{t.translate.result}</div>
              <div className="card-body">
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{result.translation}</p>
                <button className="btn secondary" onClick={copy}>
                  {copied ? t.translate.copied : t.translate.copy}
                </button>
                {result.glossary_terms_used.length > 0 && (
                  <div>
                    <div className="small muted">{t.translate.glossary}</div>
                    {result.glossary_terms_used.map((g) => (
                      <span className="hl" key={g.source}>
                        {g.source} → {g.target}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )}
        </div>
      </main>
    </Shell>
  );
}
