import type { ReactNode } from "react";
import { TabBar } from "@/components/TabBar";

export function Shell({
  title,
  tabs = true,
  children,
}: {
  title: string;
  /** Show the bottom tab bar (the standard app chrome). */
  tabs?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`shell ${tabs ? "has-tabs" : ""}`}>
      {/* No header logo — the app leads with the hero. Title kept for screen readers. */}
      <h1 className="sr-only">{title}</h1>
      {children}
      {tabs && <TabBar />}
    </div>
  );
}
