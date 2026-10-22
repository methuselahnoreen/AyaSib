// Feature: ayasib-frontend-redesign (v2, mockup-matched)
import { Shell } from "@/components/Shell";
import { ServiceSearch } from "@/components/ServiceSearch";
import { FooterNote } from "@/components/FooterNote";
import { t } from "@/lib/strings";

export default function ServicesPage() {
  return (
    <Shell title={t.services.title}>
      <main>
        <span className="muted-kicker">{t.services.kicker}</span>
        <h1 className="page-title">{t.services.title}</h1>
        <p className="muted" style={{ margin: "0 0 4px" }}>
          {t.services.subtitle}
        </p>
        <ServiceSearch />
        <FooterNote />
      </main>
    </Shell>
  );
}
