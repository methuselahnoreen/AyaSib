import type { ReactNode } from "react";
import { TabBar } from "@/components/TabBar";
import { Logo } from "@/components/Logo";

export function Shell({
  title,
  tabs = true,
  header = false,
  children,
}: {
  title: string;
  /** Show the bottom tab bar (the standard app chrome). */
  tabs?: boolean;
  /** Show the top logo header bar. */
  header?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`shell ${tabs ? "has-tabs" : ""}`}>
      <h1 className="sr-only">{title}</h1>
      {header && (
        <header className="app-header">
          <Logo height={28} />
        </header>
      )}
      {children}
      {tabs && <TabBar />}
    </div>
  );
}
