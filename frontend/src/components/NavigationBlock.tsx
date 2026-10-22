// Feature: ayasib-andam-na
// Verified navigation block: next step (when present) and links to officially related services.
// Renders nothing when both are absent. Invents nothing — consumes resolveNavigation only.
import Link from "next/link";
import { t } from "@/lib/strings";
import type { KbEntry } from "@/lib/types";
import { resolveNavigation } from "@/lib/navigation";

export function NavigationBlock({ entry, kb }: { entry: KbEntry; kb: KbEntry[] }) {
  const nav = resolveNavigation(entry, kb);
  if (!nav.nextStep && nav.related.length === 0) return null;

  return (
    <section className="card" aria-label={t.navigation.nextStep}>
      <div className="card-body">
        {nav.nextStep && (
          <div>
            <strong>{t.navigation.nextStep}</strong>
            <p style={{ margin: "4px 0 0" }}>{nav.nextStep}</p>
          </div>
        )}
        {nav.related.length > 0 && (
          <div>
            <strong>{t.navigation.related}</strong>
            <ul className="list" style={{ marginTop: 8 }}>
              {nav.related.map((link) => (
                <li key={link.id}>
                  <Link href={`/andam/${link.id}`}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
