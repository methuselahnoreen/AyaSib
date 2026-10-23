// Feature: ayasib-frontend-redesign
// Small inline SVG icon set (line style) matching the mockups. currentColor-based so icons inherit
// the surrounding text color. Decorative by default (aria-hidden); pass a title for meaningful icons.
import type { ReactNode } from "react";

export type IconName =
  | "home"
  | "grid"
  | "chat"
  | "checklist"
  | "search"
  | "globe"
  | "doc"
  | "pin"
  | "building"
  | "money"
  | "clock"
  | "question"
  | "bulb"
  | "check"
  | "info"
  | "link"
  | "external"
  | "sparkle"
  | "shield"
  | "baby"
  | "id"
  | "heart"
  | "store"
  | "refresh"
  | "box"
  | "scan"
  | "chevron";

const PATHS: Record<IconName, ReactNode> = {
  home: <path d="M4 11l8-7 8 7M6 10v9h12v-9" />,
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  chat: <path d="M5 5h14v10H9l-4 4V5z" />,
  checklist: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 5.5l1.2 1.2L7.5 4M4 11.5l1.2 1.2L7.5 10M4 17.5l1.2 1.2L7.5 16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 2.5 2.5 13 0 16M12 4c-2.5 2.5-2.5 13 0 16" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </>
  ),
  building: (
    <>
      <path d="M4 20h16M6 20V7l6-3 6 3v13" />
      <path d="M10 11h0M14 11h0M10 15h0M14 15h0" />
    </>
  ),
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 015 .3c0 1.7-2.5 2-2.5 3.7M12 17h0" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 00-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0012 3z" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h0" />
    </>
  ),
  link: <path d="M9 15l6-6M8 13l-2 2a3 3 0 004 4l2-2M16 11l2-2a3 3 0 00-4-4l-2 2" />,
  external: (
    <>
      <path d="M14 5h5v5" />
      <path d="M19 5l-8 8M18 14v5H5V6h5" />
    </>
  ),
  sparkle: <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6zM18 15l.8 2 2 .8-2 .8L18 21l-.8-2-2-.8 2-.8z" />,
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  baby: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 10h0M15 10h0M9 14c1 1.3 5 1.3 6 0" />
    </>
  ),
  id: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M14 10h4M14 13h4M6 16c.8-1.5 4.2-1.5 5 0" />
    </>
  ),
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" />,
  store: (
    <>
      <path d="M4 9l1-4h14l1 4M5 9v11h14V9M4 9h16" />
      <path d="M9 9a3 3 0 006 0" />
    </>
  ),
  refresh: <path d="M4 12a8 8 0 018-8c3 0 5.5 1.7 6.8 4M20 4v4h-4M20 12a8 8 0 01-8 8c-3 0-5.5-1.7-6.8-4M4 20v-4h4" />,
  box: (
    <>
      <path d="M4 8l8-4 8 4v8l-8 4-8-4z" />
      <path d="M4 8l8 4 8-4M12 12v8" />
    </>
  ),
  // Scan / OCR frame: four corner brackets with a lens circle (matches the camera-scan icon).
  scan: (
    <>
      <path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  // Forward chevron (in-app navigation; not an external link).
  chevron: <path d="M9 6l6 6-6 6" />,
};

export function Icon({ name, size = 24, title, className }: { name: IconName; size?: number; title?: string; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
