"use client";

// Feature: ayasib-frontend-redesign (v4) — full-height layout, bigger type, KB-grounded suggestions.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { FooterNote } from "@/components/FooterNote";
import { kb } from "@/lib/kb";
import { t } from "@/lib/strings";

// Real facts from existing data (never invented): service count + most recent verified date.
const SERVICE_COUNT = kb.length;
const LATEST_VERIFIED = kb
  .map((e) => e.last_verified)
  .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
  .sort()
  .pop();

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
        {/* Hero takes the spare height; its content is vertically centered */}
        <section className="hero-card hero">
          <span className="hero-kicker">{t.homePage.kicker}</span>
          <h1 className="display">{t.homePage.heroHeading}</h1>
          <p className="hero-sub">{t.homePage.heroSupport}</p>

          {/* Aya on the left, speech bubble on the right */}
          <div className="hero-aya">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="aya-img" src="/aya.svg" alt="" aria-hidden="true" />
            <p className="aya-speech">{t.homePage.ayaBubble}</p>
          </div>

          {/* Name story */}
          <div className="name-story">
            <strong>{t.homePage.nameStory}</strong>
            <span>{t.homePage.nameGloss}</span>
          </div>

          {/* Real-data facts (service count + latest verified date) */}
          <div className="hero-stats">
            <span className="stat">
              <Icon name="grid" size={16} /> {t.homePage.statsServices.replace("{n}", String(SERVICE_COUNT))}
            </span>
            {LATEST_VERIFIED && (
              <span className="stat">
                <Icon name="shield" size={16} /> {t.homePage.statsVerified.replace("{date}", LATEST_VERIFIED)}
              </span>
            )}
          </div>
        </section>

        {/* Actions sit near the bottom nav, within thumb reach */}
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

          {/* KB-answerable example questions (stacked) */}
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
