"use client";

// Feature: ayasib-frontend-redesign
// Bottom tab navigation. Five slots: Sugdanan / Mga Serbisyo / [OCR center FAB] / Pangutana / Pangandam.
// The center OCR button (Basaha) protrudes above the bar with a green camera-scan element.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { t } from "@/lib/strings";

type Tab = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

// Side tabs: two on the left of the center button, two on the right.
const LEFT: Tab[] = [
  { href: "/", label: t.tabs.home, icon: "home", match: (p) => p === "/" },
  { href: "/services", label: t.tabs.services, icon: "grid", match: (p) => p.startsWith("/services") },
];
const RIGHT: Tab[] = [
  { href: "/ask", label: t.tabs.ask, icon: "chat", match: (p) => p.startsWith("/ask") },
  { href: "/services", label: t.tabs.checklist, icon: "checklist", match: (p) => p.startsWith("/andam") },
];

export function TabBar() {
  const pathname = usePathname();
  const ocrActive = pathname.startsWith("/basaha");

  const renderTab = (tab: Tab) => {
    const active = tab.match(pathname);
    return (
      <Link key={tab.label + tab.href} href={tab.href} className={`tab ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
        <Icon name={tab.icon} size={24} />
        <span>{tab.label}</span>
      </Link>
    );
  };

  return (
    <nav className="tabbar" aria-label={t.tabs.label}>
      {LEFT.map(renderTab)}

      {/* Center OCR button — protrudes above the bar */}
      <Link href="/basaha" className={`tab tab-ocr ${ocrActive ? "active" : ""}`} aria-current={ocrActive ? "page" : undefined}>
        <span className="ocr-fab">
          <Icon name="scan" size={28} />
        </span>
        <span>{t.tabs.ocr}</span>
      </Link>

      {RIGHT.map(renderTab)}
    </nav>
  );
}
