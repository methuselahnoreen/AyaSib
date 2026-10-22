"use client";

// Feature: ayasib-frontend-redesign (v3)
import { useState } from "react";
import Link from "next/link";
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
      <main>
        {/* Hero card */}
        <section className="hero-card">
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
        </section>

        {/* Search */}
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

        {/* Three tiles */}
        <nav className="tiles" aria-label={t.tabs.label}>
          <Link href="/ask" className="tile">
            <Icon name="chat" size={28} className="tile-icon" />
            <strong>{t.homePage.tileAsk}</strong>
            <span>{t.homePage.tileAskSub}</span>
          </Link>
          <Link href="/services" className="tile">
            <Icon name="doc" size={28} className="tile-icon" />
            <strong>{t.homePage.tileServices}</strong>
            <span>{t.homePage.tileServicesSub}</span>
          </Link>
          <Link href="/services" className="tile">
            <Icon name="checklist" size={28} className="tile-icon" />
            <strong>{t.homePage.tileChecklist}</strong>
            <span>{t.homePage.tileChecklistSub}</span>
          </Link>
        </nav>

        {/* Suggested question */}
        <button type="button" className="suggest" onClick={() => ask(t.homePage.suggestQ)}>
          <Icon name="sparkle" size={26} className="s-icon" />
          <span>
            <span className="s-kicker">{t.homePage.suggestKicker}</span>
            <span className="s-body" style={{ display: "block" }}>
              {t.homePage.suggestQ}
            </span>
          </span>
          <Icon name="external" size={18} className="s-go" />
        </button>

        <FooterNote />
      </main>
    </Shell>
  );
}
