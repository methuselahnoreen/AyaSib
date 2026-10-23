"use client";

// Feature: ayasib-frontend-redesign (v5) — "Kauban nimo si Aya!" hero with step flow.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { FooterNote } from "@/components/FooterNote";
import { t } from "@/lib/strings";

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function ask(question: string) {
    const query = question.trim();
    if (query) router.push(`/ask?q=${encodeURIComponent(query)}`);
  }

  return (
    <Shell title={t.appName}>
      <main className="home">
        {/* Hero panel: heading, Aya + bubble, motto, and the 3-step flow */}
        <section className="hero-card hero">
          <h1 className="display">{t.homePage.heroName}</h1>

          <div className="hero-aya">
            <div className="hero-aya-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="aya-img" src="/aya.svg" alt="" aria-hidden="true" />
              <span className="hero-motto">{t.homePage.mottoReverse}</span>
            </div>
            <p className="aya-speech">{t.homePage.ayaBubble}</p>
          </div>

          {/* Tulo ra ka lakang */}
          <div className="flow-card">
            <strong className="flow-title">{t.homePage.flowHeading}</strong>
            <div className="flow">
              <div className="flow-step">
                <span className="flow-ring"><Icon name="question" size={22} /></span>
                <span>{t.homePage.flow1}</span>
              </div>
              <Icon name="chevron" size={28} className="flow-arrow" />
              <div className="flow-step">
                <span className="flow-ring"><Icon name="bulb" size={22} /></span>
                <span>{t.homePage.flow2}</span>
              </div>
              <Icon name="chevron" size={28} className="flow-arrow" />
              <div className="flow-step">
                <span className="flow-ring"><Icon name="check" size={22} /></span>
                <span>{t.homePage.flow3}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Actions near the bottom nav */}
        <div className="home-actions">
          <form
            className="searchpill"
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
          >
            <Icon name="search" size={22} className="search-icon" />
            <input value={q} maxLength={2000} placeholder={t.homePage.searchPlaceholder} aria-label={t.homePage.searchPlaceholder} onChange={(e) => setQ(e.target.value)} />
            <button className="go" type="submit" disabled={!q.trim()} aria-label={t.homePage.searchButton}>
              <Icon name="chat" size={20} />
            </button>
          </form>

          <h2 className="sec-title">{t.homePage.suggestionsTitle}</h2>
          <div className="suggest-list">
            {t.homePage.suggestions.map((question) => (
              <button key={question} type="button" className="suggest" onClick={() => ask(question)}>
                <Icon name="sparkle" size={24} className="s-icon" />
                <span className="s-body">{question}</span>
                <Icon name="chevron" size={18} className="s-go" />
              </button>
            ))}
          </div>
        </div>

        <FooterNote />
      </main>
    </Shell>
  );
}
