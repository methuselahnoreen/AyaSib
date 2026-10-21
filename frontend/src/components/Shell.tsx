import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "@/lib/strings";

export function Shell({ title, back = true, children }: { title: string; back?: boolean; children: ReactNode }) {
  return (
    <div className="shell">
      <header className="bar">
        {back && (
          <Link href="/" aria-label={t.back}>
            ← {t.back}
          </Link>
        )}
        <h1>{title}</h1>
      </header>
      {children}
    </div>
  );
}
