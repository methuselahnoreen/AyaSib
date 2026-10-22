"use client";

// Feature: ayasib-frontend-redesign
// Bottom tab navigation (Home / Services / Ask / Checklist), icon-led, matching the mockups.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { t } from "@/lib/strings";

const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: t.tabs.home, icon: "home", match: (p) => p === "/" },
  { href: "/services", label: t.tabs.services, icon: "grid", match: (p) => p.startsWith("/services") },
  { href: "/ask", label: t.tabs.ask, icon: "chat", match: (p) => p.startsWith("/ask") },
  { href: "/services", label: t.tabs.checklist, icon: "checklist", match: (p) => p.startsWith("/andam") },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label={t.tabs.label}>
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link key={tab.label} href={tab.href} className={`tab ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
            <Icon name={tab.icon} size={24} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
