"use client";

// Feature: ayasib-frontend-redesign
// Bottom tab navigation. Five slots: Basaha / Mga Serbisyo / [Sugdanan center FAB] / Pangutana / Pangandam.
// The center button (Sugdanan/Home) protrudes above the bar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { t } from "@/lib/strings";

type Tab = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

// Side tabs: two on the left of the center button, two on the right.
const LEFT: Tab[] = [
  { href: "/basaha", label: t.tabs.ocr, icon: "scan", match: (p) => p.startsWith("/basaha") },
  { href: "/services", label: t.tabs.services, icon: "grid", match: (p) => p.startsWith("/services") },
];
const RIGHT: Tab[] = [
  { href: "/ask", label: t.tabs.ask, icon: "chat", match: (p) => p.startsWith("/ask") },
  { href: "/checklist", label: t.tabs.checklist, icon: "checklist", match: (p) => p.startsWith("/checklist") || p.includes("/checklist") },
];

export function TabBar() {
  const pathname = usePathname();
  const homeActive = pathname === "/";

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

      {/* Center Home button — protrudes above the bar */}
      <Link href="/" className={`tab tab-ocr ${homeActive ? "active" : ""}`} aria-current={homeActive ? "page" : undefined}>
        <span className="ocr-fab">
          <Icon name="home" size={28} />
        </span>
        <span>{t.tabs.home}</span>
      </Link>

      {RIGHT.map(renderTab)}
    </nav>
  );
}
