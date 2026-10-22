import { t } from "@/lib/strings";

// The AyaSib wordmark logo. Sits in a cream pill so the dark-green art stays legible on the header bar.
export function Logo({ height = 32 }: { height?: number }) {
  return (
    <span className="logo-pill">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt={t.appName} height={height} className="logo-img" />
    </span>
  );
}
