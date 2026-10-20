import Link from "next/link";
import { Shell } from "@/components/Shell";
import { t } from "@/lib/strings";

const features = [
  { href: "/ask", ...t.home.ask },
  { href: "/explain", ...t.home.explain },
  { href: "/translate", ...t.home.translate },
];

export default function Home() {
  return (
    <Shell title={t.appName} back={false}>
      <main>
        <p style={{ margin: 0, fontSize: "1.15rem" }}>{t.tagline}</p>
        {features.map((f) => (
          <Link key={f.href} href={f.href} className="card feature">
            <strong>{f.title}</strong>
            {f.desc}
          </Link>
        ))}
      </main>
    </Shell>
  );
}
