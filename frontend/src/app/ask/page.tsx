"use client";
 
import { useEffect, useRef, useState } from "react";
import { AnswerCard } from "@/components/AnswerCard";
import { HeroArt } from "@/components/HeroArt";
import { Notice } from "@/components/Notice";
import { Shell } from "@/components/Shell";
import { askQuestion, errorText } from "@/lib/client";
import { t } from "@/lib/strings";
import type { AskResponse } from "@/lib/types";
 
type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; result?: AskResponse; error?: string; question?: string };
 
export default function AskPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  // The previous user question, sent as context so short follow-ups like
  // "pila ang bayad niini?" can be resolved to the service just discussed.
  const lastQuestion = useRef("");
 
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, loading]);
 
  async function send(raw: string, addUser = true) {
    const q = raw.trim();
    if (!q || loading) return;
    if (addUser) setMsgs((m) => [...m, { id: nextId.current++, role: "user", text: q }]);
    setInput("");
    setLoading(true);
    const context = lastQuestion.current;
    try {
      const result = await askQuestion(q, context);
      setMsgs((m) => [...m, { id: nextId.current++, role: "assistant", result }]);
      // Only keep a question as context if it actually resolved to a service, so an
      // unanswered or off-topic question does not mislead the next follow-up.
      lastQuestion.current = result.confident ? q : "";
    } catch (e) {
      setMsgs((m) => [...m, { id: nextId.current++, role: "assistant", error: errorText(e), question: q }]);
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <Shell title={t.ask.title}>
      <main>
        <div className="chat" aria-live="polite">
          {msgs.length === 0 && (
            <>
              <HeroArt className="empty-art" />
              <div className="bubble bot">{t.ask.welcome}</div>
              <div className="chips">
                {t.ask.examples.map((ex) => (
                  <button key={ex} className="chip" onClick={() => send(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
            </>
          )}
          {msgs.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="bubble user">
                {m.text}
              </div>
            ) : (
              <div key={m.id} className="assistant">
                {m.error ? (
                  <Notice kind="error" text={m.error} action={m.question ? { label: t.errors.retry, onClick: () => send(m.question!, false) } : undefined} />
                ) : m.result?.confident ? (
                  <AnswerCard result={m.result} />
                ) : (
                  <Notice text={m.result?.message ?? t.notSure} />
                )}
              </div>
            ),
          )}
          {loading && (
            <div className="bubble bot typing" role="status">
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {t.ask.loading}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>
      <form
        className="inputbar"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="inputwrap">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h16v11H9l-5 4V5z" />
          </svg>
          <input className="input" aria-label={t.ask.placeholder} placeholder={t.ask.placeholder} value={input} maxLength={2000} onChange={(e) => setInput(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={loading || !input.trim()}>
          {t.ask.send}
        </button>
      </form>
    </Shell>
  );
}
 