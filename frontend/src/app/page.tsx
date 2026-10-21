import Link from "next/link";
import type { ReactNode } from "react";
import { HeroArt } from "@/components/HeroArt";
import { Shell } from "@/components/Shell";
 
interface Feature {
  href: string;
  title: string;
  text: string;
  icon: ReactNode;
}
 
const features: Feature[] = [
  {
    href: "/ask",
    title: "Pangutana",
    text: "Pangutana bahin sa permit, clearance, ug uban pa.",
    icon: <path d="M4 5h16v11H9l-5 4V5z" />,
  },
  {
    href: "/explain",
    title: "Ipasabot ang dokumento",
    text: "I-paste ang sulat o porma ug ipasabot sa Bisaya.",
    icon: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
  },
  {
    href: "/translate",
    title: "Hubad",
    text: "Hubara ang teksto tali sa English, Filipino, ug Bisaya.",
    icon: (
      <>
        <path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M12 5c0 3-3 7-7 9" />
        <path d="M13 20l4-9 4 9M14.5 17h5" />
      </>
    ),
  },
];
 
export default function Home() {
  return (
    <Shell title="AyaSib" back={false}>
      <main>
        <section className="hero">
          <HeroArt />
          <p>Tabang sa pagsabot sa mga serbisyo sa gobyerno, sa Bisaya.</p>
        </section>
 
        <nav className="features">
          {features.map((f) => (
            <Link key={f.href} href={f.href} className="card feature">
              <span className="badge" aria-hidden="true">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {f.icon}
                </svg>
              </span>
              <span>
                <strong>{f.title}</strong>
                <span className="desc">{f.text}</span>
              </span>
            </Link>
          ))}
        </nav>
      </main>
    </Shell>
  );
}
 